-- Add imageUrl to collections table -- statement-breakpoint
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "image_url" text;
