import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, users } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { buildStaffPrompt } from '@/lib/staff'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const mode: 'surprise' | 'bold' | 'yours' | 'wild' | 'v1archive' = body.mode ?? 'surprise'

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

  // Each suggestion mode is owned by a specific persona
  type ModeConfig = { persona: Parameters<typeof buildStaffPrompt>[0]; task: Parameters<typeof buildStaffPrompt>[1]; temperature: number }
  const modeConfig: Record<typeof mode, ModeConfig> = {
    surprise:   { persona: 'marco',  task: 'suggest:gap',   temperature: 1.1 },
    bold:       { persona: 'marco',  task: 'suggest:bold',  temperature: 1.2 },
    yours:      { persona: 'nadia',  task: 'suggest',       temperature: 0.9 },
    wild:       { persona: 'soren',  task: 'suggest:wild',  temperature: 1.3 },
    v1archive:  { persona: 'marco',  task: 'suggest:gap',   temperature: 1.1 }, // fallback, never reached
  }

  const { persona, task, temperature } = modeConfig[mode]
  const systemPrompt = buildStaffPrompt(persona, task, baseContext)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature,
    max_tokens: 120,
    messages: [{ role: 'system', content: systemPrompt }],
  })

  const suggestion = completion.choices[0]?.message?.content?.trim() ?? ''
  if (!suggestion) return NextResponse.json({ error: 'No suggestion generated' }, { status: 500 })

  return NextResponse.json({ prompt: suggestion })
}
