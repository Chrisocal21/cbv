-- Add fridge_ingredients to users -- statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fridge_ingredients" jsonb NOT NULL DEFAULT '[]';
