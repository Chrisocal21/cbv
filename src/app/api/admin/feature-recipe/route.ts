import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// ─── POST /api/admin/feature-recipe ──────────────────────────────────────────
// Toggles isFeatured on a recipe. Unfeaturing all others when featuring one.

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { recipeId, featured } = await req.json()
  if (!recipeId) return NextResponse.json({ error: 'recipeId required' }, { status: 400 })

  // If featuring, unfeature all others first (only one Today's Pick at a time)
  if (featured) {
    await db.update(recipes).set({ isFeatured: false }).where(eq(recipes.isFeatured, true))
  }

  await db.update(recipes).set({ isFeatured: featured }).where(eq(recipes.id, recipeId))

  return NextResponse.json({ ok: true, featured })
}
