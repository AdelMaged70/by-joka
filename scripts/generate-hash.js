/**
 * Run this script ONCE to generate the correct bcrypt hash for the default password.
 * Usage: node scripts/generate-hash.js
 * Then copy the output hash and put it in scripts/00-complete-setup.sql
 */
const bcrypt = require('bcryptjs')

async function main() {
    const password = 'password123'
    const hash = await bcrypt.hash(password, 10)
    console.log('\n✅ Bcrypt hash for:', password)
    console.log(hash)
    console.log('\n📋 Copy this hash into scripts/00-complete-setup.sql\n')
}

main()
