// scripts/create-tables.js
// Run: node scripts/create-tables.js

const fs = require('fs')
const path = require('path')

// Manually parse .env.local
const envPath = path.resolve(__dirname, '../.env.local')
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

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
}

const supabase = createClient(url, key)

// ─── SQL Statements ────────────────────────────────────────────────────
const SQL_BRANCHES = `
CREATE TABLE IF NOT EXISTS branches (
  id   UUID PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT
);`

const SQL_CASHIERS = `
CREATE TABLE IF NOT EXISTS cashiers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  branch_id     UUID NOT NULL REFERENCES branches(id),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);`

const SQL_ORDERS = `
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        UUID NOT NULL REFERENCES branches(id),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  customer_email   TEXT,
  customer_address TEXT,
  total_price      DECIMAL(10,2) NOT NULL,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','done','canceled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);`

const SQL_ORDER_ITEMS = `
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity     INT NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);`

const SQL_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_orders_branch_id  ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);`

// ─── Branches Data ─────────────────────────────────────────────────────
const BRANCHES = [
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'دسوق', city: 'كفر الشيخ', phone: '0502234567' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'الإسكندرية', city: 'الإسكندرية', phone: '0342123456' },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'القاهرة', city: 'القاهرة', phone: '0234567890' },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'الجيزة', city: 'الجيزة', phone: '0235678901' },
]

// ─── Cashiers Data ─────────────────────────────────────────────────────
const CASHIERS_RAW = [
    { email: 'desouk@admin.com', branchId: '550e8400-e29b-41d4-a716-446655440001', name: 'كاشير دسوق' },
    { email: 'alex@admin.com', branchId: '550e8400-e29b-41d4-a716-446655440002', name: 'كاشير الإسكندرية' },
    { email: 'cairo@admin.com', branchId: '550e8400-e29b-41d4-a716-446655440003', name: 'كاشير القاهرة' },
    { email: 'giza@admin.com', branchId: '550e8400-e29b-41d4-a716-446655440004', name: 'كاشير الجيزة' },
]

// ─── Helper: run SQL via RPC ────────────────────────────────────────────
async function runSQL(label, sql) {
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(e => ({ error: e }))
    if (error) {
        // Try the pg_catalog approach as fallback
        return { ok: false, err: error.message }
    }
    return { ok: true }
}

// ─── Helper: create table via Supabase REST (upsert trick) ─────────────
// Since we can't run raw DDL directly from the JS client without an RPC function,
// we'll use the Supabase Management API or a fetch to the REST endpoint.
async function execSQL(sql) {
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
}

// ─── Main ───────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🚀 Shrimp House - Database Setup\n')
    console.log('📡 Connected to:', url)
    console.log('─'.repeat(50))

    // Step 1: Create tables using Supabase Management API
    console.log('\n📋 Step 1: Creating tables...')

    const tables = [
        { name: 'branches', sql: SQL_BRANCHES },
        { name: 'cashiers', sql: SQL_CASHIERS },
        { name: 'orders', sql: SQL_ORDERS },
        { name: 'order_items', sql: SQL_ORDER_ITEMS },
    ]

    for (const table of tables) {
        const result = await execSQL(table.sql)
        if (result.ok) {
            console.log(`  ✅ Table "${table.name}" created (or already exists)`)
        } else {
            // If exec_sql RPC doesn't exist, we'll try direct insertion approach
            console.log(`  ⚠️  Table "${table.name}": ${result.err?.slice(0, 80)}`)
        }
    }

    // Create indexes
    const idxResult = await execSQL(SQL_INDEXES)
    if (idxResult.ok) {
        console.log('  ✅ Indexes created')
    }

    // Step 2: Insert branches
    console.log('\n🏢 Step 2: Inserting branches...')
    const { error: branchError } = await supabase
        .from('branches')
        .upsert(BRANCHES, { onConflict: 'id', ignoreDuplicates: true })

    if (branchError) {
        console.log('  ⚠️  Branches:', branchError.message)
    } else {
        console.log(`  ✅ ${BRANCHES.length} branches inserted`)
        BRANCHES.forEach(b => console.log(`     • ${b.name} (${b.city})`))
    }

    // Step 3: Hash password and insert cashiers
    console.log('\n👤 Step 3: Creating cashiers (password: password123)...')
    const hash = await bcrypt.hash('password123', 10)

    const cashiers = CASHIERS_RAW.map(c => ({
        email: c.email,
        password_hash: hash,
        branch_id: c.branchId,
        name: c.name,
    }))

    const { error: cashierError } = await supabase
        .from('cashiers')
        .upsert(cashiers, { onConflict: 'email', ignoreDuplicates: true })

    if (cashierError) {
        console.log('  ⚠️  Cashiers:', cashierError.message)
    } else {
        console.log(`  ✅ ${cashiers.length} cashiers created`)
        cashiers.forEach(c => console.log(`     • ${c.name} → ${c.email}`))
    }

    // Step 4: Verify
    console.log('\n🔍 Step 4: Verifying setup...')

    const { data: branchesData, error: bErr } = await supabase.from('branches').select('name, city')
    if (!bErr && branchesData) {
        console.log(`  ✅ branches table: ${branchesData.length} rows`)
    } else {
        console.log('  ❌ branches table not accessible:', bErr?.message)
    }

    const { data: cashiersData, error: cErr } = await supabase.from('cashiers').select('name, email')
    if (!cErr && cashiersData) {
        console.log(`  ✅ cashiers table: ${cashiersData.length} rows`)
    } else {
        console.log('  ❌ cashiers table not accessible:', cErr?.message)
    }

    const { data: ordersData, error: oErr } = await supabase.from('orders').select('id').limit(1)
    if (!oErr) {
        console.log('  ✅ orders table: accessible')
    } else {
        console.log('  ❌ orders table not accessible:', oErr?.message)
    }

    const { data: itemsData, error: iErr } = await supabase.from('order_items').select('id').limit(1)
    if (!iErr) {
        console.log('  ✅ order_items table: accessible')
    } else {
        console.log('  ❌ order_items table not accessible:', iErr?.message)
    }

    console.log('\n' + '─'.repeat(50))
    console.log('✨ Setup complete!\n')
    console.log('🔑 Login credentials:')
    console.log('   desouk@admin.com  → فرع دسوق')
    console.log('   alex@admin.com    → فرع الإسكندرية')
    console.log('   cairo@admin.com   → فرع القاهرة')
    console.log('   giza@admin.com    → فرع الجيزة')
    console.log('   Password: password123')
    console.log('\n🌐 Dashboard: http://localhost:3000/admin/login\n')
}

main().catch(err => {
    console.error('\n❌ Fatal error:', err)
    process.exit(1)
})
