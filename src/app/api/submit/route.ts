import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, submissions } from '@/lib/db/schema'
import { randomUUID } from 'crypto'

// ─── POST /api/submit ──────────────────────────────────────────────────────────
// Creates a recipe row (status: pending_review) and a corresponding submission row,
// then fires the Court of Chefs review asynchronously (does not block response).

export async function POST(req: NextRequest) {
  const { userId } = await getAuth(req)
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await req.json()
  const {
    title, subtitle, description, collection, cuisine,
    moodTags, dietaryTags, difficulty, prepTime, cookTime, totalTime,
    servings, ingredients, steps, nutrition, originStory,
  } = body

  // Basic validation
  if (!title || !description || !collection || !cuisine || !difficulty) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const recipeId = randomUUID()
  const submissionId = randomUUID()
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    + '-' + recipeId.slice(0, 6)

  // Insert recipe row with status = pending_review
  await db.insert(recipes).values({
    id: recipeId,
    slug,
    title,
    subtitle: subtitle ?? '',
    description,
    collection,
    cuisine,
    moodTags: moodTags ?? [],
    dietaryTags: dietaryTags ?? [],
    difficulty,
    prepTime: prepTime ?? '',
    cookTime: cookTime ?? '',
    totalTime: totalTime ?? '',
    servings: servings ?? '',
    ingredients: ingredients ?? [],
    steps: steps ?? [],
    nutrition: nutrition ?? { calories: 0, protein: '0g', carbs: '0g', fat: '0g', fiber: '0g' },
    originStory: originStory ?? '',
    gradient: 'from-stone-700 to-amber-700',
    status: 'pending_review',
    aiGenerated: false,
    authorId: userId,
    isFeatured: false,
  })

  // Insert placeholder submission row
  await db.insert(submissions).values({
    id: submissionId,
    recipeId,
    submittedBy: userId,
    adminReviewed: false,
    adminDecision: null,
    adminNotes: null,
  })

  // Fire Court of Chefs review in the background (non-blocking)
  const reviewPayload = {
    title, subtitle, description, collection, cuisine,
    moodTags, dietaryTags, difficulty, prepTime, cookTime, totalTime,
    servings, ingredients, steps, nutrition, originStory,
  }

  // We call our own review endpoint — avoids duplicating the judge logic
  const reviewUrl = new URL('/api/review', req.url)
  fetch(reviewUrl.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recipe: reviewPayload }),
  })
    .then((r) => r.json())
    .then(async (report) => {
      const { technique, flavour, homecook, synthesis } = report as {
        technique: { verdict: string; notes: string }
        flavour: { verdict: string; notes: string }
        homecook: { verdict: string; notes: string }
        synthesis: { recommendedAction: string; confidenceScore: number; synthesisNotes: string }
      }

      const { eq } = await import('drizzle-orm')
      await db
        .update(submissions)
        .set({
          techniqueVerdict: technique.verdict as 'pass' | 'flag' | 'reject',
          techniqueNotes: technique.notes,
          flavourVerdict: flavour.verdict as 'pass' | 'flag' | 'reject',
          flavourNotes: flavour.notes,
          homecookVerdict: homecook.verdict as 'pass' | 'flag' | 'reject',
          homecookNotes: homecook.notes,
          confidenceScore: synthesis.confidenceScore,
          synthesisNotes: synthesis.synthesisNotes,
          recommendedAction: synthesis.recommendedAction as 'pass' | 'flag' | 'reject',
        })
        .where(eq(submissions.id, submissionId))
    })
    .catch((e) => console.error('[court-of-chefs] review failed:', e))

  return NextResponse.json({ submissionId, recipeId, slug }, { status: 201 })
}
