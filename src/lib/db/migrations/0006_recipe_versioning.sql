-- Recipe versioning: parentId reference for recipe variations -- statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "parent_id" text;
-- statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "is_variation" boolean NOT NULL DEFAULT false;
