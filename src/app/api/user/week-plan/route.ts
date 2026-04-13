import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, recipes } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { normalizeIngredient, computeOverlaps, type IngredientGroup } from '@/lib/ingredients'

// ─── GET /api/user/week-plan — fetch plan with recipes + overlaps ─────────────

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await db
    .select({ weekPlan: users.weekPlan, groceryList: users.groceryList })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const weekPlanIds: string[] = row[0]?.weekPlan ?? []
  const groceryList: string = row[0]?.groceryList ?? ''

  if (weekPlanIds.length === 0) {
    return NextResponse.json({ recipeIds: [], recipes: [], overlaps: {}, groceryList })
  }

  // Fetch plan recipes + all published recipes (for staple computation)
  const [planRecipes, allPublished] = await Promise.all([
    db.select().from(recipes).where(inArray(recipes.id, weekPlanIds)),
    db.select({ ingredients: recipes.ingredients }).from(recipes).where(eq(recipes.status, 'published')),
  ])

  const allIngredients = allPublished.map((r) => r.ingredients as IngredientGroup[])
  const planForOverlap = planRecipes.map((r) => ({
    id: r.id,
    ingredients: r.ingredients as IngredientGroup[],
  }))
  const overlaps = computeOverlaps(planForOverlap, allIngredients)

  return NextResponse.json({ recipeIds: weekPlanIds, recipes: planRecipes, overlaps, groceryList })
}

// ─── POST /api/user/week-plan — add or remove a recipe from the plan ─────────

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { recipeId, action } = body as { recipeId?: string; action?: 'add' | 'remove' | 'clear' }

  // Ensure user row exists
  await db.insert(users).values({ id: userId }).onConflictDoNothing()

  if (action === 'clear') {
    await db.update(users).set({ weekPlan: [], groceryList: '' }).where(eq(users.id, userId))
    return NextResponse.json({ ok: true, weekPlan: [], inPlan: false })
  }

  if (!recipeId || typeof recipeId !== 'string') {
    return NextResponse.json({ error: 'Missing recipeId' }, { status: 400 })
  }

  const rows = await db.select({ weekPlan: users.weekPlan }).from(users).where(eq(users.id, userId)).limit(1)
  const current: string[] = rows[0]?.weekPlan ?? []
  const isInPlan = current.includes(recipeId)

  let updated: string[]
  if (action === 'remove' || isInPlan) {
    updated = current.filter((id) => id !== recipeId)
  } else {
    updated = [...current, recipeId]
  }

  await db.update(users).set({ weekPlan: updated }).where(eq(users.id, userId))

  return NextResponse.json({ ok: true, weekPlan: updated, inPlan: updated.includes(recipeId) })
}
