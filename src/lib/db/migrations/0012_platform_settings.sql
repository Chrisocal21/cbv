ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "staff_author" text;

CREATE TABLE IF NOT EXISTS "staff_activity" (
  "id" text PRIMARY KEY NOT NULL,
  "persona" text NOT NULL,
  "action_type" text NOT NULL,
  "recipe_id" text,
  "tokens_input" integer NOT NULL DEFAULT 0,
  "tokens_output" integer NOT NULL DEFAULT 0,
  "outcome" text NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "platform_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Seed default settings
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES
  ('monthly_token_budget', '500000', now()),
  ('auto_creation_enabled', 'true', now()),
  ('creation_threshold', '8', now())
ON CONFLICT ("key") DO NOTHING;
