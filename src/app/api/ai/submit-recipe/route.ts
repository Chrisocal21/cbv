import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import { db } from '@/lib/db'
import { recipes, submissions, users } from '@/lib/db/schema'
import { randomUUID } from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const EXTRACT_SYSTEM = `You are a recipe parser. Examine the conversation and extract the most recently described full recipe into a JSON object with exactly these fields:
{
  "title": string,
  "subtitle": string (evocative, 5-10 words — infer if missing),
  "description": string (1-2 warm sentences),
  "collection": one of ["Culinary Journeys","Seasonal Sensations","Gourmet Guerillas","Quick & Creative","Baking Alchemy"],
  "cuisine": string,
  "difficulty": "Easy" | "Intermediate" | "Advanced",
  "prepTime": string (e.g. "15 mins"),
  "cookTime": string (e.g. "30 mins"),
  "totalTime": string (e.g. "45 mins"),
  "servings": string (e.g. "4"),
  "moodTags": string[] (2-4 short vibe/mood descriptors),
  "dietaryTags": string[] (e.g. ["Vegetarian"] — empty array if none apply),
  "ingredients": [{"group": string, "items": string[]}],
  "steps": [{"title": string, "body": string}],
  "nutrition": {"calories": number, "protein": string, "carbs": string, "fat": string, "fiber": string},
  "originStory": string (1-2 optional sentences about the dish; empty string if unknown)
}
Infer or generate sensible defaults for any missing fields. Return only valid JSON.`

// ─── POST /api/ai/submit-recipe ───────────────────────────────────────────────
// Extracts the recipe from a chat conversation, creates it with status
// pending_review, creates a submission row, and fires the Court of Chefs review.

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
  }

  // Extract structured recipe from the conversation
  const extraction = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACT_SYSTEM },
      ...messages,
    ],
    max_tokens: 2000,
    temperature: 0.3,
  })

  let recipe: Record<string, unknown>
  try {
    recipe = JSON.parse(extraction.choices[0].message.content ?? '{}')
  } catch {
    return NextResponse.json({ error: 'Failed to extract recipe' }, { status: 500 })
  }

  if (!recipe.title) {
    return NextResponse.json({ error: 'Could not identify a recipe in this conversation' }, { status: 422 })
  }

  const recipeId = randomUUID()
  const submissionId = randomUUID()
  const slug =
    String(recipe.title)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') +
    '-' + recipeId.slice(0, 6)

  const recipePayload = {
    title: String(recipe.title),
    subtitle: String(recipe.subtitle ?? ''),
    description: String(recipe.description ?? ''),
    collection: (recipe.collection ?? 'Culinary Journeys') as 'Culinary Journeys' | 'Seasonal Sensations' | 'Gourmet Guerillas' | 'Quick & Creative' | 'Baking Alchemy',
    cuisine: String(recipe.cuisine ?? 'International'),
    moodTags: (recipe.moodTags as string[]) ?? [],
    dietaryTags: (recipe.dietaryTags as string[]) ?? [],
    difficulty: (recipe.difficulty ?? 'Easy') as 'Easy' | 'Intermediate' | 'Advanced',
    prepTime: String(recipe.prepTime ?? ''),
    cookTime: String(recipe.cookTime ?? ''),
    totalTime: String(recipe.totalTime ?? ''),
    servings: String(recipe.servings ?? '4'),
    ingredients: (recipe.ingredients as { group: string; items: string[] }[]) ?? [],
    steps: (recipe.steps as { title: string; body: string }[]) ?? [],
    nutrition: (recipe.nutrition as { calories: number; protein: string; carbs: string; fat: string; fiber: string }) ?? {
      calories: 0, protein: '0g', carbs: '0g', fat: '0g', fiber: '0g',
    },
    originStory: String(recipe.originStory ?? ''),
  }

  await db.insert(recipes).values({
    id: recipeId,
    slug,
    ...recipePayload,
    gradient: 'from-stone-700 to-amber-700',
    status: 'pending_review',
    aiGenerated: true,
    authorId: userId,
    isFeatured: false,
  })

  await db.insert(submissions).values({
    id: submissionId,
    recipeId,
    submittedBy: userId,
    adminReviewed: false,
    adminDecision: null,
    adminNotes: null,
  })

  // Ensure user row exists (for first-time users)
  await db.insert(users).values({ id: userId }).onConflictDoNothing()

  // Fire Court of Chefs review in the background (non-blocking)
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  fetch(`${origin}/api/review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...recipePayload, submissionId }),
  }).catch(() => undefined)

  return NextResponse.json({ submissionId, recipeId, slug, title: recipe.title })
}
