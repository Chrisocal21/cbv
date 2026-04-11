import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recipes, submissions, users, staffActivity, collections } from '@/lib/db/schema'
import { eq, and, gte, sum, count, sql } from 'drizzle-orm'
import { STAFF_PERSONAS, isStaffPersona } from '@/lib/staff'
import { getBudgetStatus } from '@/lib/budget'

// GET /api/admin/digest — Ellis's weekly kitchen digest

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Date windows ────────────────────────────────────────────────────────────

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // ── Collection counts (published recipes) ───────────────────────────────────

  const allCollections = await db.select({ name: collections.name }).from(collections)
  const collectionNames = allCollections.map((c) => c.name)

  const publishedRows = await db
    .select({ collection: recipes.collection, count: count() })
    .from(recipes)
    .where(eq(recipes.status, 'published'))
    .groupBy(recipes.collection)

  const collectionMap = new Map(publishedRows.map((r) => [r.collection, r.count]))

  const THRESHOLD = 8 // collections below this get flagged by Ellis
  const collectionCounts = collectionNames.map((name) => ({
    name,
    count: collectionMap.get(name) ?? 0,
    gap: (collectionMap.get(name) ?? 0) < THRESHOLD,
  }))

  const gaps = collectionCounts.filter((c) => c.gap)

  // ── Created this week ────────────────────────────────────────────────────────

  const createdThisWeek = await db
    .select({ count: count() })
    .from(recipes)
    .where(
      and(
        eq(recipes.aiGenerated, true),
        gte(recipes.createdAt, weekAgo),
      )
    )

  // ── Submissions reviewed this week ──────────────────────────────────────────

  const reviewedThisWeek = await db
    .select({ count: count() })
    .from(submissions)
    .where(
      and(
        eq(submissions.adminReviewed, true),
        gte(submissions.reviewedAt, weekAgo),
      )
    )

  // ── Pending queue ────────────────────────────────────────────────────────────

  const pendingQueue = await db
    .select({ count: count() })
    .from(submissions)
    .where(eq(submissions.adminReviewed, false))

  // ── Token usage this month (from staff_activity) ────────────────────────────

  const tokenRows = await db
    .select({
      persona: staffActivity.persona,
      totalIn: sum(staffActivity.tokensInput),
      totalOut: sum(staffActivity.tokensOutput),
    })
    .from(staffActivity)
    .where(gte(staffActivity.createdAt, monthStart))
    .groupBy(staffActivity.persona)

  const tokensByPersona = tokenRows.map((r) => ({
    persona: r.persona,
    name: isStaffPersona(r.persona)
      ? STAFF_PERSONAS[r.persona].name
      : r.persona.charAt(0).toUpperCase() + r.persona.slice(1),
    tokensIn: Number(r.totalIn ?? 0),
    tokensOut: Number(r.totalOut ?? 0),
    total: Number(r.totalIn ?? 0) + Number(r.totalOut ?? 0),
  }))

  const totalTokensThisMonth = tokensByPersona.reduce((acc, r) => acc + r.total, 0)

  // ── Per-persona outcome stats (this month) ───────────────────────────────────

  const outcomeRows = await db
    .select({
      persona: staffActivity.persona,
      outcome: staffActivity.outcome,
      total: count(),
    })
    .from(staffActivity)
    .where(gte(staffActivity.createdAt, monthStart))
    .groupBy(staffActivity.persona, staffActivity.outcome)

  type OutcomeCounts = { created: number; pass: number; flag: number; reject: number; total: number }
  const outcomeMap = new Map<string, OutcomeCounts>()
  for (const row of outcomeRows) {
    if (!outcomeMap.has(row.persona)) {
      outcomeMap.set(row.persona, { created: 0, pass: 0, flag: 0, reject: 0, total: 0 })
    }
    const entry = outcomeMap.get(row.persona)!
    const key = row.outcome as keyof OutcomeCounts
    if (key in entry) entry[key] += row.total
    entry.total += row.total
  }

  const personaStats = Array.from(outcomeMap.entries()).map(([persona, outcomes]) => ({
    persona,
    name: isStaffPersona(persona)
      ? STAFF_PERSONAS[persona].name
      : persona.charAt(0).toUpperCase() + persona.slice(1),
    outcomes,
    flagRate: outcomes.total > 0 ? Math.round((outcomes.flag / outcomes.total) * 100) : 0,
    rejectRate: outcomes.total > 0 ? Math.round((outcomes.reject / outcomes.total) * 100) : 0,
  }))

  // ── Staff activity this week ─────────────────────────────────────────────────

  const recentActivity = await db
    .select({
      persona: staffActivity.persona,
      actionType: staffActivity.actionType,
      outcome: staffActivity.outcome,
      notes: staffActivity.notes,
      createdAt: staffActivity.createdAt,
    })
    .from(staffActivity)
    .where(gte(staffActivity.createdAt, weekAgo))
    .orderBy(sql`${staffActivity.createdAt} DESC`)
    .limit(20)

  return NextResponse.json({
    generatedAt: now.toISOString(),
    week: {
      recipesCreated: createdThisWeek[0]?.count ?? 0,
      submissionsReviewed: reviewedThisWeek[0]?.count ?? 0,
      pendingQueue: pendingQueue[0]?.count ?? 0,
    },
    collections: collectionCounts,
    gaps,
    tokens: {
      thisMonth: totalTokensThisMonth,
      byPersona: tokensByPersona,
    },
    personaStats,
    budgetPercent: Math.round((totalTokensThisMonth / 500000) * 100),
    recentActivity,
  })
}
