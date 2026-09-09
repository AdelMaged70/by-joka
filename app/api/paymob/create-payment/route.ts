import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
  let createdOrderId: string | null = null
  const supabase = getSupabaseAdmin()

  try {
    const body = await req.json()
    const {
      branchId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      totalPrice,
      items,
      notes,
      walletNumber,
      paymentType // 'wallet' | 'card'
    } = body

    const isCard = paymentType === 'card'
    const isWallet = !isCard

    // 1. Basic validation
    if (!branchId || !customerName || !customerPhone || !customerAddress || !totalPrice || !items) {
      return NextResponse.json({ error: 'من فضلك املأ جميع الحقول المطلوبة' }, { status: 400 })
    }

    if (isWallet && !walletNumber) {
      return NextResponse.json({ error: 'من فضلك أدخل رقم المحفظة الإلكترونية' }, { status: 400 })
    }

    // Validate wallet number only for wallet payments
    if (isWallet) {
      const egPhoneRegex = /^01[0125][0-9]{8}$/
      if (!egPhoneRegex.test(walletNumber)) {
        return NextResponse.json({ error: 'رقم المحفظة الإلكترونية غير صحيح، يجب أن يكون رقم مصري مكون من 11 رقم ويبدأ بـ 01' }, { status: 400 })
      }
    }

    // 2. Security Fix: Fetch prices directly from database (products table)
    const productIds = (items || [])
      .map((item: any) => String(item.productId || item.id || item.product_id))
      .filter((id: string) => id && id !== 'unknown' && id !== 'null' && id !== 'undefined')

    const dbProductMap = new Map<string, { price: number; name_ar?: string; name?: string }>()

    if (productIds.length > 0) {
      const { data: dbProducts, error: prodErr } = await supabase
        .from('products')
        .select('id, price, name_ar, name')
        .in('id', productIds)

      if (prodErr) {
        console.error('Error fetching products prices from DB:', prodErr)
      } else if (dbProducts) {
        dbProducts.forEach((p: any) => {
          dbProductMap.set(String(p.id), {
            price: Number(p.price) || 0,
            name_ar: p.name_ar,
            name: p.name
          })
        })
      }
    }

    let calculatedTotalPrice = 0
    const validatedItems = items.map((item: any) => {
      const rawId = item.productId || item.id || item.product_id
      const finalProductId = (rawId && rawId !== 'null' && rawId !== 'undefined') ? String(rawId) : 'unknown'
      const dbProduct = dbProductMap.get(finalProductId)
      // Always prioritize price from DB. Fallback to client price only if product is not found in products table
      const unitPrice = dbProduct ? dbProduct.price : (Number(item.price) || 0)
      const quantity = Number(item.quantity) || 1
      calculatedTotalPrice += unitPrice * quantity

      return {
        productId: finalProductId,
        productName: dbProduct?.name_ar || dbProduct?.name || item.productName || item.name || item.nameAr || 'منتج',
        quantity,
        price: unitPrice
      }
    })

    const finalTotalPrice = calculatedTotalPrice > 0 ? calculatedTotalPrice : Number(totalPrice)

    // Insert order in Supabase with status 'canceled' (defaulting unpaid state)
    const paymentLabel = isCard ? 'بطاقة ائتمانية (Visa/Master)' : 'محفظة إلكترونية'
    const paymentNote = isWallet
      ? `[الدفع: محفظة إلكترونية - بانتظار الدفع] (رقم المحفظة: ${walletNumber})`
      : `[الدفع: ${paymentLabel} - بانتظار الدفع]`
    const walletNote = `${paymentNote}\n${notes || ''}`
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        branch_id: branchId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || '',
        customer_address: customerAddress,
        total_price: finalTotalPrice,
        status: 'canceled',
        notes: walletNote
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Database order insert error:', orderError)
      throw new Error('تعذر تسجيل الطلب في قاعدة البيانات')
    }

    createdOrderId = order.id

    // Insert order items using DB-verified price and product details
    const orderItems = validatedItems.map((item: any) => {
      return {
        order_id: createdOrderId,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price
      }
    })

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Database order items insert error:', itemsError)
      throw new Error('تعذر تسجيل منتجات الطلب في قاعدة البيانات: ' + itemsError.message)
    }

    // 3. Initiate Paymob Integration using Intention API (or fallback to legacy 3-step auth API)
    const paymobSecretKey = process.env.PAYMOB_SECRET_KEY
    const paymobPublicKey = process.env.PAYMOB_PUBLIC_KEY
    const paymobApiKey = process.env.PAYMOB_API_KEY
    const paymobWalletIntId = process.env.PAYMOB_WALLET_INTEGRATION_ID
    const paymobCardIntId = process.env.PAYMOB_CARD_INTEGRATION_ID
    const paymobCardIframeId = process.env.PAYMOB_CARD_IFRAME_ID

    if (!paymobApiKey && !paymobSecretKey) {
      throw new Error('مفاتيح بوابة الدفع الإلكتروني (PAYMOB_API_KEY / PAYMOB_SECRET_KEY) غير مهيأة في .env.local')
    }

    if (isWallet && !paymobWalletIntId) {
      throw new Error('معرف تكامل المحفظة الإلكترونية (PAYMOB_WALLET_INTEGRATION_ID) غير مهيأ في .env.local')
    }
    if (isCard && !paymobCardIntId) {
      throw new Error('معرف تكامل بطاقة الدفع (PAYMOB_CARD_INTEGRATION_ID) غير مهيأ في .env.local')
    }

    const activeIntegrationId = isCard
      ? parseInt(paymobCardIntId!, 10)
      : parseInt(paymobWalletIntId!, 10)

    // Generate unique merchant order ID to avoid Paymob duplicate rejection
    const uniqueSuffix = Date.now().toString(36).toUpperCase()
    const merchantOrderId = `${createdOrderId}-${uniqueSuffix}`

    const reqOrigin = req.headers.get('origin') || req.nextUrl.origin
    const notificationUrl = `${reqOrigin}/api/paymob/webhook`
    const redirectionUrl = `${reqOrigin}/api/paymob/verify`

    // Option A: Try Intention API if Secret Key is provided
    if (paymobSecretKey) {
      try {
        console.log('Initiating Paymob Intention API request...')
        const names = customerName.trim().split(' ')
        const firstName = names[0] || 'عميل'
        const lastName = names.slice(1).join(' ') || 'جديد'

        const formattedPhone = customerPhone.startsWith('+20')
          ? customerPhone
          : customerPhone.startsWith('20')
          ? `+${customerPhone}`
          : `+2${customerPhone}`

        const intentionPayload = {
          amount: Math.round(finalTotalPrice * 100), // amount in cents/piastres
          currency: 'EGP',
          payment_methods: [activeIntegrationId],
          items: validatedItems.map((item: any) => ({
            name: item.productName,
            amount: Math.round(item.price * 100),
            description: item.productName,
            quantity: item.quantity
          })),
          billing_data: {
            apartment: 'NA',
            email: customerEmail || 'no-email@customer.com',
            floor: 'NA',
            first_name: firstName,
            street: customerAddress,
            building: 'NA',
            phone_number: formattedPhone,
            shipping_method: 'PKG',
            postal_code: 'NA',
            city: 'Cairo',
            country: 'EGY',
            last_name: lastName,
            state: 'Cairo'
          },
          special_reference: merchantOrderId,
          notification_url: notificationUrl,
          redirection_url: redirectionUrl
        }

        const intentionRes = await fetch('https://accept.paymob.com/v1/intention/', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${paymobSecretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(intentionPayload)
        })

        if (intentionRes.ok) {
          const intentionData = await intentionRes.json()
          console.log('Paymob Intention API success:', intentionData.id)

          const clientSecret = intentionData.client_secret || intentionData.cs
          const paymentKey = intentionData.payment_keys?.[0]?.key
          let redirectUrl = intentionData.checkout_url

          if (!redirectUrl && clientSecret && paymobPublicKey) {
            redirectUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${paymobPublicKey}&clientSecret=${clientSecret}`
          } else if (!redirectUrl && paymentKey && paymobCardIframeId && isCard) {
            redirectUrl = `https://accept.paymob.com/api/acceptance/iframes/${paymobCardIframeId}?payment_token=${paymentKey}`
          }

          if (redirectUrl) {
            // Update order notes with merchant_id for tracking
            await supabase
              .from('orders')
              .update({
                notes: `${walletNote} [merchant_id: ${merchantOrderId}]`
              })
              .eq('id', createdOrderId)

            return NextResponse.json({
              success: true,
              orderId: createdOrderId,
              redirectUrl: redirectUrl
            })
          }
        } else {
          const errTxt = await intentionRes.text()
          console.warn('Paymob Intention API returned non-OK status:', intentionRes.status, errTxt)
        }
      } catch (intentionErr: any) {
        console.warn('Paymob Intention API exception, falling back to legacy flow:', intentionErr.message)
      }
    }

    // Option B: Legacy 3-Step Auth API Flow (Fallback)
    console.log('Executing Paymob Legacy Auth API flow...')

    // Step A: Authentication Token
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: paymobApiKey })
    })

    if (!authRes.ok) {
      const errTxt = await authRes.text()
      console.error('Paymob auth fail:', errTxt)
      throw new Error('فشل تسجيل الدخول في بوابة Paymob')
    }

    const { token: authToken } = await authRes.json()

    // Step B: Order Registration
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: Math.round(finalTotalPrice * 100),
        currency: 'EGP',
        merchant_order_id: merchantOrderId,
        items: validatedItems.map((item: any) => ({
          name: item.productName,
          amount_cents: Math.round(item.price * 100),
          description: item.productName,
          quantity: item.quantity
        }))
      })
    })

    if (!orderRes.ok) {
      const errTxt = await orderRes.text()
      console.error('Paymob order reg fail:', errTxt)
      throw new Error('فشل تسجيل الطلب في بوابة Paymob')
    }

    const { id: paymobOrderId } = await orderRes.json()

    // Update Supabase order notes with Paymob order ID and merchant_order_id for verification mapping
    await supabase
      .from('orders')
      .update({
        notes: `${walletNote} [رمز المعاملة: ${paymobOrderId}] [merchant_id: ${merchantOrderId}]`
      })
      .eq('id', createdOrderId)

    // Step C: Payment Key Request
    const names = customerName.trim().split(' ')
    const firstName = names[0] || 'عميل'
    const lastName = names.slice(1).join(' ') || 'جديد'

    const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: Math.round(finalTotalPrice * 100),
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: {
          apartment: 'NA',
          email: customerEmail || 'no-email@customer.com',
          floor: 'NA',
          first_name: firstName,
          street: customerAddress,
          building: 'NA',
          phone_number: customerPhone.startsWith('+20') ? customerPhone : (customerPhone.startsWith('20') ? `+${customerPhone}` : `+2${customerPhone}`),
          shipping_method: 'PKG',
          postal_code: 'NA',
          city: 'Cairo',
          country: 'EGY',
          last_name: lastName,
          state: 'Cairo'
        },
        currency: 'EGP',
        integration_id: isCard
          ? parseInt(paymobCardIntId!, 10)
          : parseInt(paymobWalletIntId!, 10)
      })
    })

    if (!keyRes.ok) {
      const errTxt = await keyRes.text()
      console.error('Paymob payment key request fail:', errTxt)
      throw new Error('فشل إنشاء رمز مفتاح الدفع من Paymob')
    }

    const { token: paymentToken } = await keyRes.json()

    if (isCard) {
      // Step D (Card): Return iframe URL for hosted payment page
      const paymobIframeId = process.env.PAYMOB_CARD_IFRAME_ID
      const iframeUrl = paymobIframeId
        ? `https://accept.paymob.com/api/acceptance/iframes/${paymobIframeId}?payment_token=${paymentToken}`
        : `https://accept.paymob.com/api/acceptance/iframes/0?payment_token=${paymentToken}`

      return NextResponse.json({
        success: true,
        redirectUrl: iframeUrl,
        orderId: createdOrderId
      })
    }

    // Step D (Wallet): Initiate Wallet Payment Request
    const payRes = await fetch('https://accept.paymob.com/api/acceptance/payments/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: {
          identifier: walletNumber,
          subtype: 'WALLET'
        },
        payment_token: paymentToken
      })
    })

    if (!payRes.ok) {
      const errTxt = await payRes.text()
      console.error('Paymob wallet pay fail:', errTxt)
      throw new Error('فشل معالجة محفظة الدفع الإلكتروني من Paymob')
    }

    const payData = await payRes.json()
    const redirectUrl = payData.redirect_url || payData.iframe_redirection_url

    if (!redirectUrl) {
      throw new Error('لم يتم إرجاع رابط التحويل للمحفظة الإلكترونية من Paymob')
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
      orderId: createdOrderId
    })

  } catch (error: any) {
    console.error('Paymob payment creation error:', error)
    
    // Clean up created order if something failed before paying
    if (createdOrderId) {
      try {
        await supabase.from('orders').delete().eq('id', createdOrderId)
      } catch (dbErr) {
        console.error('Cleanup order error:', dbErr)
      }
    }

    return NextResponse.json({
      error: error.message || 'حدث خطأ غير متوقع أثناء معالجة الدفع'
    }, { status: 500 })
  }
}
