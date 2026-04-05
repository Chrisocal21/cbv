CREATE TYPE "public"."collection" AS ENUM('Culinary Journeys', 'Seasonal Sensations', 'Gourmet Guerillas', 'Quick & Creative', 'Baking Alchemy');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('Easy', 'Intermediate', 'Advanced');--> statement-breakpoint
CREATE TYPE "public"."recipe_status" AS ENUM('published', 'pending_review', 'flagged', 'rejected', 'draft');--> statement-breakpoint
CREATE TYPE "public"."submission_verdict" AS ENUM('pass', 'flag', 'reject');--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"description" text NOT NULL,
	"collection" "collection" NOT NULL,
	"cuisine" text NOT NULL,
	"mood_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dietary_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"prep_time" text NOT NULL,
	"cook_time" text NOT NULL,
	"total_time" text NOT NULL,
	"servings" text NOT NULL,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nutrition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origin_story" text DEFAULT '' NOT NULL,
	"image_url" text,
	"gradient" text DEFAULT 'from-stone-700 to-amber-700' NOT NULL,
	"status" "recipe_status" DEFAULT 'published' NOT NULL,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"author_id" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	CONSTRAINT "recipes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"submitted_by" text NOT NULL,
	"technique_verdict" "submission_verdict",
	"technique_notes" text,
	"flavour_verdict" "submission_verdict",
	"flavour_notes" text,
	"homecook_verdict" "submission_verdict",
	"homecook_notes" text,
	"confidence_score" integer,
	"synthesis_notes" text,
	"recommended_action" "submission_verdict",
	"admin_reviewed" boolean DEFAULT false NOT NULL,
	"admin_decision" text,
	"admin_notes" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text,
	"display_name" text,
	"avatar_url" text,
	"bio" text,
	"role" text DEFAULT 'user' NOT NULL,
	"saved_recipes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dietary_preferences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
