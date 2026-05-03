const { neon } = require('@neondatabase/serverless')
const sql = neon('postgresql://neondb_owner:npg_yrN3Vo4lCfvR@ep-icy-sunset-aknj9kvt.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require')

async function run() {
  // 0010 — notifications table
  await sql`
    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "type" text NOT NULL,
      "message" text NOT NULL,
      "recipe_id" text,
      "recipe_slug" text,
      "read" boolean DEFAULT false NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" ("user_id")`
  console.log('0010 notifications: OK')

  // 0014 — week_plan + grocery_list on users
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "week_plan" jsonb DEFAULT '[]'::jsonb NOT NULL`
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grocery_list" text DEFAULT '' NOT NULL`
  console.log('0014 week_plan: OK')

  // 0015 — rating on cooked_log
  await sql`ALTER TABLE "cooked_log" ADD COLUMN IF NOT EXISTS "rating" integer`
  console.log('0015 cook_rating: OK')
}

run().catch(e => { console.error('FAIL:', e.message); process.exit(1) })
