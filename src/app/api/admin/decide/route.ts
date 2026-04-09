import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { submissions, recipes, users, notifications } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// ─── POST /api/admin/decide — publish or reject a submission

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { submissionId, decision, notes } = await req.json()
  if (!submissionId || !['publish', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const submissionRows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!submissionRows[0]) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const sub = submissionRows[0]

  // Update submission record
  await db
    .update(submissions)
    .set({
      adminReviewed: true,
      adminDecision: decision,
      adminNotes: notes ?? null,
      reviewedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId))

  // Update recipe status
  const newStatus = decision === 'publish' ? 'published' : 'rejected'
  await db
    .update(recipes)
    .set({
      status: newStatus,
      publishedAt: decision === 'publish' ? new Date() : null,
    })
    .where(eq(recipes.id, sub.recipeId))

  // Notify the submitter
  if (decision === 'publish') {
    const recipeRows = await db.select({ title: recipes.title, slug: recipes.slug }).from(recipes).where(eq(recipes.id, sub.recipeId)).limit(1)
    const recipe = recipeRows[0]
    if (recipe) {
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: sub.submittedBy,
        type: 'recipe_published',
        message: `Your recipe "${recipe.title}" has been published!`,
        recipeId: sub.recipeId,
        recipeSlug: recipe.slug,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}
