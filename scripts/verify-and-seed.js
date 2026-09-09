// scripts/verify-and-seed.js
// Verifies all tables exist, counts rows, and seeds data if missing
// Run: node scripts/verify-and-seed.js

const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

// Parse .env.local
const envPath = path.resolve(__dirname, '../.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=')
        if (idx > -1) process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
})

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

async function main() {
    console.log('\n🔍 Shrimp House — Verify & Seed\n' + '─'.repeat(45))

    // ── Branches ──
    console.log('\n📊 Checking branches...')
    const { data: existingBranches, error: bSelectErr } = await supabase.from('branches').select('*')
    if (bSelectErr) {
        console.log('  ❌ Cannot read branches:', bSelectErr.message)
    } else {
        console.log(`  Found ${existingBranches.length} branches`)
        if (existingBranches.length > 0) {
            existingBranches.forEach(b => console.log(`    • ${b.name} (${b.id.slice(0, 8)}...)`))
        }
    }

    // Insert missing branches
    const { error: bUpsertErr } = await supabase
        .from('branches')
        .upsert(BRANCHES, { onConflict: 'id' })
    if (bUpsertErr) {
        console.log('  ⚠️  Branch upsert:', bUpsertErr.message)
    } else {
        console.log('  ✅ Branches synced (4 branches with fixed UUIDs)')
    }

    // ── Cashiers ──
    console.log('\n📊 Checking cashiers...')
    const { data: existingCashiers, error: cSelectErr } = await supabase.from('cashiers').select('email, name, branch_id')
    if (cSelectErr) {
        console.log('  ❌ Cannot read cashiers:', cSelectErr.message)
    } else {
        console.log(`  Found ${existingCashiers.length} cashiers`)
        existingCashiers.forEach(c => console.log(`    • ${c.name} → ${c.email}`))
    }

    // Upsert cashiers
    const hash = await bcrypt.hash('password123', 10)
    const cashiers = CASHIERS_RAW.map(c => ({
        email: c.email,
        password_hash: hash,
        branch_id: c.branchId,
        name: c.name,
    }))

    const { error: cUpsertErr } = await supabase
        .from('cashiers')
        .upsert(cashiers, { onConflict: 'email' })

    if (cUpsertErr) {
        console.log('  ⚠️  Cashier upsert:', cUpsertErr.message)
    } else {
        console.log('  ✅ Cashiers synced (4 cashiers, password: password123)')
    }

    // ── Orders ──
    console.log('\n📊 Checking orders...')
    const { count: orderCount, error: oErr } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
    if (oErr) {
        console.log('  ❌ orders:', oErr.message)
    } else {
        console.log(`  ✅ orders table: ${orderCount} existing orders`)
    }

    // ── Order Items ──
    const { count: itemCount, error: iErr } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
    if (iErr) {
        console.log('  ❌ order_items:', iErr.message)
    } else {
        console.log(`  ✅ order_items table: ${itemCount} existing items`)
    }

    // ── Final verify login ──
    console.log('\n🔐 Testing login (desouk@admin.com / password123)...')
    const { data: cashierData, error: loginErr } = await supabase
        .from('cashiers')
        .select('id, email, password_hash, name, branch_id, branches(id, name, city)')
        .eq('email', 'desouk@admin.com')
        .single()

    if (loginErr || !cashierData) {
        console.log('  ❌ Cannot find cashier:', loginErr?.message)
    } else {
        const pwMatch = await bcrypt.compare('password123', cashierData.password_hash)
        if (pwMatch) {
            console.log('  ✅ Login test PASSED!')
            console.log(`     Name: ${cashierData.name}`)
            console.log(`     Branch: ${cashierData.branches?.name}`)
        } else {
            console.log('  ❌ Password hash mismatch — updating...')
            const newHash = await bcrypt.hash('password123', 10)
            await supabase.from('cashiers').update({ password_hash: newHash }).eq('email', 'desouk@admin.com')
            console.log('  ✅ Password updated. Try again.')
        }
    }

    console.log('\n' + '─'.repeat(45))
    console.log('✨ All done! Go to: http://localhost:3000/admin/login\n')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
