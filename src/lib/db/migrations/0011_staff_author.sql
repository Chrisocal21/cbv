ALTER TABLE "recipes" ADD COLUMN "staff_author" text;

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
