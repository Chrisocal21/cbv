import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, submissions, users, staffActivity } from '@/lib/db/schema'
import { isStaffPersona, buildStaffPrompt } from '@/lib/staff'
import { eq } from 'drizzle-orm'
import { runCourtReview } from '@/lib/court-review'
import { randomUUID } from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const COLLECTIONS = ['Culinary Journeys', 'Seasonal Sensations', 'Gourmet Guerillas', 'Quick & Creative', 'Baking Alchemy']
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

// The platform format requirement — persona voice is prepended at call time via buildStaffPrompt
const RECIPE_FORMAT = `Generate a single complete recipe based on the user's prompt. Return valid JSON matching this exact shape:

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
  "nutrition": {
    "calories": 0,
    "protein": "0g",
    "carbs": "0g",
    "fat": "0g",
    "fiber": "0g"
  },
  "originStory": "string — 2-3 sentences about the dish's cultural or culinary context. Optional but add when present.",
  "gradient": "one of the provided options"
}

Rules:
- Steps must be specific enough to follow without prior knowledge
- Ingredient quantities must be exact
- Times must be realistic
- Don't invent fancy ingredients that are hard to source
- Make it something someone would genuinely want to cook tonight`

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { prompt, attributeTo } = await req.json()
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
  }
  // Admin-generated recipes always belong to the platform (authorId: null).
  // The attributeTo toggle controls display credit only, not recipe ownership.
  const authorId = null
  const staffAuthor = isStaffPersona(attributeTo) ? attributeTo : null

  // Step 1: Generate recipe
  // Route to the persona's specific generation skill:
  //   soren  → generate:street  (global / street food focus)
  //   celeste → generate:baking (pastry & baking focus)
  //   all others → generate
  const generationTask =
    staffAuthor === 'soren'   ? 'generate:street' as const :
    staffAuthor === 'celeste' ? 'generate:baking' as const :
                                'generate' as const

  const gradientOptions = GRADIENTS.join(' | ')
  const generationSystem = buildStaffPrompt(
    staffAuthor ?? 'marco',
    generationTask,
    `${RECIPE_FORMAT}\n\nGradient options: ${gradientOptions}`,
  )

  let generation
  try {
    generation = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: generationSystem },
        { role: 'user', content: prompt },
      ],
    })
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    if (status === 429) {
      return NextResponse.json({ error: 'OpenAI quota exceeded — check your billing at platform.openai.com' }, { status: 503 })
    }
    throw err
  }

  const recipeData = JSON.parse(generation.choices[0]?.message?.content ?? '{}')

  // ── Step 2: Court review (runs in parallel internally) ────────────────────
  const report = await runCourtReview(recipeData)

  // ── Step 3: Auto-revision pass ────────────────────────────────────────────
  // If the court recommends revisions, fix the recipe NOW before saving —
  // so what lands in the DB is already the best version.
  let finalRecipe = recipeData
  if (report.synthesis.recommendedAction === 'revise') {
    // Collect all flagged issues across judges into one consolidated list
    const allIssues: string[] = [
      ...((report.critic.verdict !== 'pass' && report.critic.issues?.length) ? report.critic.issues : []),
      ...(report.technique.verdict !== 'pass' ? [report.technique.notes] : []),
      ...(report.flavour.verdict !== 'pass' ? [report.flavour.notes] : []),
      ...(report.homecook.verdict !== 'pass' ? [report.homecook.notes] : []),
    ].filter(Boolean)

    if (allIssues.length > 0) {
      try {
        const issuesList = allIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')
        const revisionResult = await openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.4,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: buildStaffPrompt(staffAuthor ?? 'marco', 'apply-critic') },
            {
              role: 'user',
              content: `Recipe:\n${JSON.stringify(recipeData, null, 2)}\n\nQA reviewer notes:\n${report.synthesis.synthesisNotes}\n\nSpecific issues to fix:\n${issuesList}`,
            },
          ],
        })
        const revised = JSON.parse(revisionResult.choices[0]?.message?.content ?? '{}')
        if (revised.title) finalRecipe = revised
      } catch {
        // Non-fatal — if revision fails, proceed with original draft
      }
    }
  }

  // ── Step 4: Theo writes origin story if missing ───────────────────────────
  if (!finalRecipe.originStory || finalRecipe.originStory.trim().length < 60) {
    try {
      const originSystem = buildStaffPrompt('theo', 'origin-story')
      const originResult = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 200,
        messages: [
          { role: 'system', content: originSystem },
          {
            role: 'user',
            content: `Write a 2–3 sentence origin story for this recipe:\nTitle: ${finalRecipe.title}\nCuisine: ${finalRecipe.cuisine}\nDescription: ${finalRecipe.description}`,
          },
        ],
      })
      const originText = originResult.choices[0]?.message?.content?.trim()
      if (originText) finalRecipe.originStory = originText
    } catch {
      // Non-fatal — proceed without origin story if Theo's call fails
    }
  }

  // Build slug from title
  const slug = finalRecipe.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    + '-' + Date.now().toString(36)

  const recipeId = randomUUID()
  const submissionId = randomUUID()

  // ── Step 5: Save the finished recipe to DB ────────────────────────────────
  await db.insert(recipes).values({
    id: recipeId,
    slug,
    title: finalRecipe.title,
    subtitle: finalRecipe.subtitle ?? '',
    description: finalRecipe.description ?? '',
    collection: finalRecipe.collection,
    cuisine: finalRecipe.cuisine ?? '',
    difficulty: finalRecipe.difficulty,
    prepTime: finalRecipe.prepTime ?? '',
    cookTime: finalRecipe.cookTime ?? '',
    totalTime: finalRecipe.totalTime ?? '',
    servings: finalRecipe.servings ?? '',
    moodTags: finalRecipe.moodTags ?? [],
    dietaryTags: finalRecipe.dietaryTags ?? [],
    ingredients: finalRecipe.ingredients ?? [],
    steps: finalRecipe.steps ?? [],
    nutrition: finalRecipe.nutrition ?? { calories: 0, protein: '0g', carbs: '0g', fat: '0g', fiber: '0g' },
    originStory: finalRecipe.originStory ?? '',
    gradient: finalRecipe.gradient ?? GRADIENTS[0],
    status: 'pending_review',
    aiGenerated: true,
    authorId: null,
    staffAuthor,
    isFeatured: false,
  })

  // ── Step 6: Save submission with review record ────────────────────────────
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
    recommendedAction: report.synthesis.recommendedAction === 'approve' ? 'pass' : report.synthesis.recommendedAction === 'reject' ? 'reject' : 'flag',
    adminReviewed: false,
  })

  // Step 5: Log to staff activity
  const usage = generation.usage
  if (staffAuthor) {
    await db.insert(staffActivity).values({
      id: randomUUID(),
      persona: staffAuthor,
      actionType: 'generate',
      recipeId,
      tokensInput: usage?.prompt_tokens ?? 0,
      tokensOutput: usage?.completion_tokens ?? 0,
      outcome: 'created',
      notes: `"${recipeData.title}" · confidence ${report.synthesis.confidenceScore}`,
    })
  }

  return NextResponse.json({
    recipe: { ...finalRecipe, id: recipeId, slug },
    submissionId,
    report,
    attributeTo: attributeTo ?? 'cookbookverse',
  })
}
