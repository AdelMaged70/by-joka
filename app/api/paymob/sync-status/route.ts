import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables missing')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    // 1. Fetch recent orders in 'canceled' status that are waiting for payment (including total_price)
    const { data: unpaidOrders, error: fetchErr } = await supabase
      .from('orders')
      .select('id, notes, total_price, created_at')
      .ilike('notes', '%بانتظار الدفع%')
      .order('created_at', { ascending: false })
      .limit(20)

    if (fetchErr || !unpaidOrders || unpaidOrders.length === 0) {
      return NextResponse.json({ success: true, updatedCount: 0 })
    }

    const paymobSecretKey = process.env.PAYMOB_SECRET_KEY
    const paymobApiKey = process.env.PAYMOB_API_KEY
    let authToken = ''

    // Get Auth Token if needed for legacy API check
    if (paymobApiKey) {
      try {
        const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: paymobApiKey })
        })
        if (authRes.ok) {
          const authData = await authRes.json()
          authToken = authData.token
        }
      } catch (err) {
        console.warn('Paymob auth for sync status failed:', err)
      }
    }

    let updatedCount = 0

    for (const order of unpaidOrders) {
      const notes = order.notes || ''
      const expectedAmountCents = Math.round(Number(order.total_price) * 100)

      // Extract transaction ID if present: [رمز المعاملة: 123456]
      const txnMatch = notes.match(/\[رمز المعاملة:\s*(\d+)\]/)
      const merchantIdMatch = notes.match(/\[merchant_id:\s*([^\]]+)\]/)

      const paymobTxnId = txnMatch ? txnMatch[1] : null
      const merchantOrderId = merchantIdMatch ? merchantIdMatch[1] : null

      let isSuccess = false
      let confirmedTxnId = paymobTxnId

      // Method A: Check by transaction ID if available
      if (paymobTxnId) {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (paymobSecretKey) {
            headers['Authorization'] = `Token ${paymobSecretKey}`
          } else if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`
          }

          const txnRes = await fetch(`https://accept.paymob.com/api/acceptance/transactions/${paymobTxnId}`, {
            headers
          })

          if (txnRes.ok) {
            const txnData = await txnRes.json()
            if (txnData.success === true || txnData.txn_response_code === 'APPROVED') {
              const paidCents = Number(txnData.amount_cents)
              if (!isNaN(paidCents) && paidCents === expectedAmountCents) {
                isSuccess = true
              } else {
                console.warn(`Sync check amount mismatch for txn ${paymobTxnId}: expected ${expectedAmountCents}, got ${paidCents}`)
              }
            }
          }
        } catch (e) {
          console.warn(`Sync check for txn ${paymobTxnId} failed:`, e)
        }
      }

      // Method B: If not succeeded yet, try Paymob transactions search by merchant_order_id
      if (!isSuccess && merchantOrderId && (paymobSecretKey || authToken)) {
        try {
          const searchUrl = `https://accept.paymob.com/api/ecommerce/orders/transaction_inquiry`
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          let bodyObj: any = { merchant_order_id: merchantOrderId }
          
          if (authToken) {
            bodyObj.auth_token = authToken
          } else if (paymobSecretKey) {
            headers['Authorization'] = `Token ${paymobSecretKey}`
          }

          const inquiryRes = await fetch(searchUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyObj)
          })

          if (inquiryRes.ok) {
            const inquiryData = await inquiryRes.json()
            if (inquiryData.success === true || inquiryData.status === 'SUCCESS' || inquiryData.is_success === true) {
              const paidCents = Number(inquiryData.amount_cents)
              if (isNaN(paidCents) || paidCents === expectedAmountCents) {
                isSuccess = true
                confirmedTxnId = inquiryData.id || confirmedTxnId
              } else {
                console.warn(`Sync inquiry amount mismatch for merchant ${merchantOrderId}: expected ${expectedAmountCents}, got ${paidCents}`)
              }
            }
          }
        } catch (e) {
          console.warn(`Inquiry check for merchant ${merchantOrderId} failed:`, e)
        }
      }

      // If payment is confirmed successful, update the order in Supabase!
      if (isSuccess) {
        let updatedNotes = notes.replace(
          /\[الدفع: (.+?) - بانتظار الدفع\]/,
          `[الدفع: $1 - تم الدفع بنجاح]${confirmedTxnId ? ` (رمز المعاملة: ${confirmedTxnId})` : ''}`
        )
        if (!updatedNotes.includes('تم الدفع بنجاح')) {
          updatedNotes = `[الدفع: تم الدفع بنجاح] ${updatedNotes}`
        }

        const { error: updateErr } = await supabase
          .from('orders')
          .update({
            status: 'pending',
            notes: updatedNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)

        if (!updateErr) {
          updatedCount++
          console.log(`Sync status: Order ${order.id} updated to pending (Paid successfully)`)
        }
      }
    }

    return NextResponse.json({ success: true, updatedCount })

  } catch (error: any) {
    console.error('Sync status exception:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
