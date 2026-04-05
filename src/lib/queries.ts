import { db } from '@/lib/db'
import { recipes } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
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
