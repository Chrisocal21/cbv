import { db } from '@/lib/db'
import { recipes, users, submissions, collections, cookedLog } from '@/lib/db/schema'
import { eq, inArray, and, or, desc, gte, count } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type RecipeRow = InferSelectModel<typeof recipes>
export type CollectionRow = InferSelectModel<typeof collections>

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

export async function getAllCollections(): Promise<CollectionRow[]> {
  return db.select().from(collections).orderBy(collections.sortOrder)
}

/** Returns collections with a spotlight recipe (most recently published) for each. */
export async function getCollectionsWithSpotlight(): Promise<
  Array<CollectionRow & { spotlight: RecipeRow | null }>
> {
  const allCollections = await getAllCollections()
  const published = await getAllRecipes()

  return allCollections.map((col) => {
    const inCollection = published
      .filter((r) => r.collection === col.name)
      .sort((a, b) => (b.publishedAt ?? b.createdAt).getTime() - (a.publishedAt ?? a.createdAt).getTime())
    return { ...col, spotlight: inCollection[0] ?? null }
  })
}

export async function getCollectionBySlug(slug: string): Promise<CollectionRow | undefined> {
  const rows = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1)
  return rows[0]
}

export async function getRecipesByCollection(collection: string): Promise<RecipeRow[]> {
  return db
    .select()
    .from(recipes)
    .where(eq(recipes.collection, collection))
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

/** Fetch any recipes by ID array — used for cook log nutrition lookups */
export async function getRecipesByIds(recipeIds: string[]): Promise<RecipeRow[]> {
  if (recipeIds.length === 0) return []
  return db.select().from(recipes).where(inArray(recipes.id, recipeIds))
}

/** Distinct recipe IDs this user has ever logged as cooked — used for personalisation */
export async function getUserCookedRecipeIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ recipeId: cookedLog.recipeId })
    .from(cookedLog)
    .where(eq(cookedLog.userId, userId))
  return [...new Set(rows.map((r) => r.recipeId))]
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

// ─── Trending ─────────────────────────────────────────────────────────────────

/**
 * Returns up to `limit` published recipes trending this week.
 * Primary signal: cook-log events in the last 7 days.
 * Falls back to all-time saveCount when recent activity is sparse.
 */
export async function getTrendingRecipes(limit = 6): Promise<RecipeRow[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const trendRows = await db
    .select({ recipeId: cookedLog.recipeId, cookCount: count() })
    .from(cookedLog)
    .where(gte(cookedLog.cookedAt, since))
    .groupBy(cookedLog.recipeId)
    .orderBy(desc(count()))
    .limit(limit)

  if (trendRows.length >= 4) {
    const ids = trendRows.map((r) => r.recipeId)
    const rows = await db
      .select()
      .from(recipes)
      .where(and(inArray(recipes.id, ids), eq(recipes.status, 'published')))
    const orderMap = Object.fromEntries(ids.map((id, i) => [id, i]))
    return rows.sort((a, b) => (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99))
  }

  // Fallback: most saved published recipes
  return db
    .select()
    .from(recipes)
    .where(eq(recipes.status, 'published'))
    .orderBy(desc(recipes.saveCount))
    .limit(limit)
}

// ─── Public chef profiles ─────────────────────────────────────────────────────

/** Published recipes by a real user (by their Clerk userId) */
export async function getPublishedRecipesByUser(userId: string): Promise<RecipeRow[]> {
  return db
    .select()
    .from(recipes)
    .where(and(eq(recipes.authorId, userId), eq(recipes.status, 'published')))
    .orderBy(desc(recipes.publishedAt))
}

/** Published recipes by a staff persona slug */
export async function getPublishedRecipesByStaff(persona: string): Promise<RecipeRow[]> {
  return db
    .select()
    .from(recipes)
    .where(and(eq(recipes.staffAuthor, persona), eq(recipes.status, 'published')))
    .orderBy(desc(recipes.publishedAt))
}

/** Look up a user by their username (for public profile URLs) */
export async function getUserByUsername(username: string): Promise<UserRow | undefined> {
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1)
  return rows[0]
}

/** Public collections for a user (non-empty ones only) */
export async function getPublicCollectionsByUser(userId: string) {
  const { userCollections } = await import('@/lib/db/schema')
  const rows = await db.select().from(userCollections).where(eq(userCollections.userId, userId))
  return rows
}
