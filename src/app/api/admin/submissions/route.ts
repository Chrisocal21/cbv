import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { submissions, recipes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// ─── GET /api/admin/submissions — list all pending submissions with recipe data

export async function GET(req: NextRequest) {
  const { userId } = await getAuth(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin role
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({
      submission: submissions,
      recipe: recipes,
    })
    .from(submissions)
    .innerJoin(recipes, eq(submissions.recipeId, recipes.id))
    .where(eq(submissions.adminReviewed, false))
    .orderBy(submissions.submittedAt)

  return NextResponse.json(rows)
}
