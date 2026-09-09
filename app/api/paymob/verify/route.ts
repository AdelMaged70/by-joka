import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables are missing')
  }
  return createClient(url, key, {
    auth: { persistSession: false }
  })
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const queryHmac = searchParams.get('hmac')

    if (!queryHmac) {
      console.warn('Paymob Verify Warning: Missing HMAC signature')
      return NextResponse.redirect(new URL('/payment-failed?error=missing_hmac', req.nextUrl.origin))
    }

    // 1. Re-calculate and verify HMAC for transaction response callback
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET
    if (!hmacSecret) {
      console.error('Paymob Verify Critical: PAYMOB_HMAC_SECRET not configured')
      return NextResponse.redirect(new URL('/payment-failed?error=unconfigured_hmac', req.nextUrl.origin))
    }

    const keysForHmac = [
      'amount_cents',
      'created_at',
      'currency',
      'error_occured',
      'has_parent_transaction',
      'id',
      'integration_id',
      'is_3d_secure',
      'is_auth',
      'is_capture',
      'is_refunded',
      'is_standalone_payment',
      'is_voided',
      'order',
      'owner',
      'pending',
      'source_data.pan',
      'source_data.sub_type',
      'source_data.type',
      'success'
    ]

    let concatenated = ''
    keysForHmac.forEach(key => {
      // In GET parameters, keys like source_data.pan represent literal flat query param names
      const val = searchParams.get(key)
      if (val !== undefined && val !== null) {
        concatenated += val
      }
    })

    const calculatedHmac = crypto
      .createHmac('sha512', hmacSecret)
      .update(concatenated)
      .digest('hex')

    const calculatedBuf = Buffer.from(calculatedHmac)
    const queryBuf = Buffer.from(queryHmac)

    const isVerified = (calculatedBuf.length === queryBuf.length) && crypto.timingSafeEqual(calculatedBuf, queryBuf)

    if (!isVerified) {
      console.error('Paymob Verify Critical: HMAC signature matching failed keys')
      return NextResponse.redirect(new URL('/payment-failed?error=invalid_hmac', req.nextUrl.origin))
    }

    // 2. Identify the Supabase order
    const paymobTransactionId = searchParams.get('id')
    const paymobOrderId = searchParams.get('order')
    const successStr = searchParams.get('success') // 'true' or 'false'
    const pendingStr = searchParams.get('pending') // 'true' or 'false'
    let dbOrderId = searchParams.get('merchant_order_id') || searchParams.get('special_reference')

    const supabase = getSupabaseAdmin()

    // merchant_order_id may include a suffix (e.g. "uuid-SUFFIX"). Extract the base UUID.
    if (dbOrderId && dbOrderId.includes('-') && dbOrderId.split('-').length > 5) {
      // UUID has 5 parts. If there are more parts, last segment is our unique suffix.
      const parts = dbOrderId.split('-')
      // Remove the last suffix segment and reconstruct UUID (UUID is always 5 hyphen-segments)
      dbOrderId = parts.slice(0, 5).join('-')
    }

    // Fallback: If merchant_order_id is missing, search the order in db by notes field
    if (!dbOrderId && paymobOrderId) {
      const { data: matchedOrders, error: findError } = await supabase
        .from('orders')
        .select('id')
        .ilike('notes', `%[رمز المعاملة: ${paymobOrderId}]%`)
        .limit(1)

      if (!findError && matchedOrders && matchedOrders.length > 0) {
        dbOrderId = matchedOrders[0].id
      }
    }

    if (!dbOrderId) {
      console.error('Paymob Verify Error: Mapped order not identified in redirect', { paymobOrderId })
      return NextResponse.redirect(new URL('/payment-failed?error=not_found', req.nextUrl.origin))
    }

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('total_price, status, notes')
      .eq('id', dbOrderId)
      .single()

    if (orderErr || !order) {
      console.error(`Paymob Verify Error: Order ${dbOrderId} not found in database`, orderErr)
      return NextResponse.redirect(new URL(`/payment-failed?orderId=${dbOrderId}&error=database`, req.nextUrl.origin))
    }

    const isSuccess = successStr === 'true'
    const isPending = pendingStr === 'true'

    if (isSuccess && !isPending) {
      // Security Check: Verify amount if amount_cents parameter is present
      const amountCentsParam = searchParams.get('amount_cents')
      if (amountCentsParam) {
        const receivedAmountCents = Number(amountCentsParam)
        const expectedAmountCents = Math.round(Number(order.total_price) * 100)

        if (isNaN(receivedAmountCents) || receivedAmountCents !== expectedAmountCents) {
          console.error(
            `Paymob Verify Security Alert: Amount mismatch for order ${dbOrderId}. Expected ${expectedAmountCents} cents, got ${receivedAmountCents} cents`
          )

          let notesText = order.notes || ''
          notesText = `[تحذير أمني: عدم تطابق المبلغ المدفوع] (المطلوب: ${order.total_price} ج.م - المدفوع: ${receivedAmountCents / 100} ج.م)\n${notesText}`

          await supabase
            .from('orders')
            .update({
              notes: notesText,
              updated_at: new Date().toISOString()
            })
            .eq('id', dbOrderId)

          return NextResponse.redirect(new URL(`/payment-failed?orderId=${dbOrderId}&error=amount_mismatch`, req.nextUrl.origin))
        }
      }

      // Payment verify success! Update Supabase status to pending so cashier can see it
      let notesText = order.notes || ''
      // Replace ANY payment pending marker (wallet or card)
      if (notesText.includes('- بانتظار الدفع]')) {
        notesText = notesText.replace(
          /\[الدفع: (.+?) - بانتظار الدفع\]/,
          `[الدفع: $1 - تم الدفع بنجاح] (رمز المعاملة: ${paymobTransactionId})`
        )
      } else if (!notesText.includes('تم الدفع بنجاح')) {
        notesText = `[الدفع: تم الدفع بنجاح] (رمز المعاملة: ${paymobTransactionId})\n${notesText}`
      }

      await supabase
        .from('orders')
        .update({
          status: 'pending',
          notes: notesText,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbOrderId)

      console.log(`Paymob Verify Success: Order ${dbOrderId} marked paid, redirecting to payment-success page`)
      return NextResponse.redirect(new URL(`/payment-success?orderId=${dbOrderId}`, req.nextUrl.origin))
    } else {
      // Payment failed
      let notesText = order.notes || ''
      if (notesText.includes('- بانتظار الدفع]')) {
        notesText = notesText.replace(
          /\[الدفع: (.+?) - بانتظار الدفع\]/,
          `[الدفع: $1 - فشلت عملية الدفع] (رمز المحاولة: ${paymobTransactionId})`
        )
      } else if (!notesText.includes('فشلت عملية الدفع')) {
        notesText = `[الدفع: فشلت عملية الدفع] (رمز المحاولة: ${paymobTransactionId})\n${notesText}`
      }

      await supabase
        .from('orders')
        .update({
          notes: notesText,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbOrderId)

      console.log(`Paymob Verify Failed: Order ${dbOrderId} redirected to failed page`)
      return NextResponse.redirect(new URL(`/payment-failed?orderId=${dbOrderId}`, req.nextUrl.origin))
    }

  } catch (error: any) {
    console.error('Paymob Verify exception:', error)
    return NextResponse.redirect(new URL(`/payment-failed?error=${encodeURIComponent(error.message || 'unknown')}`, req.nextUrl.origin))
  }
}
