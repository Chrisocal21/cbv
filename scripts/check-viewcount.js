const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_yrN3Vo4lCfvR@ep-icy-sunset-aknj9kvt.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require');
sql`SELECT column_name FROM information_schema.columns WHERE table_name='recipes' AND column_name='view_count'`
  .then(r => { console.log('view_count column:', r.length > 0 ? 'EXISTS' : 'MISSING'); })
  .catch(e => console.error(e));
