const fs = require('fs')
const path = require('path')
const https = require('https')

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]

function managementQuery(sql) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query: sql })
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

async function main() {
  console.log('Testing alert column...')
  // We want to add payment_method and payment_status to orders table
  const sql = `
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
  `
  const result = await managementQuery(sql)
  console.log('Result:', result)
}
main()
