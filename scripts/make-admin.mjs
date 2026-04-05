// Usage: node scripts/make-admin.mjs <clerk-user-id>
// Example: node scripts/make-admin.mjs user_2abc123...
import { neon } from '@neondatabase/serverless'

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) throw new Error('DATABASE_URL not set')

const userId = process.argv[2]
if (!userId) {
  console.error('Usage: node scripts/make-admin.mjs <clerk-user-id>')
  process.exit(1)
}

const sql = neon(DB_URL)

// Upsert user row with admin role
await sql`
  INSERT INTO users (id, role, created_at)
  VALUES (${userId}, 'admin', NOW())
  ON CONFLICT (id) DO UPDATE SET role = 'admin'
`

console.log(`User ${userId} is now an admin.`)
process.exit(0)
