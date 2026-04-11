import { db } from '@/lib/db'
import { staffActivity, platformSettings } from '@/lib/db/schema'
import { gte, sum } from 'drizzle-orm'

export type BudgetStatus = {
  monthlyBudget: number
  tokensUsed: number
  percentUsed: number
  autoCreationEnabled: boolean
  creationThreshold: number
  hardStop: boolean   // >= 95% — all non-essential calls blocked
  softStop: boolean   // >= 80% — scheduled creation paused, alert shown
}

export async function getBudgetStatus(): Promise<BudgetStatus> {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [settingsRows, tokenRows] = await Promise.all([
    db.select().from(platformSettings),
    db
      .select({ total: sum(staffActivity.tokensInput), totalOut: sum(staffActivity.tokensOutput) })
      .from(staffActivity)
      .where(gte(staffActivity.createdAt, monthStart)),
  ])

  const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]))
  const monthlyBudget = parseInt(settings['monthly_token_budget'] ?? '500000')
  const autoCreationEnabled = settings['auto_creation_enabled'] !== 'false'
  const creationThreshold = parseInt(settings['creation_threshold'] ?? '8')

  const tokensUsed =
    Number(tokenRows[0]?.total ?? 0) + Number(tokenRows[0]?.totalOut ?? 0)
  const percentUsed = monthlyBudget > 0 ? (tokensUsed / monthlyBudget) * 100 : 0

  return {
    monthlyBudget,
    tokensUsed,
    percentUsed,
    autoCreationEnabled,
    creationThreshold,
    hardStop: percentUsed >= 95,
    softStop: percentUsed >= 80,
  }
}
