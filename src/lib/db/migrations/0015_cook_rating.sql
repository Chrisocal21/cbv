-- Add rating column to cook log (1 = liked, -1 = didn't love it, null = unrated) -- statement-breakpoint
ALTER TABLE "cooked_log" ADD COLUMN IF NOT EXISTS "rating" integer;
