import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recipes, staffActivity, collections, platformSettings } from '@/lib/db/schema'
import { eq, and, count, gte, sql } from 'drizzle-orm'
import { getBudgetStatus } from '@/lib/budget'
import { randomUUID } from 'crypto'

// POST /api/cron/weekly-run — called by Vercel Cron 3x/day (7am, 1pm, 7pm UTC)
// daily_run_count setting controls how many of those fires actually do work
// Secured by CRON_SECRET header set in Vercel env
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET?.trim()}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const log: string[] = []
  const jobId = randomUUID()

  try {
    // 0. Check how many times Ellis has already run today
    const todayUTC = new Date()
    todayUTC.setUTCHours(0, 0, 0, 0)

    const [settingsRows, todayRunRows] = await Promise.all([
      db.select().from(platformSettings),
      db
        .select({ total: count() })
        .from(staffActivity)
        .where(
          and(
            eq(staffActivity.persona, 'ellis'),
            eq(staffActivity.actionType, 'digest'),
            gte(staffActivity.createdAt, todayUTC),
          )
        ),
    ])

    const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]))
    const dailyRunCount = parseInt(settings['daily_run_count'] ?? '3')
    const runsToday = todayRunRows[0]?.total ?? 0

    if (runsToday >= dailyRunCount) {
      log.push(`Already ran ${runsToday}x today (limit: ${dailyRunCount}) — skipping`)
      return NextResponse.json({ skipped: true, reason: 'daily_limit_reached', runsToday, dailyRunCount, log })
    }

    log.push(`Run ${runsToday + 1} of ${dailyRunCount} today`)

    // 1. Check budget
    const budget = await getBudgetStatus()
    log.push(`Budget: ${Math.round(budget.percentUsed)}% used (${budget.tokensUsed.toLocaleString()} / ${budget.monthlyBudget.toLocaleString()} tokens)`)

    if (budget.hardStop) {
      log.push('HARD STOP: Budget ≥ 95% — skipping all creation')
      await logEllisActivity(jobId, 'digest', 'flag', `Weekly run skipped — budget emergency (${Math.round(budget.percentUsed)}%)`)
      return NextResponse.json({ skipped: true, reason: 'budget_hard_stop', log })
    }

    if (!budget.autoCreationEnabled) {
      log.push('Auto-creation is disabled — skipping creation jobs')
      await logEllisActivity(jobId, 'digest', 'pass', 'Weekly run skipped — auto-creation disabled')
      return NextResponse.json({ skipped: true, reason: 'auto_creation_disabled', log })
    }

    if (budget.softStop) {
      log.push('SOFT STOP: Budget ≥ 80% — skipping scheduled creation (manual runs still allowed)')
      await logEllisActivity(jobId, 'digest', 'flag', `Weekly run skipped — budget warning (${Math.round(budget.percentUsed)}%)`)
      return NextResponse.json({ skipped: true, reason: 'budget_soft_stop', log })
    }

    // 2. Find collection gaps
    const allCollections = await db.select({ name: collections.name }).from(collections)
    const publishedRows = await db
      .select({ collection: recipes.collection, total: count() })
      .from(recipes)
      .where(eq(recipes.status, 'published'))
      .groupBy(recipes.collection)

    const countMap = new Map(publishedRows.map((r) => [r.collection, r.total]))
    const gaps = allCollections.filter((c) => (countMap.get(c.name) ?? 0) < budget.creationThreshold)

    log.push(`Collections below threshold (${budget.creationThreshold}): ${gaps.length > 0 ? gaps.map((g) => g.name).join(', ') : 'none'}`)

    if (gaps.length === 0) {
      log.push('No gaps detected — nothing to do')
      await logEllisActivity(jobId, 'digest', 'pass', 'Weekly run complete — no gaps detected')
      return NextResponse.json({ dispatched: 0, log })
    }

    // 3. Dispatch one batch job per gap
    const dispatched: string[] = []
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cookbookverse.com'

    for (const gap of gaps) {
      const persona = gap.name === 'Baking Alchemy' ? 'celeste' : 'marco'
      try {
        const resp = await fetch(`${baseUrl}/api/admin/staff/create-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-key': process.env.CRON_SECRET ?? '',
          },
          body: JSON.stringify({ persona, collection: gap.name, count: 3 }),
        })
        const result = await resp.json()
        dispatched.push(`${gap.name} → ${result.created ?? 0} recipes created`)
        log.push(`Dispatched ${persona} for "${gap.name}" — ${result.created ?? 0}/${result.requested ?? 3} created`)
      } catch (e) {
        log.push(`Failed to dispatch for "${gap.name}": ${e instanceof Error ? e.message : 'unknown error'}`)
      }
    }

    // 4. Log Ellis summary
    await logEllisActivity(
      jobId,
      'digest',
      'pass',
      `Weekly cron complete — ${gaps.length} gap(s), ${dispatched.length} job(s) dispatched`
    )

    return NextResponse.json({ dispatched: dispatched.length, gaps: gaps.map((g) => g.name), log })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    log.push(`Fatal error: ${msg}`)
    return NextResponse.json({ error: msg, log }, { status: 500 })
  }
}

async function logEllisActivity(id: string, actionType: string, outcome: string, notes: string) {
  await db.insert(staffActivity).values({
    id,
    persona: 'ellis',
    actionType,
    recipeId: null,
    tokensInput: 0,
    tokensOutput: 0,
    outcome,
    notes,
  })
}
