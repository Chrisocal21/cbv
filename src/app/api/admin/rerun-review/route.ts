import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, submissions, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { runCourtReview } from '@/lib/court-review'

// ─── POST /api/admin/rerun-review ─────────────────────────────────────────────
// Re-fires the Court of Chefs review for a submission that has no verdicts yet.

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { submissionId } = await req.json()
  if (!submissionId) return NextResponse.json({ error: 'submissionId required' }, { status: 400 })

  // Fetch the submission + recipe
  const subRows = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1)
  const sub = subRows[0]
  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  const recipeRows = await db.select().from(recipes).where(eq(recipes.id, sub.recipeId)).limit(1)
  const recipe = recipeRows[0]
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })

  // Run the court review directly (no HTTP self-fetch)
  const report = await runCourtReview({
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
  })

  await db.update(submissions).set({
    techniqueVerdict: report.technique.verdict,
    techniqueNotes: report.technique.notes,
    flavourVerdict: report.flavour.verdict,
    flavourNotes: report.flavour.notes,
    homecookVerdict: report.homecook.verdict,
    homecookNotes: report.homecook.notes,
    confidenceScore: report.synthesis.confidenceScore,
    synthesisNotes: report.synthesis.synthesisNotes,
    recommendedAction: report.synthesis.recommendedAction === 'approve' ? 'pass' : report.synthesis.recommendedAction === 'reject' ? 'reject' : 'flag',
  }).where(eq(submissions.id, submissionId))

  return NextResponse.json({ report })
}
