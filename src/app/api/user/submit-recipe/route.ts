import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, submissions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { runCourtReview } from '@/lib/court-review'

// ─── POST /api/user/submit-recipe ─────────────────────────────────────────────
// Submits an existing draft recipe for review.
// Verifies the recipe is owned by the current user and is still a draft.

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { recipeId } = await req.json()
  if (!recipeId) {
    return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })
  }

  // Fetch the recipe and verify ownership + draft status
  const rows = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.authorId, userId)))
    .limit(1)

  const recipe = rows[0]
  if (!recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }
  if (recipe.status !== 'draft') {
    return NextResponse.json({ error: 'Recipe is not a draft' }, { status: 409 })
  }

  // Update status to pending_review
  await db.update(recipes).set({ status: 'pending_review' }).where(eq(recipes.id, recipeId))

  // Create submission row
  const submissionId = randomUUID()
  await db.insert(submissions).values({
    id: submissionId,
    recipeId,
    submittedBy: userId,
    adminReviewed: false,
    adminDecision: null,
    adminNotes: null,
  })

  // Fire Court of Chefs review asynchronously (non-blocking)
  const reviewPayload = {
    title: recipe.title,
    subtitle: recipe.subtitle,
    description: recipe.description,
    collection: recipe.collection,
    cuisine: recipe.cuisine,
    moodTags: recipe.moodTags,
    dietaryTags: recipe.dietaryTags,
    difficulty: recipe.difficulty,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    totalTime: recipe.totalTime,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    nutrition: recipe.nutrition,
    originStory: recipe.originStory,
  }

  // Run court review in the background (non-blocking)
  runCourtReview(reviewPayload)
    .then(async (report) => {
      await db
        .update(submissions)
        .set({
          techniqueVerdict: report.technique.verdict,
          techniqueNotes: report.technique.notes,
          flavourVerdict: report.flavour.verdict,
          flavourNotes: report.flavour.notes,
          homecookVerdict: report.homecook.verdict,
          homecookNotes: report.homecook.notes,
          confidenceScore: report.synthesis.confidenceScore,
          synthesisNotes: report.synthesis.synthesisNotes,
          recommendedAction: report.synthesis.recommendedAction === 'approve' ? 'pass' : report.synthesis.recommendedAction === 'reject' ? 'reject' : 'flag',
        })
        .where(eq(submissions.id, submissionId))
    })
    .catch((e) => console.error('[court-of-chefs] review failed:', e))

  return NextResponse.json({ submissionId }, { status: 201 })
}
