-- 0017 — multi-list grocery support
-- Adds grocery_lists column to support multiple named lists
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grocery_lists" jsonb DEFAULT '[]'::jsonb NOT NULL;
