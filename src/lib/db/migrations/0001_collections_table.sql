-- Create collections table -- statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL DEFAULT '',
	"gradient" text NOT NULL DEFAULT 'from-stone-700 to-amber-700',
	"sort_order" integer NOT NULL DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collections_name_unique" UNIQUE("name"),
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
-- Seed the 5 existing collections
INSERT INTO "collections" ("id", "name", "slug", "description", "gradient", "sort_order") VALUES
  ('coll_culinary_journeys', 'Culinary Journeys', 'culinary-journeys', 'Global recipes. Cultural deep-dives. The food that tells a story about where it came from.', 'from-amber-700 to-orange-600', 1),
  ('coll_seasonal_sensations', 'Seasonal Sensations', 'seasonal-sensations', 'Time-of-year cooking. What is good right now, at the peak of its moment.', 'from-green-700 to-emerald-500', 2),
  ('coll_gourmet_guerillas', 'Gourmet Guerillas', 'gourmet-guerillas', 'Elevated technique, home kitchen access. Restaurant-quality results without the pretense.', 'from-neutral-700 to-stone-500', 3),
  ('coll_quick_creative', 'Quick & Creative', 'quick-and-creative', 'Fast, clever, minimal fuss. The weeknight recipes that actually get made.', 'from-blue-700 to-cyan-500', 4),
  ('coll_baking_alchemy', 'Baking Alchemy', 'baking-alchemy', 'Bread, pastry, and sweets. The meditative, rewarding side of the kitchen.', 'from-yellow-700 to-amber-500', 5);
--> statement-breakpoint
-- Change recipes.collection from the pg enum type to plain text
ALTER TABLE "recipes" ALTER COLUMN "collection" TYPE text USING "collection"::text;
--> statement-breakpoint
-- Drop the old enum (no longer needed)
DROP TYPE "public"."collection";
