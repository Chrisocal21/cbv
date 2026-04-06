import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recipes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// PATCH /api/user/recipes/[id] — recipe owner edits their own draft or rejected recipe
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify ownership
  const rows = await db.select().from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.authorId, userId)))
    .limit(1)

  const recipe = rows[0]
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only allow editing draft or rejected recipes
  if (recipe.status !== 'draft' && recipe.status !== 'rejected') {
    return NextResponse.json({ error: 'Only draft or rejected recipes can be edited' }, { status: 409 })
  }

  const body = await req.json() as {
    title?: string
    subtitle?: string
    description?: string
    cuisine?: string
    collection?: string
    difficulty?: string
    prepTime?: string
    cookTime?: string
    totalTime?: string
    servings?: string
    moodTags?: string[]
    dietaryTags?: string[]
    originStory?: string
    ingredients?: { group: string; items: string[] }[]
    steps?: { title: string; body: string }[]
  }

  const allowed = [
    'title', 'subtitle', 'description', 'cuisine', 'collection', 'difficulty',
    'prepTime', 'cookTime', 'totalTime', 'servings', 'moodTags', 'dietaryTags',
    'originStory', 'ingredients', 'steps',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key as keyof typeof body]
  }
  updates.updatedAt = new Date()

  const [updated] = await db.update(recipes).set(updates as never).where(eq(recipes.id, id)).returning()
  return NextResponse.json(updated)
}
