-- 0016 — personal grocery checklist (structured, store-friendly)
-- Stores an ordered list of { id, text, checked } items the user controls directly.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grocery_items" jsonb DEFAULT '[]'::jsonb NOT NULL;
