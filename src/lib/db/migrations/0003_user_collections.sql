-- Add user_collections table for personal "cookbooks" -- statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_collections" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "recipe_ids" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_collections_user_id_idx" ON "user_collections" ("user_id");
