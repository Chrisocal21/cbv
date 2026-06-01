import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getAllRecipes } from '@/lib/queries'
import { rankRecipesByPantry } from '@/lib/pantry-match'

export const dynamic = 'force-dynamic'

const MAX_RESULTS = 60

/**
 * POST /api/user/fridge/matches
 *
 * Body: { pantry: string[] }
 *
 * Returns recipes from the published catalog ranked by how well they match
 * what the user has on hand (their grocery list), with a per-recipe
 * missing-ingredient signal.
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const pantry: string[] = Array.isArray(body?.pantry)
    ? body.pantry.filter((x: unknown): x is string => typeof x === 'string')
    : []

  if (pantry.length === 0) return NextResponse.json({ matches: [] })

  const recipes = await getAllRecipes()
  const ranked = rankRecipesByPantry(pantry, recipes)

  const matches = ranked.slice(0, MAX_RESULTS).map((r) => ({
    slug: r.slug,
    title: r.title,
    collection: r.collection,
    cuisine: r.cuisine,
    totalTime: r.totalTime,
    imageUrl: r.imageUrl,
    gradient: r.gradient,
    score: r.match.score,
    haveCount: r.match.haveCount,
    totalCount: r.match.totalCount,
    missing: r.match.missing,
  }))

  return NextResponse.json({ matches })
}
