import { neon } from '@neondatabase/serverless'
const sql = neon('postgresql://neondb_owner:npg_yrN3Vo4lCfvR@ep-icy-sunset-aknj9kvt.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require')
const rows = await sql`SELECT id, role FROM users`
console.log('Users in DB:', JSON.stringify(rows))

// Upsert admin
await sql`
  INSERT INTO users (id, role, created_at)
  VALUES ('user_3Bx5S9BJJbXkLHDaGHajLSUIgad', 'admin', NOW())
  ON CONFLICT (id) DO UPDATE SET role = 'admin'
`
const check = await sql`SELECT id, role FROM users WHERE id = 'user_3Bx5S9BJJbXkLHDaGHajLSUIgad'`
console.log('After upsert:', JSON.stringify(check))
process.exit(0)
