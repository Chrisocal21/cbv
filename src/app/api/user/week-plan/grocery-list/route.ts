import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import { db } from '@/lib/db'
import { users, recipes } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { buildStaffPrompt } from '@/lib/staff'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type Ingredient = { group: string; items: string[] }

// ─── POST /api/user/week-plan/grocery-list ────────────────────────────────────
// Generates a deduplicated, categorised grocery list for all recipes in the
// week plan, cross-referenced against the user's fridge.

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await db
    .select({ weekPlan: users.weekPlan, fridgeIngredients: users.fridgeIngredients })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const weekPlanIds: string[] = row[0]?.weekPlan ?? []
  const fridge: string[] = row[0]?.fridgeIngredients ?? []

  if (weekPlanIds.length === 0) {
    return NextResponse.json({ error: 'No recipes in week plan' }, { status: 400 })
  }

  const planRecipes = await db
    .select({ title: recipes.title, servings: recipes.servings, ingredients: recipes.ingredients })
    .from(recipes)
    .where(inArray(recipes.id, weekPlanIds))

  const recipeBlocks = planRecipes.map((r) => {
    const flat = (r.ingredients as Ingredient[]).flatMap((g) => g.items).join(', ')
    return `"${r.title}" (serves ${r.servings}): ${flat}`
  }).join('\n')

  const fridgeNote = fridge.length > 0
    ? `\n\nUSER'S FRIDGE (already have these — flag or remove from list): ${fridge.join(', ')}`
    : ''

  const userMessage = `Generate a combined shopping list for these ${planRecipes.length} recipes:\n\n${recipeBlocks}${fridgeNote}\n\nDeduplicate ingredients across recipes. Group by category (Produce, Proteins, Dairy, Pantry, etc). Note quantities needed in total. Flag any items the user already has in their fridge with "(already have this)". Format as a clean checklist.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: buildStaffPrompt('nadia', 'grocery-list') },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 800,
    temperature: 0.3,
  })

  const list = completion.choices[0]?.message?.content ?? ''

  // Persist to user row so it survives navigation
  await db.update(users).set({ groceryList: list }).where(eq(users.id, userId))

  return NextResponse.json({ list })
}
