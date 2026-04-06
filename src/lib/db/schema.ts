import { pgTable, text, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'

// ─── Collections ─────────────────────────────────────────────────────────────

export const collections = pgTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  gradient: text('gradient').notNull().default('from-stone-700 to-amber-700'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Shared types ─────────────────────────────────────────────────────────────

type Ingredient = { group: string; items: string[] }
type Step = { title: string; body: string }
type Nutrition = { calories: number; protein: string; carbs: string; fat: string; fiber: string }

// ─── Enums ───────────────────────────────────────────────────────────────────

export const difficultyEnum = pgEnum('difficulty', ['Easy', 'Intermediate', 'Advanced'])

export const recipeStatusEnum = pgEnum('recipe_status', [
  'published',
  'pending_review',
  'flagged',
  'rejected',
  'draft',
])

export const submissionVerdictEnum = pgEnum('submission_verdict', ['pass', 'flag', 'reject'])

// ─── Recipes ─────────────────────────────────────────────────────────────────

export const recipes = pgTable('recipes', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  description: text('description').notNull(),
  collection: text('collection').notNull(),
  cuisine: text('cuisine').notNull(),
  moodTags: jsonb('mood_tags').$type<string[]>().notNull().default([]),
  dietaryTags: jsonb('dietary_tags').$type<string[]>().notNull().default([]),
  difficulty: difficultyEnum('difficulty').notNull(),
  prepTime: text('prep_time').notNull(),
  cookTime: text('cook_time').notNull(),
  totalTime: text('total_time').notNull(),
  servings: text('servings').notNull(),
  ingredients: jsonb('ingredients').$type<Ingredient[]>().notNull().default([]),
  steps: jsonb('steps').$type<Step[]>().notNull().default([]),
  nutrition: jsonb('nutrition').$type<Nutrition>().notNull().default({} as Nutrition),
  originStory: text('origin_story').notNull().default(''),
  imageUrl: text('image_url'),
  gradient: text('gradient').notNull().default('from-stone-700 to-amber-700'),
  status: recipeStatusEnum('status').notNull().default('published'),
  aiGenerated: boolean('ai_generated').notNull().default(false),
  authorId: text('author_id'), // null = platform/admin
  isFeatured: boolean('is_featured').notNull().default(false),
  viewCount: integer('view_count').notNull().default(0),
  saveCount: integer('save_count').notNull().default(0),
  parentId: text('parent_id'),
  isVariation: boolean('is_variation').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  publishedAt: timestamp('published_at'),
})

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  username: text('username').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  savedRecipes: jsonb('saved_recipes').$type<string[]>().notNull().default([]),
  dietaryPreferences: jsonb('dietary_preferences').$type<string[]>().notNull().default([]),
  fridgeIngredients: jsonb('fridge_ingredients').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Submissions ──────────────────────────────────────────────────────────────

export const submissions = pgTable('submissions', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id').notNull(), // the recipe being submitted/reviewed
  submittedBy: text('submitted_by').notNull(), // Clerk user ID

  // Court of Chefs — per-judge results
  techniqueVerdict: submissionVerdictEnum('technique_verdict'),
  techniqueNotes: text('technique_notes'),

  flavourVerdict: submissionVerdictEnum('flavour_verdict'),
  flavourNotes: text('flavour_notes'),

  homecookVerdict: submissionVerdictEnum('homecook_verdict'),
  homecookNotes: text('homecook_notes'),

  // Synthesis pass
  confidenceScore: integer('confidence_score'), // 0–100
  synthesisNotes: text('synthesis_notes'),
  recommendedAction: submissionVerdictEnum('recommended_action'),

  // Admin decision
  adminReviewed: boolean('admin_reviewed').notNull().default(false),
  adminDecision: text('admin_decision'), // 'publish' | 'reject'
  adminNotes: text('admin_notes'),

  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
})

// ─── User Collections (personal cookbooks) ────────────────────────────────────

export const userCollections = pgTable('user_collections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  recipeIds: jsonb('recipe_ids').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Cooked Log ────────────────────────────────────────────────────────────────

export const cookedLog = pgTable('cooked_log', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  recipeId: text('recipe_id').notNull(),
  recipeSlug: text('recipe_slug').notNull(),
  cookedAt: timestamp('cooked_at').notNull().defaultNow(),
  servings: integer('servings').notNull().default(1),
  notes: text('notes').default(''),
})

