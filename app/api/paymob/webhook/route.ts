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

export async function POST(req: NextRequest) {
  try {
    const queryHmac = req.nextUrl.searchParams.get('hmac')
    if (!queryHmac) {
      console.warn('Paymob Webhook Warning: Missing HMAC in query params')
      return NextResponse.json({ error: 'Missing security signature' }, { status: 401 })
    }

    const payload = await req.json()
    const obj = payload.obj

    if (!obj) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // 1. Calculate and verify HMAC signature
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET
    if (!hmacSecret) {
      console.error('Paymob Webhook Critical: PAYMOB_HMAC_SECRET not configured')
      return NextResponse.json({ error: 'Server authentication unconfigured' }, { status: 500 })
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
      let val
      if (key === 'order') {
        val = obj.order ? obj.order.id : ''
      } else if (key.startsWith('source_data.')) {
        const subKey = key.split('.')[1]
        val = obj.source_data ? obj.source_data[subKey] : ''
      } else {
        val = obj[key]
      }

      if (val === undefined || val === null) {
        concatenated += ''
      } else {
        concatenated += val.toString()
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
      console.error('Paymob Webhook Critical: HMAC signature matching failed')
      return NextResponse.json({ error: 'Unauthorized: signature verification failed' }, { status: 401 })
    }

    // 2. Process transaction success state
    const isSuccess = obj.success === true || obj.success === 'true'
    const isPending = obj.pending === true || obj.pending === 'true'
    
    // Extract merchant order ID from Intention API (special_reference) or legacy payload (order.merchant_order_id)
    let rawMerchantId = obj.special_reference || (obj.order ? obj.order.merchant_order_id : null) || obj.merchant_order_id
    let dbOrderId = rawMerchantId

    if (dbOrderId && dbOrderId.includes('-') && dbOrderId.split('-').length > 5) {
      const parts = dbOrderId.split('-')
      dbOrderId = parts.slice(0, 5).join('-')
    }

    if (!dbOrderId && obj.order && obj.order.id) {
      // Fallback lookup by transaction note if merchant_id missing
      const supabaseAdmin = getSupabaseAdmin()
      const { data: matched } = await supabaseAdmin
        .from('orders')
        .select('id')
        .ilike('notes', `%[رمز المعاملة: ${obj.order.id}]%`)
        .limit(1)
      if (matched && matched.length > 0) {
        dbOrderId = matched[0].id
      }
    }

    if (!dbOrderId) {
      console.warn('Paymob Webhook Warning: Missing merchant_order_id / special_reference', { objId: obj.id })
      return NextResponse.json({ success: true, message: 'No merchant order mapped' })
    }

    const supabase = getSupabaseAdmin()

    // Retrieve the order details (including total_price for security amount verification)
    const { data: order, error: selectError } = await supabase
      .from('orders')
      .select('total_price, notes, status')
      .eq('id', dbOrderId)
      .single()

    if (selectError || !order) {
      console.error(`Paymob Webhook Error: Order ${dbOrderId} not found in database`, selectError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let notesText = order.notes || ''

    if (isSuccess && !isPending) {
      // 2. Security Check: Verify paid amount matches expected order total price
      const receivedAmountCents = Number(obj.amount_cents)
      const expectedAmountCents = Math.round(Number(order.total_price) * 100)

      if (isNaN(receivedAmountCents) || receivedAmountCents !== expectedAmountCents) {
        console.error(
          `Paymob Webhook Security Alert: Amount mismatch for order ${dbOrderId}. Expected ${expectedAmountCents} cents (${order.total_price} EGP), got ${receivedAmountCents} cents (${receivedAmountCents / 100} EGP)`
        )

        const warningNote = `[تحذير أمني: المبلغ المدفوع (${(receivedAmountCents / 100).toFixed(2)} ج.م) لا يطابق إجمالي الطلب (${order.total_price} ج.م)] (رمز المعاملة: ${obj.id})\n${notesText}`
        await supabase
          .from('orders')
          .update({
            notes: warningNote,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbOrderId)

        return NextResponse.json(
          { error: 'Security alert: Paid amount does not match required order total' },
          { status: 400 }
        )
      }

      // Payment Succeeded and Amount Verified!
      if (notesText.includes('- بانتظار الدفع]')) {
        notesText = notesText.replace(
          /\[الدفع: (.+?) - بانتظار الدفع\]/,
          `[الدفع: $1 - تم الدفع بنجاح] (رمز المعاملة: ${obj.id})`
        )
      } else if (!notesText.includes('تم الدفع بنجاح')) {
        notesText = `[الدفع: تم الدفع بنجاح] (رمز المعاملة: ${obj.id})\n${notesText}`
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'pending',
          notes: notesText,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbOrderId)

      if (updateError) {
        console.error('Paymob Webhook Error details update fail:', updateError)
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      console.log(`Paymob Webhook Success: Order ${dbOrderId} marked as paid successfully after amount verification (${order.total_price} EGP)`)

    } else if (!isPending) {
      // Payment Failed (and not pending)
      if (notesText.includes('- بانتظار الدفع]')) {
        notesText = notesText.replace(
          /\[الدفع: (.+?) - بانتظار الدفع\]/,
          `[الدفع: $1 - فشلت عملية الدفع] (رمز المحاولة: ${obj.id})`
        )
      } else if (!notesText.includes('فشلت عملية الدفع')) {
        notesText = `[الدفع: فشلت عملية الدفع] (رمز المحاولة: ${obj.id})\n${notesText}`
      }

      await supabase
        .from('orders')
        .update({
          notes: notesText,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbOrderId)

      console.log(`Paymob Webhook Fail: Transaction failed for order ${dbOrderId}`)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Paymob Webhook exception:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
