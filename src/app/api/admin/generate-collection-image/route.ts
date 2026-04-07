import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { collections, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Theme prompts per collection name fragment — fallback to generic food scene
const COLLECTION_PROMPTS: Record<string, string> = {
  'culinary journeys':
    'Overhead editorial food photograph of a richly coloured spread of international ingredients — saffron threads, dried chillies, whole spices, fresh herbs, a chunk of aged cheese, flatbread. Worn wooden surface, natural side light, deep warm tones. Real, imperfect, beautiful. No people, no text. Photorealistic.',
  'seasonal sensations':
    'Editorial food photograph of a generous arrangement of peak-season produce: bright summer tomatoes, wild herbs, stone fruit, edible flowers. Dappled natural light, pale linen surface. Feels honest and alive. No people, no text. Photorealistic.',
  'gourmet guerillas':
    'Close-up editorial photograph of a single precisely plated restaurant-quality dish in a wide bowl — elegant but unfussy. Dark slate surface, dramatic side lighting, small garnish catching the light. Michelin aesthetic. No people, no text. Photorealistic.',
  'quick & creative':
    'Overhead food photograph of a simple weeknight meal mid-prep — a wooden cutting board with sliced vegetables, a cast-iron pan nearby, a handful of herbs. Warm kitchen light, comfortable and inviting. No people, no text. Photorealistic.',
  'quick and creative':
    'Overhead food photograph of a simple weeknight meal mid-prep — a wooden cutting board with sliced vegetables, a cast-iron pan nearby, a handful of herbs. Warm kitchen light, comfortable and inviting. No people, no text. Photorealistic.',
  'baking alchemy':
    'Editorial photograph of artisan baking — a cracked sourdough loaf dusted in flour, a tart with golden pastry, a scatter of dark chocolate pieces, a bowl of caramelised sugar on aged marble. Soft diffused light, moody and warm. No people, no text. Photorealistic.',
}

function buildPrompt(name: string, description: string): string {
  const key = name.toLowerCase()
  for (const [fragment, prompt] of Object.entries(COLLECTION_PROMPTS)) {
    if (key.includes(fragment)) return prompt
  }
  // Fallback: derive from description
  return `Editorial overhead food photograph representing the theme: "${name}" — ${description}. Beautiful natural food photography on a textured surface. Warm, editorial colour grading. No people, no text, no title overlays. Photorealistic photograph.`
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { collectionId } = await req.json()
  if (!collectionId) return NextResponse.json({ error: 'collectionId required' }, { status: 400 })

  const [col] = await db.select().from(collections).where(eq(collections.id, collectionId)).limit(1)
  if (!col) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

  const prompt = buildPrompt(col.name, col.description)

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

  const imageBytes = await fetch(tempUrl).then((r) => r.arrayBuffer())

  const filename = `collections/${collectionId}-${Date.now()}.png`
  const { url } = await put(filename, imageBytes, {
    access: 'public',
    contentType: 'image/png',
  })

  await db.update(collections).set({ imageUrl: url }).where(eq(collections.id, collectionId))

  return NextResponse.json({ ok: true, imageUrl: url })
}
