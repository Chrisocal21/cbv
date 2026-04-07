import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { recipes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const maxDuration = 60 // allow up to 60s for DALL-E + blob upload

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify admin — users.id is the Clerk ID
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { recipeId, style = 'ingredients' } = await req.json()
  if (!recipeId) return NextResponse.json({ error: 'recipeId required' }, { status: 400 })

  const [recipe] = await db.select({ id: recipes.id, title: recipes.title, description: recipes.description, cuisine: recipes.cuisine })
    .from(recipes).where(eq(recipes.id, recipeId)).limit(1)
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })

  // Two prompt modes switchable from the admin panel
  const prompt = style === 'ingredients'
    // Flat-lay raw ingredients — more reliable, less "AI fake" look
    ? `Overhead flat-lay food photography of the raw ingredients for ${recipe.title} (${recipe.cuisine} cuisine). Fresh, whole ingredients arranged loosely on a worn wooden chopping board or aged marble surface. Natural diffused daylight, soft shadows. Shot on a 50mm lens from directly above. Ingredients look real, slightly imperfect, not perfectly arranged. Herbs, spices, vegetables, and proteins laid out naturally as if someone just set them out to prep. Muted, warm, editorial colour grading. No text, no people, no utensils, no finished dish. Photorealistic photograph only.`
    // Finished dish — enhanced editorial style
    : `Editorial food photograph of ${recipe.title}, ${recipe.cuisine} cuisine. Shot on a dark moody background — slate, charcoal linen, or deep walnut wood. The finished dish is plated simply in a wide shallow bowl or on a ceramic plate. Dramatic side lighting, deep shadows, small highlight catching the texture of the food. One or two minimal garnishes only — a herb sprig, a drizzle. Intimate close-up, f/1.4 bokeh. Colour palette: deep, rich, warm tones. Michelin-level food photography aesthetic. No people, no text, no watermarks. Photorealistic photograph, not illustration.`

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
