-- Add Devil's Advocate (critic) judge columns to submissions -- statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "critic_verdict" "submission_verdict";
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "critic_notes" text;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "critic_issues" jsonb DEFAULT '[]'::jsonb;
