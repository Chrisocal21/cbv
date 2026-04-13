import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, submissions, users, staffActivity, promptTemplates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { runCourtReview } from '@/lib/court-review'
import { isStaffPersona, STAFF_PERSONAS, buildStaffPrompt } from '@/lib/staff'
import { getBudgetStatus } from '@/lib/budget'
import { randomUUID } from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const GRADIENTS = [
  'from-orange-800 to-amber-600',
  'from-stone-700 to-amber-800',
  'from-yellow-700 to-amber-500',
  'from-stone-600 to-amber-700',
  'from-amber-700 to-orange-600',
  'from-amber-900 to-yellow-600',
  'from-emerald-800 to-teal-600',
  'from-sky-800 to-indigo-700',
  'from-rose-800 to-pink-600',
  'from-violet-800 to-purple-600',
]

// Per-persona system prompts — lazy fallback, now replaced by buildStaffPrompt below
const PERSONA_SYSTEMS: Record<string, string> = {
  marco: `You are Marco, Executive Chef at Cookbookverse. You create bold, globally-inspired recipes with confident flavour and technique. Your writing is evocative and slightly poetic — you describe food like you love it. You specialise in global cuisine, fusion, and flavour development.

Generate a single complete recipe for the Cookbookverse platform. Write in Marco's voice: confident, direct, a little poetic about ingredients. Not the Baking Alchemy collection — that belongs to Céleste.`,

  celeste: `You are Céleste, Pastry & Baking Lead at Cookbookverse. You create baking and pastry recipes for the Baking Alchemy collection. Your writing is precise and encouraging — you treat baking as the science it is while making it feel achievable. You give extra attention to technique steps, timing, and visual cues.

Generate a single complete recipe for the Baking Alchemy collection. Write in Céleste's voice: precise, warm, respectful of the science. Every recipe must be in the Baking Alchemy collection.`,

  nadia: `You are Nadia, Dietary & Wellness Specialist at Cookbookverse. You create recipes that have clear dietary attributes — vegan, gluten-free, allergen-aware, or nutrition-forward. Your food is still delicious — you never sacrifice flavour for a label. Your writing is knowledgeable and inclusive, never preachy.

Generate a single complete recipe with at least one dietary tag (vegetarian, vegan, gluten-free, or dairy-free). Write in Nadia's voice: informed, warm, focused on making healthy eating genuinely appealing.`,
}

const RECIPE_JSON_SCHEMA = `Return valid JSON with this exact shape:
{
  "title": "string — evocative, specific name",
  "subtitle": "string — one short, enticing line",
  "description": "string — 2-3 sentence hook that makes you want to cook it",
  "collection": "one of: Culinary Journeys | Seasonal Sensations | Gourmet Guerillas | Quick & Creative | Baking Alchemy",
  "cuisine": "string — e.g. Italian, Japanese-inspired, Middle Eastern",
  "difficulty": "Easy | Intermediate | Advanced",
  "prepTime": "string — e.g. 15 min",
  "cookTime": "string — e.g. 30 min",
  "totalTime": "string — e.g. 45 min",
  "servings": "string — e.g. 4 or 2 to 4",
  "moodTags": ["array", "of", "mood", "strings"],
  "dietaryTags": ["only if applicable: vegetarian | vegan | gluten-free | dairy-free"],
  "ingredients": [
    { "group": "group name", "items": ["1 tbsp thing", "2 cups other thing"] }
  ],
  "steps": [
    { "title": "Step name", "body": "Clear instructions. Be precise about times, temps, and visual cues." }
  ],
  "nutrition": { "calories": 0, "protein": "0g", "carbs": "0g", "fat": "0g", "fiber": "0g" },
  "originStory": "string — 2-3 sentences about the dish's cultural or culinary context.",
  "gradient": "one of the provided options"
}

Rules:
- Steps must be specific enough to follow without prior knowledge
- Ingredient quantities must be exact
- Times must be realistic
- Don't invent fancy ingredients that are hard to source`

// POST /api/admin/staff/create-batch
// Body: { persona: 'marco' | 'celeste' | 'nadia', collection: string, count: 2-5, focus?: string }
export async function POST(req: NextRequest) {
  // Allow internal cron calls via CRON_SECRET header, otherwise require admin auth
  const cronKey = req.headers.get('x-cron-key')
  const isCron = process.env.CRON_SECRET && cronKey === process.env.CRON_SECRET

  let userId: string | null = null
  if (isCron) {
    userId = 'cron'
  } else {
    const clerkAuth = await auth()
    userId = clerkAuth.userId
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!userRows[0] || userRows[0].role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { persona, collection, count = 3, focus } = body

  // Budget enforcement
  const budget = await getBudgetStatus()
  if (budget.hardStop) {
    return NextResponse.json(
      { error: 'Monthly token budget at 95%+ — all creation paused.', budgetStatus: 'emergency', percentUsed: budget.percentUsed },
      { status: 429 }
    )
  }

  if (!isStaffPersona(persona)) {
    return NextResponse.json({ error: 'Invalid persona. Must be marco, celeste, or nadia.' }, { status: 400 })
  }
  if (!collection) {
    return NextResponse.json({ error: 'collection required' }, { status: 400 })
  }
  const safeCount = Math.min(5, Math.max(2, Number(count)))

  // Load system prompt — use buildStaffPrompt (with full craft + identity + skill) and fall back to
  // the legacy DB template or hardcoded default if something goes wrong
  const generationTask = persona === 'celeste' ? 'generate:baking' : persona === 'soren' ? 'generate:street' : 'generate'
  const templateRows = await db.select().from(promptTemplates).where(eq(promptTemplates.persona, persona)).limit(1)
  const builtPrompt = buildStaffPrompt(persona, generationTask)
  // Prefer the enriched buildStaffPrompt; fall back to DB/legacy only if somehow empty
  const personaSystem = builtPrompt || templateRows[0]?.systemPrompt || PERSONA_SYSTEMS[persona]
  const gradientOptions = GRADIENTS.join(' | ')
  const systemPrompt = `${personaSystem}\n\n${RECIPE_JSON_SCHEMA}\n\nGradient options: ${gradientOptions}`

  const results: {
    recipeId: string
    submissionId: string
    title: string
    slug: string
    confidenceScore: number
    recommendedAction: string
  }[] = []
  const errors: string[] = []

  for (let i = 0; i < safeCount; i++) {
    try {
      const userPrompt = focus
        ? `Create a recipe for the "${collection}" collection. Focus: ${focus}. Make it distinct from any you've already created this session.`
        : `Create a recipe for the "${collection}" collection. Make it distinct — varied cuisine, technique, or style from anything typical.`

      // Generate
      const generation = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.85,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const recipeData = JSON.parse(generation.choices[0]?.message?.content ?? '{}')
      const usage = generation.usage

      const slug =
        recipeData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-') +
        '-' +
        Date.now().toString(36)

      const recipeId = randomUUID()
      const submissionId = randomUUID()

      // Save recipe
      await db.insert(recipes).values({
        id: recipeId,
        slug,
        title: recipeData.title,
        subtitle: recipeData.subtitle ?? '',
        description: recipeData.description ?? '',
        collection: recipeData.collection ?? collection,
        cuisine: recipeData.cuisine ?? '',
        difficulty: recipeData.difficulty ?? 'Easy',
        prepTime: recipeData.prepTime ?? '',
        cookTime: recipeData.cookTime ?? '',
        totalTime: recipeData.totalTime ?? '',
        servings: recipeData.servings ?? '',
        moodTags: recipeData.moodTags ?? [],
        dietaryTags: recipeData.dietaryTags ?? [],
        ingredients: recipeData.ingredients ?? [],
        steps: recipeData.steps ?? [],
        nutrition: recipeData.nutrition ?? { calories: 0, protein: '0g', carbs: '0g', fat: '0g', fiber: '0g' },
        originStory: recipeData.originStory ?? '',
        gradient: recipeData.gradient ?? GRADIENTS[0],
        status: 'pending_review',
        aiGenerated: true,
        authorId: null,
        staffAuthor: persona,
        isFeatured: false,
      })

      // Theo QA pass
      const report = await runCourtReview(recipeData)

      // Save submission
      await db.insert(submissions).values({
        id: submissionId,
        recipeId,
        submittedBy: userId,
        techniqueVerdict: report.technique.verdict,
        techniqueNotes: report.technique.notes,
        flavourVerdict: report.flavour.verdict,
        flavourNotes: report.flavour.notes,
        homecookVerdict: report.homecook.verdict,
        homecookNotes: report.homecook.notes,
        criticVerdict: report.critic.verdict,
        criticNotes: report.critic.notes,
        criticIssues: report.critic.issues ?? [],
        confidenceScore: report.synthesis.confidenceScore,
        synthesisNotes: report.synthesis.synthesisNotes,
        recommendedAction:
          report.synthesis.recommendedAction === 'approve'
            ? 'pass'
            : report.synthesis.recommendedAction === 'reject'
            ? 'reject'
            : 'flag',
        adminReviewed: false,
      })

      // Log to staff_activity
      await db.insert(staffActivity).values({
        id: randomUUID(),
        persona,
        actionType: 'generate',
        recipeId,
        tokensInput: usage?.prompt_tokens ?? 0,
        tokensOutput: usage?.completion_tokens ?? 0,
        outcome: 'created',
        notes: `"${recipeData.title}" · confidence ${report.synthesis.confidenceScore}`,
      })

      results.push({
        recipeId,
        submissionId,
        title: recipeData.title,
        slug,
        confidenceScore: report.synthesis.confidenceScore,
        recommendedAction: report.synthesis.recommendedAction,
      })
    } catch (e) {
      errors.push(`Recipe ${i + 1}: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({
    persona,
    personaName: STAFF_PERSONAS[persona].name,
    collection,
    requested: safeCount,
    created: results.length,
    results,
    errors,
    budgetStatus: budget.softStop ? 'warning' : 'ok',
    percentUsed: Math.round(budget.percentUsed),
  })
}
