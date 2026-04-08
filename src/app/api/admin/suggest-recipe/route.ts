import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, users } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch all published recipe titles + cuisines to give GPT the full picture
  const existing = await db
    .select({ title: recipes.title, cuisine: recipes.cuisine })
    .from(recipes)
    .where(inArray(recipes.status, ['published', 'pending_review']))

  const existingList = existing
    .map((r) => `${r.title} (${r.cuisine})`)
    .join('\n')

  const systemPrompt = `You are a creative director for Cookbookverse — an editorial food platform. Your job is to suggest the NEXT recipe to generate.

Here are all the recipes already on the platform:
${existingList || '(none yet)'}

Pick something that:
- Has NOT been done yet (by title or close variation)
- Is NOT a minor variant of an existing recipe (e.g. don't suggest "Lemon Herb Chicken" if "Garlic Herb Chicken" already exists)
- Fills a genuine gap: consider missing cuisines, missing dietary styles, missing meal occasions
- Is specific and interesting — not generic ("pasta with sauce")
- Would feel like a natural edition to the existing collection

Return ONLY a short prompt string (1-2 sentences max) as the user would type it into the generator text field.
Do not include any explanation, prefix, or markdown. Just the raw prompt text.

Example output:
A warming Vietnamese pho broth with rice noodles, soft-boiled egg, and fresh herbs — a proper Saturday morning bowl

Another example:
Spiced Moroccan lamb flatbreads with harissa yoghurt and pickled red onion — fast enough for a weeknight`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 1.1,
    max_tokens: 120,
    messages: [{ role: 'system', content: systemPrompt }],
  })

  const suggestion = completion.choices[0]?.message?.content?.trim() ?? ''
  if (!suggestion) return NextResponse.json({ error: 'No suggestion generated' }, { status: 500 })

  return NextResponse.json({ prompt: suggestion })
}
