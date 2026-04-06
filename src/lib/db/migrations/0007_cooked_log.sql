-- Cook log: track which recipes users have cooked and when -- statement-breakpoint
CREATE TABLE IF NOT EXISTS "cooked_log" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "recipe_id" text NOT NULL,
  "recipe_slug" text NOT NULL,
  "cooked_at" timestamp NOT NULL DEFAULT now(),
  "servings" integer NOT NULL DEFAULT 1,
  "notes" text DEFAULT ''
);
