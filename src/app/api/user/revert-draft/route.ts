import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recipes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// POST /api/user/revert-draft — resets a rejected recipe back to draft so the user can revise and resubmit
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipeId } = await req.json()
  if (!recipeId) return NextResponse.json({ error: 'recipeId required' }, { status: 400 })

  const rows = await db.select().from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.authorId, userId)))
    .limit(1)

  const recipe = rows[0]
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (recipe.status !== 'rejected') return NextResponse.json({ error: 'Recipe is not rejected' }, { status: 409 })

  await db.update(recipes).set({ status: 'draft', updatedAt: new Date() }).where(eq(recipes.id, recipeId))

  return NextResponse.json({ ok: true, slug: recipe.slug })
}
