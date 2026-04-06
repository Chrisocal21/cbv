-- Add save_count to recipes -- statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "save_count" integer NOT NULL DEFAULT 0;
