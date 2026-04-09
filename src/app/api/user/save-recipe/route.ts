import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, recipes, notifications } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

// Ensure a user row exists (Clerk users aren't automatically synced to our DB)
async function ensureUser(userId: string) {
  await db.insert(users).values({ id: userId }).onConflictDoNothing()
}

// ─── GET /api/user/save-recipe — return the current user's saved recipe IDs ──
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureUser(userId)
  const rows = await db.select({ savedRecipes: users.savedRecipes }).from(users).where(eq(users.id, userId)).limit(1)
  return NextResponse.json({ savedRecipes: rows[0]?.savedRecipes ?? [] })
}

// ─── POST /api/user/save-recipe — toggle a recipe in the user's saved list ───
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipeId } = await req.json()
  if (!recipeId || typeof recipeId !== 'string') {
    return NextResponse.json({ error: 'Missing recipeId' }, { status: 400 })
  }

  await ensureUser(userId)

  const rows = await db.select({ savedRecipes: users.savedRecipes }).from(users).where(eq(users.id, userId)).limit(1)
  const current = rows[0]?.savedRecipes ?? []
  const isSaved = current.includes(recipeId)
  const updated = isSaved ? current.filter((id) => id !== recipeId) : [...current, recipeId]

  await db.update(users).set({ savedRecipes: updated }).where(eq(users.id, userId))

  // Increment or decrement save_count on the recipe (fire-and-forget)
  db.update(recipes)
    .set({ saveCount: sql`${recipes.saveCount} + ${isSaved ? -1 : 1}` })
    .where(eq(recipes.id, recipeId))
    .catch(() => {})

  // Notify the recipe author when saved (not when unsaved, not self-saves)
  if (!isSaved) {
    db.select({ authorId: recipes.authorId, title: recipes.title, slug: recipes.slug })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1)
      .then((rows) => {
        const recipe = rows[0]
        if (recipe?.authorId && recipe.authorId !== userId) {
          return db.insert(notifications).values({
            id: crypto.randomUUID(),
            userId: recipe.authorId,
            type: 'recipe_saved',
            message: `Someone saved your recipe "${recipe.title}".`,
            recipeId,
            recipeSlug: recipe.slug,
          })
        }
      })
      .catch(() => {})
  }

  return NextResponse.json({ saved: !isSaved, savedRecipes: updated })
}
