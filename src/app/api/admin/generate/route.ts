import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, submissions, users } from '@/lib/db/schema'
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

const GENERATION_SYSTEM = `You are a world-class recipe writer for Cookbookverse — a curated, editorial food platform with high standards. Your recipes are warm, practical, and delicious. They read like they were written by a food editor, not an algorithm.

Generate a single complete recipe based on the user's prompt. Return valid JSON matching this exact shape:

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
  const { userId } = await getAuth(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { prompt } = await req.json()
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
  }

  // Step 1: Generate recipe
  const gradientOptions = GRADIENTS.join(' | ')
  const generation = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.8,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: GENERATION_SYSTEM + `\n\nGradient options: ${gradientOptions}` },
      { role: 'user', content: prompt },
    ],
  })

  const recipeData = JSON.parse(generation.choices[0]?.message?.content ?? '{}')

  // Build slug from title
  const slug = recipeData.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    + '-' + Date.now().toString(36)

  const recipeId = randomUUID()
  const submissionId = randomUUID()

  // Step 2: Save recipe to DB
  await db.insert(recipes).values({
    id: recipeId,
    slug,
    title: recipeData.title,
    subtitle: recipeData.subtitle ?? '',
    description: recipeData.description ?? '',
    collection: recipeData.collection,
    cuisine: recipeData.cuisine ?? '',
    difficulty: recipeData.difficulty,
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
    authorId: userId,
    isFeatured: false,
  })

  // Step 3: Run Court of Chefs review
  const report = await runCourtReview(recipeData)

  // Step 4: Save submission with verdicts
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
    confidenceScore: report.synthesis.confidenceScore,
    synthesisNotes: report.synthesis.synthesisNotes,
    recommendedAction: report.synthesis.recommendedAction === 'approve' ? 'pass' : report.synthesis.recommendedAction === 'reject' ? 'reject' : 'flag',
    adminReviewed: false,
  })

  return NextResponse.json({
    recipe: { ...recipeData, id: recipeId, slug },
    submissionId,
    report,
  })
}
