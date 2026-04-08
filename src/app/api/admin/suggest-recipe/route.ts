import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, users } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const mode: 'surprise' | 'bold' | 'yours' | 'v1archive' = body.mode ?? 'surprise'

  // v1 archive — pick a random v1 dish concept and return it as a prompt without any AI call
  if (mode === 'v1archive') {
    const v1Dishes = [
      'Miso-glazed salmon fillets with a sweet-salty caramelized crust — a quick Japanese-inspired weeknight dinner',
      'Lamb kofta skewers with creamy tahini dipping sauce and warm flatbread — Middle Eastern street food at home',
      'Brown butter financiers — classic French almond cakes with a nutty, caramelized crumb',
      'Slow-roasted lamb shoulder braised with garlic, rosemary, and white wine until it falls apart — a proper Sunday centrepiece',
      'Pasta e fagioli — the Italian peasant soup of pasta and cannellini beans in a rich tomato and rosemary broth',
      'A classic sourdough country loaf with an open crumb, blistered crust, and complex tang — proper bread baking',
    ]
    const prompt = v1Dishes[Math.floor(Math.random() * v1Dishes.length)]
    return NextResponse.json({ prompt })
  }

  // Fetch all published recipe titles + cuisines to give GPT the full picture
  const existing = await db
    .select({ title: recipes.title, cuisine: recipes.cuisine })
    .from(recipes)
    .where(inArray(recipes.status, ['published', 'pending_review']))

  const existingList = existing
    .map((r) => `${r.title} (${r.cuisine})`)
    .join('\n')

  const baseContext = `Here are all the recipes already on the platform:\n${existingList || '(none yet)'}`

  const prompts: Record<typeof mode, string> = {
    surprise: `You are a creative director for Cookbookverse — an editorial food platform. Your job is to suggest the NEXT recipe to generate.

${baseContext}

Pick something that:
- Has NOT been done yet (by title or close variation)
- Fills a genuine gap: consider missing cuisines, missing dietary styles, missing meal occasions
- Is specific and interesting — not generic ("pasta with sauce")
- Would feel like a natural addition to the existing collection

Return ONLY a short prompt string (1-2 sentences max) as the user would type it. No explanation, no markdown.

Example: A warming Vietnamese pho broth with rice noodles, soft-boiled egg, and fresh herbs — a proper Saturday morning bowl`,

    bold: `You are a culinary explorer for Cookbookverse — an editorial food platform. Your job is to suggest something genuinely unexpected and adventurous.

${baseContext}

Pick something that:
- Comes from a cuisine or region that is underrepresented or NEVER featured on the platform — think lesser-known regional food traditions, street food cultures, or ingredients rarely seen in mainstream recipes
- Has ingredients or techniques most people have never tried
- Is the kind of recipe that makes someone stop scrolling — surprising, specific, maybe a little wild
- Has NOT been done or approximated by anything currently on the platform

Return ONLY a short prompt string (1-2 sentences max) as the user would type it. No explanation, no markdown.

Example: Hand-pulled Uyghur laghman noodles with lamb and charred pepper sauce — a proper Silk Road bowl`,

    yours: `You are a thoughtful editorial assistant for Cookbookverse — an editorial food platform. Your job is to suggest a recipe that would complement and extend what already exists.

${baseContext}

Look at what's already on the platform and suggest something that pairs naturally with it — a side dish, a snack, an appetiser, a dipping sauce, a salad, or a small plate that would round out an existing recipe or meal style.

Pick something that:
- Answers the question "what do I serve alongside X?" for something already on the platform
- Is a natural pairing — culturally appropriate, flavour-compatible
- Has NOT already been done
- Is specific — not a generic "green salad" but the actual salad you'd serve with that dish

Return ONLY a short prompt string (1-2 sentences max) as the user would type it. No explanation, no markdown.

Example: A crispy smacked cucumber salad with sesame oil, chilli flakes, and rice vinegar — the perfect sharp side for rich noodle dishes`,
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: mode === 'bold' ? 1.2 : mode === 'yours' ? 0.9 : 1.1,
    max_tokens: 120,
    messages: [{ role: 'system', content: prompts[mode] }],
  })

  const suggestion = completion.choices[0]?.message?.content?.trim() ?? ''
  if (!suggestion) return NextResponse.json({ error: 'No suggestion generated' }, { status: 500 })

  return NextResponse.json({ prompt: suggestion })
}
