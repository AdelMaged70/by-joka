const fs = require('fs')
const path = require('path')

// Parse .env.local
const envPath = path.resolve(__dirname, '../.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=')
        if (idx > -1) {
            process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
        }
    }
})

const paymobApiKey = process.env.PAYMOB_API_KEY
const paymobWalletIntId = process.env.PAYMOB_WALLET_INTEGRATION_ID

async function debugPaymob() {
  try {
    console.log('Testing authentication with key:', paymobApiKey.slice(0, 15) + '...')
    
    // Step A: Authentication
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: paymobApiKey })
    })
    
    console.log('Auth status:', authRes.status)
    const authData = await authRes.json()
    if (!authRes.ok) {
      console.error('Auth Error:', authData)
      return
    }
    const authToken = authData.token
    console.log('Auth Token successfully acquired')

    // Step B: Order Registration
    console.log('Registering test order...')
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: 15000,
        currency: 'EGP',
        items: [{ name: 'Test Product', amount_cents: 15000, quantity: 1 }]
      })
    })

    console.log('Order status:', orderRes.status)
    const orderData = await orderRes.json()
    if (!orderRes.ok) {
      console.error('Order Registration Error:', orderData)
      return
    }
    const paymobOrderId = orderData.id
    console.log('Paymob Order ID acquired:', paymobOrderId)

    // Step C: Payment Key Request
    console.log('Requesting payment keys...')
    const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: 15000,
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: {
          apartment: 'NA',
          email: 'test@example.com',
          floor: 'NA',
          first_name: 'Adel',
          street: 'Cairo',
          building: 'NA',
          phone_number: '+201098834136',
          shipping_method: 'PKG',
          postal_code: 'NA',
          city: 'Cairo',
          country: 'EGY',
          last_name: 'Maged',
          state: 'Cairo'
        },
        currency: 'EGP',
        integration_id: parseInt(paymobWalletIntId, 10)
      })
    })

    console.log('Payment Key status:', keyRes.status)
    const keyData = await keyRes.json()
    if (!keyRes.ok) {
      console.error('Payment Key Error details:', keyData)
      return
    }
    const paymentToken = keyData.token
    console.log('Payment Token acquired successfully')

    // Step D: Initiate Wallet Payment Request
    console.log('Initiating wallet payment request...')
    const payRes = await fetch('https://accept.paymob.com/api/acceptance/payments/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: {
          identifier: '01012345678',
          subtype: 'WALLET'
        },
        payment_token: paymentToken
      })
    })

    console.log('Wallet Pay status:', payRes.status)
    const payData = await payRes.json()
    if (!payRes.ok) {
      console.error('Wallet Pay Error details:', payData)
      return
    }
    console.log('Wallet Pay Redirect URL:', payData.redirect_url || payData.iframe_redirection_url)

  } catch (err) {
    console.error('Execution failed:', err)
  }
}

debugPaymob()
