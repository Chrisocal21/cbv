import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { recipes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateImagePrompt, type ImagePromptMode } from '@/lib/image-prompt'

export const maxDuration = 60 // allow up to 60s for DALL-E + blob upload

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify admin — users.id is the Clerk ID
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { recipeId, mode = 'real' } = await req.json()
  if (!recipeId) return NextResponse.json({ error: 'recipeId required' }, { status: 400 })

  const [recipe] = await db
    .select({ id: recipes.id, title: recipes.title, cuisine: recipes.cuisine, ingredients: recipes.ingredients })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1)
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })

  const prompt = generateImagePrompt(recipe, mode as ImagePromptMode)

  const imageRes = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1792x1024',
    quality: 'hd',
    response_format: 'url',
  })

  const tempUrl = imageRes.data?.[0]?.url
  if (!tempUrl) return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })

  // Fetch the image bytes (DALL-E URLs expire in ~1 hour, so we store it ourselves)
  const imageBytes = await fetch(tempUrl).then((r) => r.arrayBuffer())

  // Upload to Vercel Blob
  const filename = `recipes/${recipeId}-${Date.now()}.png`
  const { url } = await put(filename, imageBytes, {
    access: 'public',
    contentType: 'image/png',
  })

  // Save URL to recipe row
  await db.update(recipes).set({ imageUrl: url }).where(eq(recipes.id, recipeId))

  return NextResponse.json({ ok: true, imageUrl: url })
}
