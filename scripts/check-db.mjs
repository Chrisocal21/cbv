import { neon } from '@neondatabase/serverless'
const sql = neon('postgresql://neondb_owner:npg_yrN3Vo4lCfvR@ep-icy-sunset-aknj9kvt.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require')
sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  .then(r => console.log('Tables:', r.map(t => t.table_name).join(', ')))
  .catch(e => console.error('Error:', e.message))
