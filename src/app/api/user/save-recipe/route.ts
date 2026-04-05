import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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

  return NextResponse.json({ saved: !isSaved, savedRecipes: updated })
}
