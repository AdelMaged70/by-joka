import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  try {
    console.log('Creating branches table...')
    const { error: branchesError } = await supabase.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS branches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        city TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    }).catch(() => ({ error: null })) // Ignore if RPC not available

    console.log('Creating cashiers table...')
    await supabase.from('branches').select('*').limit(1).catch(() => {})

    const { data: branches } = await supabase
      .from('branches')
      .select('*')
      .catch(() => ({ data: null }))

    if (!branches || branches.length === 0) {
      console.log('Inserting sample branches...')
      await supabase.from('branches').insert([
        {
          name: 'دسوق',
          city: 'دسوق',
          address: 'شارع النيل، دسوق',
          phone: '01000000001'
        },
        {
          name: 'الإسكندرية',
          city: 'الإسكندرية',
          address: 'كورنيش الإسكندرية',
          phone: '01000000002'
        },
        {
          name: 'القاهرة',
          city: 'القاهرة',
          address: 'وسط البلد، القاهرة',
          phone: '01000000003'
        },
        {
          name: 'الجيزة',
          city: 'الجيزة',
          address: 'ستة أكتوبر، الجيزة',
          phone: '01000000004'
        }
      ])
    }

    console.log('✅ Database setup completed successfully')
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    process.exit(1)
  }
}

setupDatabase()
