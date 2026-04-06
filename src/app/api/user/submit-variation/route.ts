import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recipes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// POST /api/user/submit-variation
// Creates a new draft recipe that is a variation of an existing published recipe.
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { parentSlug, variationNote } = await req.json()
  if (!parentSlug) return NextResponse.json({ error: 'parentSlug required' }, { status: 400 })

  // Fetch the parent recipe
  const parent = await db.select().from(recipes).where(eq(recipes.slug, parentSlug)).limit(1).then((r) => r[0])
  if (!parent) return NextResponse.json({ error: 'Parent recipe not found' }, { status: 404 })
  if (parent.status !== 'published') return NextResponse.json({ error: 'Can only fork published recipes' }, { status: 409 })

  const id = randomUUID()
  const slug = `${parent.slug}-variation-${id.slice(0, 6)}`

  await db.insert(recipes).values({
    id,
    slug,
    title: `${parent.title} (my variation)`,
    subtitle: parent.subtitle,
    description: variationNote || parent.description,
    collection: parent.collection,
    cuisine: parent.cuisine,
    difficulty: parent.difficulty,
    prepTime: parent.prepTime,
    cookTime: parent.cookTime,
    totalTime: parent.totalTime,
    servings: parent.servings,
    moodTags: parent.moodTags,
    dietaryTags: parent.dietaryTags,
    ingredients: parent.ingredients,
    steps: parent.steps,
    nutrition: parent.nutrition,
    originStory: `Variation of "${parent.title}". ${variationNote || ''}`.trim(),
    gradient: parent.gradient,
    authorId: userId,
    aiGenerated: false,
    status: 'draft',
    parentId: parent.id,
    isVariation: true,
  })

  return NextResponse.json({ ok: true, slug })
}
