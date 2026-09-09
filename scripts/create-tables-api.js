// scripts/create-tables-api.js
// Uses Supabase Management API to run SQL directly
// Run: node scripts/create-tables-api.js

const fs = require('fs')
const path = require('path')
const https = require('https')
const bcrypt = require('bcryptjs')

// ── Parse .env.local ──────────────────────────────────────────────────
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing env vars')
    process.exit(1)
}

// Extract project ref from URL: https://XXXXXX.supabase.co
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
console.log('📌 Project ref:', projectRef)

// ── Helper: call Supabase Management API ──────────────────────────────
function managementRequest(sqlQuery) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query: sqlQuery })
        const options = {
            hostname: 'api.supabase.com',
            path: `/v1/projects/${projectRef}/database/query`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Length': Buffer.byteLength(body),
            },
        }

        const req = https.request(options, res => {
            let data = ''
            res.on('data', chunk => { data += chunk })
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) })
                } catch {
                    resolve({ status: res.statusCode, body: data })
                }
            })
        })
        req.on('error', reject)
        req.write(body)
        req.end()
    })
}

// ── Helper: Supabase REST (for inserts) ───────────────────────────────
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── SQL Queries ────────────────────────────────────────────────────────
const FULL_SQL = `
-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id   UUID PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT
);

-- Cashiers
CREATE TABLE IF NOT EXISTS cashiers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  branch_id     UUID NOT NULL REFERENCES branches(id),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
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
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity     INT NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_branch_id  ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`

// ── Branches ──────────────────────────────────────────────────────────
const BRANCHES = [
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'دسوق', city: 'كفر الشيخ', phone: '0502234567' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'الإسكندرية', city: 'الإسكندرية', phone: '0342123456' },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'القاهرة', city: 'القاهرة', phone: '0234567890' },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'الجيزة', city: 'الجيزة', phone: '0235678901' },
]

const CASHIERS_RAW = [
    { email: 'desouk@admin.com', branchId: '550e8400-e29b-41d4-a716-446655440001', name: 'كاشير دسوق' },
    { email: 'alex@admin.com', branchId: '550e8400-e29b-41d4-a716-446655440002', name: 'كاشير الإسكندرية' },
    { email: 'cairo@admin.com', branchId: '550e8400-e29b-41d4-a716-446655440003', name: 'كاشير القاهرة' },
    { email: 'giza@admin.com', branchId: '550e8400-e29b-41d4-a716-446655440004', name: 'كاشير الجيزة' },
]

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🚀 Shrimp House - Database Setup via Management API\n')
    console.log('─'.repeat(55))

    // 1) Create tables
    console.log('\n📋 Step 1: Running DDL (CREATE TABLE)...')
    const ddlResult = await managementRequest(FULL_SQL)

    if (ddlResult.status === 200 || ddlResult.status === 201) {
        console.log('  ✅ All tables created successfully!')
    } else {
        console.log(`  ⚠️  Status ${ddlResult.status}:`, JSON.stringify(ddlResult.body).slice(0, 200))
        // Don't stop — the tables might already exist
    }

    // 2) Insert branches
    console.log('\n🏢 Step 2: Inserting branches...')
    const { error: bErr } = await supabase
        .from('branches')
        .upsert(BRANCHES, { onConflict: 'id' })

    if (bErr) {
        console.log('  ❌ Branches error:', bErr.message)
    } else {
        console.log(`  ✅ ${BRANCHES.length} branches ready`)
        BRANCHES.forEach(b => console.log(`     🏪 ${b.name} — ${b.city}`))
    }

    // 3) Cashiers
    console.log('\n👤 Step 3: Creating cashiers...')
    const hash = await bcrypt.hash('password123', 10)
    const cashiers = CASHIERS_RAW.map(c => ({
        email: c.email,
        password_hash: hash,
        branch_id: c.branchId,
        name: c.name,
    }))

    const { error: cErr } = await supabase
        .from('cashiers')
        .upsert(cashiers, { onConflict: 'email' })

    if (cErr) {
        console.log('  ❌ Cashiers error:', cErr.message)
    } else {
        console.log(`  ✅ ${cashiers.length} cashiers ready`)
        cashiers.forEach(c => console.log(`     🔑 ${c.name} → ${c.email}`))
    }

    // 4) Verify
    console.log('\n🔍 Step 4: Verification...')
    const checks = ['branches', 'cashiers', 'orders', 'order_items']
    for (const table of checks) {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
        if (error) {
            console.log(`  ❌ ${table}: ${error.message}`)
        } else {
            console.log(`  ✅ ${table}: OK`)
        }
    }

    console.log('\n' + '─'.repeat(55))
    console.log('🎉 Done! Dashboard: http://localhost:3000/admin/login')
    console.log('\nLogin credentials (password: password123):')
    console.log('  desouk@admin.com → دسوق')
    console.log('  alex@admin.com   → الإسكندرية')
    console.log('  cairo@admin.com  → القاهرة')
    console.log('  giza@admin.com   → الجيزة\n')
}

main().catch(err => {
    console.error('\n❌ Fatal:', err.message)
    process.exit(1)
})
