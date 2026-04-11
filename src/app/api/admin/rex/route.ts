import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { staffActivity, users } from '@/lib/db/schema'
import { gte, and, eq, count, sql } from 'drizzle-orm'

// GET /api/admin/rex — system health report from Rex
// Rule-based — no AI calls. Reads staff_activity and computes signals.

export type RexAlert = {
  level: 'ok' | 'warn' | 'critical'
  persona: string
  signal: string
  detail: string
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows[0] || userRows[0].role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // ── Outcome counts per persona — this week vs last week ──────────────────────

  const [thisWeekRows, lastWeekRows] = await Promise.all([
    db
      .select({ persona: staffActivity.persona, outcome: staffActivity.outcome, total: count() })
      .from(staffActivity)
      .where(gte(staffActivity.createdAt, weekAgo))
      .groupBy(staffActivity.persona, staffActivity.outcome),
    db
      .select({ persona: staffActivity.persona, outcome: staffActivity.outcome, total: count() })
      .from(staffActivity)
      .where(and(gte(staffActivity.createdAt, twoWeeksAgo), sql`${staffActivity.createdAt} < ${weekAgo}`))
      .groupBy(staffActivity.persona, staffActivity.outcome),
  ])

  type OutcomeMap = Map<string, Map<string, number>>
  function buildOutcomeMap(rows: typeof thisWeekRows): OutcomeMap {
    const m: OutcomeMap = new Map()
    for (const r of rows) {
      if (!m.has(r.persona)) m.set(r.persona, new Map())
      m.get(r.persona)!.set(r.outcome, r.total)
    }
    return m
  }

  const thisWeek = buildOutcomeMap(thisWeekRows)
  const lastWeek = buildOutcomeMap(lastWeekRows)

  const alerts: RexAlert[] = []

  // ── Signal: flag rate drift (this week vs last week) ─────────────────────────

  const allPersonas = new Set([...thisWeek.keys(), ...lastWeek.keys()])
  for (const persona of allPersonas) {
    const tw = thisWeek.get(persona) ?? new Map<string, number>()
    const lw = lastWeek.get(persona) ?? new Map<string, number>()

    const twTotal = Array.from(tw.values()).reduce((a, b) => a + b, 0)
    const lwTotal = Array.from(lw.values()).reduce((a, b) => a + b, 0)
    const twFlags = tw.get('flag') ?? 0
    const lwFlags = lw.get('flag') ?? 0
    const twFlagRate = twTotal > 0 ? twFlags / twTotal : 0
    const lwFlagRate = lwTotal > 0 ? lwFlags / lwTotal : 0

    if (twTotal >= 3) {
      if (twFlagRate >= 0.4) {
        alerts.push({
          level: 'critical',
          persona,
          signal: 'flag_rate_high',
          detail: `${Math.round(twFlagRate * 100)}% flag rate this week (${twFlags}/${twTotal}) — prompt may need tuning`,
        })
      } else if (twFlagRate - lwFlagRate >= 0.15 && lwTotal >= 3) {
        alerts.push({
          level: 'warn',
          persona,
          signal: 'flag_rate_drift',
          detail: `Flag rate up ${Math.round((twFlagRate - lwFlagRate) * 100)}pp vs last week (${Math.round(twFlagRate * 100)}% → was ${Math.round(lwFlagRate * 100)}%)`,
        })
      }
    }

    // Reject rate check
    const twRejects = tw.get('reject') ?? 0
    const twRejectRate = twTotal > 0 ? twRejects / twTotal : 0
    if (twTotal >= 3 && twRejectRate >= 0.3) {
      alerts.push({
        level: 'critical',
        persona,
        signal: 'reject_rate_high',
        detail: `${Math.round(twRejectRate * 100)}% rejection rate this week — output quality degraded`,
      })
    }
  }

  // ── Signal: pipeline silence (no activity in 7+ days for active personas) ────

  const lastActivityRows = await db
    .select({ persona: staffActivity.persona, last: sql<Date>`max(${staffActivity.createdAt})` })
    .from(staffActivity)
    .groupBy(staffActivity.persona)

  for (const row of lastActivityRows) {
    const daysSince = (now.getTime() - new Date(row.last).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince > 14 && ['marco', 'celeste', 'nadia', 'theo'].includes(row.persona)) {
      alerts.push({
        level: 'warn',
        persona: row.persona,
        signal: 'pipeline_silence',
        detail: `No activity in ${Math.round(daysSince)} days — pipeline may be stalled`,
      })
    }
  }

  // ── Signal: Theo not reviewing (submissions piling up) ───────────────────────

  const theoActivity = thisWeek.get('theo')
  const pendingCount = await db
    .select({ total: count() })
    .from(staffActivity)
    .where(and(eq(staffActivity.persona, 'theo'), gte(staffActivity.createdAt, weekAgo)))

  const theoReviewsThisWeek = pendingCount[0]?.total ?? 0

  // If no Theo activity but other staff are active, flag it
  const otherActive = Array.from(thisWeek.keys()).some((p) => p !== 'theo' && p !== 'ellis')
  if (otherActive && theoReviewsThisWeek === 0) {
    alerts.push({
      level: 'warn',
      persona: 'theo',
      signal: 'review_pipeline_idle',
      detail: 'No QA activity this week while other staff were active — check submission pipeline',
    })
  }

  // ── All-clear if no alerts ────────────────────────────────────────────────────

  if (alerts.length === 0) {
    alerts.push({
      level: 'ok',
      persona: 'rex',
      signal: 'all_clear',
      detail: 'All systems nominal. No quality drift detected.',
    })
  }

  return NextResponse.json({
    generatedAt: now.toISOString(),
    alerts,
    criticalCount: alerts.filter((a) => a.level === 'critical').length,
    warnCount: alerts.filter((a) => a.level === 'warn').length,
  })
}
