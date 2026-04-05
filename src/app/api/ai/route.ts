import OpenAI from 'openai'
import { RECIPES } from '@/lib/data'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LIBRARY_SUMMARY = RECIPES.map(
  (r) =>
    `- "${r.title}" (slug: ${r.slug}) | ${r.cuisine} | ${r.collection} | ${r.difficulty} | ${r.totalTime} | tags: ${r.moodTags.join(', ')} | dietary: ${r.dietaryTags.join(', ') || 'none'}`
).join('\n')

const SYSTEM_PROMPT = `You are the AI Kitchen assistant for Cookbookverse, a thoughtful recipe platform. You help people figure out what to cook.

You operate in three modes — but you don't ask users to pick one. You infer the mode from what they say:
1. Ingredient mode: they list what they have. Suggest matching recipes or create one.
2. Mood/craving mode: they describe a feeling, occasion, or vibe. Find or suggest something that fits.
3. Dietary adaptation: they want a recipe modified for dietary needs.

RECIPE LIBRARY (always check this first before generating anything new):
${LIBRARY_SUMMARY}

RESPONSE RULES:
- Keep responses concise and warm. 2–4 short paragraphs max.
- If a library recipe matches, lead with it. Use the exact title and mention it's in the library. Link it like: [Recipe Name](/recipe/slug)
- If nothing in the library fits well, you can describe a recipe concept briefly and offer to generate the full thing.
- Never make up a library recipe that doesn't exist above.
- Don't be robotic. Talk like a knowledgeable friend in a kitchen, not a search engine.
- If the user is vague, ask one focused follow-up question before diving in.
- Never bullet-point everything. Use natural prose with occasional bold for recipe names.`

export async function POST(req: Request) {
  const { messages } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid request', { status: 400 })
  }

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    max_tokens: 500,
    temperature: 0.7,
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
