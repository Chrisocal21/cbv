import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, recipes, collections } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { buildStaffPrompt } from '@/lib/staff'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// POST /api/admin/theo-editorial
// body: { task: 'recipe-headline' | 'editorial-intro' | 'feature-pitch' | 'collection-intro', recipeId?, collectionId? }
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { task, recipeId, collectionId } = await req.json()

  const validTasks = ['recipe-headline', 'editorial-intro', 'feature-pitch', 'collection-intro']
  if (!validTasks.includes(task)) {
    return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 })
  }

  let userContent = ''

  if (task === 'collection-intro') {
    if (!collectionId) return NextResponse.json({ error: 'collectionId required' }, { status: 400 })
    const [col] = await db.select().from(collections).where(eq(collections.id, collectionId)).limit(1)
    if (!col) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    userContent = `Collection: "${col.name}"\nSlug: ${col.slug}\nCurrent description: ${col.description || '(none)'}`
  } else {
    if (!recipeId) return NextResponse.json({ error: 'recipeId required' }, { status: 400 })
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1)
    if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    userContent = `Title: ${recipe.title}
Subtitle: ${recipe.subtitle}
Description: ${recipe.description}
Collection: ${recipe.collection}
Cuisine: ${recipe.cuisine}
Difficulty: ${recipe.difficulty}
Total time: ${recipe.totalTime}
Origin story: ${recipe.originStory || '(none)'}
Dietary tags: ${(recipe.dietaryTags as string[])?.join(', ') || 'none'}
Mood tags: ${(recipe.moodTags as string[])?.join(', ') || 'none'}`
  }

  const isJson = task === 'recipe-headline'
  const systemPrompt = buildStaffPrompt('theo', task as Parameters<typeof buildStaffPrompt>[1])

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 400,
    ...(isJson ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? ''

  if (isJson) {
    try {
      const parsed = JSON.parse(raw)
      return NextResponse.json({ title: parsed.title, subtitle: parsed.subtitle })
    } catch {
      return NextResponse.json({ error: 'Failed to parse headline JSON', raw }, { status: 500 })
    }
  }

  return NextResponse.json({ text: raw.trim() })
}
