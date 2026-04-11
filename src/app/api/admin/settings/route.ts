import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { platformSettings, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function requireAdmin(userId: string | null) {
  if (!userId) return false
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return rows[0]?.role === 'admin'
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await db.select().from(platformSettings)
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return NextResponse.json({
    monthlyTokenBudget: parseInt(settings['monthly_token_budget'] ?? '500000'),
    autoCreationEnabled: settings['auto_creation_enabled'] !== 'false',
    creationThreshold: parseInt(settings['creation_threshold'] ?? '8'),
    dailyRunCount: parseInt(settings['daily_run_count'] ?? '3'),
  })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { monthlyTokenBudget, autoCreationEnabled, creationThreshold, dailyRunCount } = await req.json()

  const updates: { key: string; value: string }[] = []
  if (monthlyTokenBudget !== undefined)
    updates.push({ key: 'monthly_token_budget', value: String(monthlyTokenBudget) })
  if (autoCreationEnabled !== undefined)
    updates.push({ key: 'auto_creation_enabled', value: autoCreationEnabled ? 'true' : 'false' })
  if (creationThreshold !== undefined)
    updates.push({ key: 'creation_threshold', value: String(creationThreshold) })
  if (dailyRunCount !== undefined)
    updates.push({ key: 'daily_run_count', value: String(Math.min(3, Math.max(1, Number(dailyRunCount)))) })

  for (const { key, value } of updates) {
    await db
      .insert(platformSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } })
  }

  return NextResponse.json({ ok: true })
}
