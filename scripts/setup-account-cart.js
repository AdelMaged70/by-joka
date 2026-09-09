// scripts/setup-account-cart.js
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Parse .env.local
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim()
        process.env[key] = val
      }
    }
  })
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('❌ Missing Supabase environment variables in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

const SQL_ACCOUNT = `
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`

const SQL_CART = `
CREATE TABLE IF NOT EXISTS cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_account_product UNIQUE (account_id, product_id)
);`

async function execSQL(sql) {
  try {
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ sql }),
    })
    if (!response.ok) {
      const text = await response.text()
      return { ok: false, err: text }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, err: e.message }
  }
}

async function main() {
  console.log('🚀 Setting up Account and Cart tables in Supabase...')
  
  // Try execSQL
  const res1 = await execSQL(SQL_ACCOUNT)
  console.log('Account table RPC result:', res1)
  const res2 = await execSQL(SQL_CART)
  console.log('Cart table RPC result:', res2)

  // Verify tables
  const { data: accData, error: accErr } = await supabase.from('account').select('*').limit(1)
  if (accErr) {
    console.log('⚠️  Account table check:', accErr.message)
  } else {
    console.log('✅  Account table is active!')
  }

  const { data: cartData, error: cartErr } = await supabase.from('cart').select('*').limit(1)
  if (cartErr) {
    console.log('⚠️  Cart table check:', cartErr.message)
  } else {
    console.log('✅  Cart table is active!')
  }
}

main().catch(console.error)
