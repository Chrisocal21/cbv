-- Add view_count to recipes -- statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "view_count" integer NOT NULL DEFAULT 0;
