import { db } from '@/lib/db'
import { recipes, users, submissions } from '@/lib/db/schema'
import { eq, inArray, and, or } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type RecipeRow = InferSelectModel<typeof recipes>

export async function getAllRecipes(): Promise<RecipeRow[]> {
  return db.select().from(recipes).where(eq(recipes.status, 'published'))
}

export async function getRecipeBySlug(slug: string): Promise<RecipeRow | undefined> {
  const rows = await db
    .select()
    .from(recipes)
    .where(eq(recipes.slug, slug))
    .limit(1)
  return rows[0]
}

export async function getRecipesByCollection(collection: string): Promise<RecipeRow[]> {
  return db
    .select()
    .from(recipes)
    .where(eq(recipes.collection, collection as RecipeRow['collection']))
}

export async function getFeaturedRecipe(): Promise<RecipeRow | undefined> {
  const rows = await db
    .select()
    .from(recipes)
    .where(eq(recipes.isFeatured, true))
    .limit(1)
  return rows[0]
}

export async function getRecentRecipes(limit = 3): Promise<RecipeRow[]> {
  return db
    .select()
    .from(recipes)
    .where(eq(recipes.status, 'published'))
    .orderBy(recipes.publishedAt)
    .limit(limit)
}

// ─── User profile queries ─────────────────────────────────────────────────────

export type UserRow = InferSelectModel<typeof users>
export type SubmissionRow = InferSelectModel<typeof submissions>

export async function getUserProfile(userId: string): Promise<UserRow | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return rows[0]
}

/** Recipes this user authored (any status) */
export async function getUserRecipes(userId: string): Promise<RecipeRow[]> {
  return db.select().from(recipes).where(eq(recipes.authorId, userId))
}

/** Recipes this user has saved (by IDs stored in users.savedRecipes) */
export async function getUserSavedRecipes(recipeIds: string[]): Promise<RecipeRow[]> {
  if (recipeIds.length === 0) return []
  return db.select().from(recipes).where(
    and(inArray(recipes.id, recipeIds), or(eq(recipes.status, 'published'), eq(recipes.status, 'draft')))
  )
}

/** Submissions for recipes authored by this user */
export async function getUserSubmissions(userId: string): Promise<(SubmissionRow & { recipe: RecipeRow })[]> {
  const rows = await db.select().from(submissions).where(eq(submissions.submittedBy, userId))
  if (rows.length === 0) return []
  const recipeIds = rows.map((s) => s.recipeId)
  const recipeRows = await db.select().from(recipes).where(
    and(inArray(recipes.id, recipeIds), eq(recipes.authorId, userId))
  )
  const recipeMap = Object.fromEntries(recipeRows.map((r) => [r.id, r]))
  return rows
    .filter((s) => recipeMap[s.recipeId])
    .map((s) => ({ ...s, recipe: recipeMap[s.recipeId] }))
}
