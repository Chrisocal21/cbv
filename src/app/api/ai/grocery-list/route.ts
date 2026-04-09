import OpenAI from 'openai'

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

  const prompt = `You are creating a grocery list for someone who wants to cook "${title}" (serves ${servings}).

Here are the ingredients from the recipe:
${flatIngredients}

Reorganise these into a clean grocery list grouped by shopping category (e.g. Produce, Protein, Dairy, Pantry, Spices). 
Remove duplicate pantry staples like "salt", "pepper", and "oil" unless specific types are needed.
Use concise, plain English. No intro text — just the categorised list.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.3,
  })

  const list = completion.choices[0]?.message?.content ?? ''
  return Response.json({ list })
}
