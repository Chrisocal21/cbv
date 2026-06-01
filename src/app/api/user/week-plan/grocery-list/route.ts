import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, recipes } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

type Ingredient = { group: string; items: string[] }
type GroceryItem = { id: string; text: string; checked: boolean }

const MAX_ITEMS = 300

function clean(s: string) {
  return s.trim().replace(/\s+/g, ' ').slice(0, 200)
}

// ─── POST /api/user/week-plan/grocery-list ────────────────────────────────────
// Flattens every ingredient from the recipes in the user's week plan and adds
// them (deduplicated) to the one grocery checklist. Returns how many were added.

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.insert(users).values({ id: userId }).onConflictDoNothing()

  const row = await db
    .select({ weekPlan: users.weekPlan, groceryItems: users.groceryItems })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const weekPlanIds: string[] = row[0]?.weekPlan ?? []
  const existing: GroceryItem[] = row[0]?.groceryItems ?? []

  if (weekPlanIds.length === 0) {
    return NextResponse.json({ error: 'No recipes in week plan' }, { status: 400 })
  }

  const planRecipes = await db
    .select({ ingredients: recipes.ingredients })
    .from(recipes)
    .where(inArray(recipes.id, weekPlanIds))

  const incoming = planRecipes
    .flatMap((r) => (r.ingredients as Ingredient[]).flatMap((g) => g.items))
    .map(clean)
    .filter(Boolean)

  const seen = new Set(existing.map((i) => i.text.toLowerCase()))
  const added: GroceryItem[] = []
  for (const text of incoming) {
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    added.push({ id: crypto.randomUUID(), text, checked: false })
  }

  const items = [...existing, ...added].slice(0, MAX_ITEMS)
  await db.update(users).set({ groceryItems: items }).where(eq(users.id, userId))

  return NextResponse.json({ added: added.length, total: items.length })
}
