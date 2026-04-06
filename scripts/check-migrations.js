const { neon } = require('@neondatabase/serverless')
const sql = neon('postgresql://neondb_owner:npg_yrN3Vo4lCfvR@ep-icy-sunset-aknj9kvt.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require')
Promise.all([
  sql`SELECT column_name FROM information_schema.columns WHERE table_name='recipes' AND column_name='save_count'`,
  sql`SELECT to_regclass('public.user_collections') AS t`
]).then(([sc, uc]) => {
  console.log('save_count:', sc.length > 0 ? 'OK' : 'MISSING')
  console.log('user_collections:', uc[0].t || 'MISSING')
}).catch(console.error)
