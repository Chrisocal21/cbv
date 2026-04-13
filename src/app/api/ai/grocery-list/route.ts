import OpenAI from 'openai'
import { buildStaffPrompt } from '@/lib/staff'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type Ingredient = { group: string; items: string[] }

export async function POST(req: Request) {
  const { title, servings, ingredients } = await req.json() as {
    title: string
    servings: string
    ingredients: Ingredient[]
  }

  if (!title || !Array.isArray(ingredients) || ingredients.length === 0) {
    return new Response('Invalid request', { status: 400 })
  }

  const flatIngredients = ingredients
    .flatMap((g) => g.items)
    .join('\n')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: buildStaffPrompt('nadia', 'grocery-list') },
      { role: 'user', content: `Recipe: "${title}" (serves ${servings})\n\nIngredients:\n${flatIngredients}` },
    ],
    max_tokens: 500,
    temperature: 0.3,
  })

  const list = completion.choices[0]?.message?.content ?? ''
  return Response.json({ list })
}
