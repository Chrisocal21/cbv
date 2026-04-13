-- Smart week plan: user's weekly recipe plan + persisted grocery list
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "week_plan" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grocery_list" text DEFAULT '' NOT NULL;
