'use client'

import { useState } from 'react'
import Link from 'next/link'

type Nutrition = { calories: number; protein: string; carbs: string; fat: string; fiber: string }

interface CookEntry {
  id: string
  recipeId: string
  recipeSlug: string
  cookedAt: Date | string
  servings: number
  notes: string | null
}

interface SavedRecipe {
  id: string
  title: string
  slug: string
  nutrition: Nutrition
}

interface Props {
  entries: CookEntry[]
  savedRecipes: SavedRecipe[]
}

function parseNum(s: string | undefined) {
  if (!s) return 0
  return parseFloat(s.replace(/[^\d.]/g, '')) || 0
}

function toDate(d: Date | string) {
  return d instanceof Date ? d : new Date(d)
}

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

export function CookLog({ entries, savedRecipes }: Props) {
  const [removing, setRemoving] = useState<string | null>(null)
  const [localEntries, setLocalEntries] = useState(entries)

  const recipeMap = Object.fromEntries(savedRecipes.map((r) => [r.id, r]))

  async function remove(id: string) {
    setRemoving(id)
    await fetch(`/api/user/cooked-log?id=${id}`, { method: 'DELETE' })
    setLocalEntries((e) => e.filter((x) => x.id !== id))
    setRemoving(null)
  }

  // Weekly nutrition summary (this week Monday–Sunday)
  const weekStart = startOfWeek(new Date())
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  const thisWeek = localEntries.filter((e) => {
    const d = toDate(e.cookedAt)
    return d >= weekStart && d < weekEnd
  })

  const weeklyTotals = thisWeek.reduce(
    (acc, e) => {
      const recipe = recipeMap[e.recipeId]
      if (!recipe?.nutrition) return acc
      const n = recipe.nutrition
      const s = e.servings
      return {
        calories: acc.calories + (n.calories || 0) * s,
        protein:  acc.protein  + parseNum(n.protein)  * s,
        carbs:    acc.carbs    + parseNum(n.carbs)     * s,
        fat:      acc.fat      + parseNum(n.fat)       * s,
        fiber:    acc.fiber    + parseNum(n.fiber)     * s,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )

  const hasTotals = weeklyTotals.calories > 0 || weeklyTotals.protein > 0

  const weekLabel = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const weekEndLabel = new Date(weekEnd.getTime() - 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  if (localEntries.length === 0) {
    return (
      <div className="text-center py-20 text-ink-ghost">
        <p className="text-4xl mb-3">🍳</p>
        <p className="text-sm">
          No cooks logged yet. Hit <strong className="text-ink">"I cooked this"</strong> on any recipe to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Weekly summary card */}
      {hasTotals && (
        <div className="bg-panel border border-line rounded-2xl p-6">
          <p className="text-xs text-ink-ghost mb-4">This week ({weekLabel}–{weekEndLabel}) · {thisWeek.length} cook{thisWeek.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Calories', value: Math.round(weeklyTotals.calories).toLocaleString(), unit: 'kcal' },
              { label: 'Protein',  value: Math.round(weeklyTotals.protein),  unit: 'g' },
              { label: 'Carbs',    value: Math.round(weeklyTotals.carbs),    unit: 'g' },
              { label: 'Fat',      value: Math.round(weeklyTotals.fat),      unit: 'g' },
              { label: 'Fiber',    value: Math.round(weeklyTotals.fiber),    unit: 'g' },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-2xl font-bold text-ember">{m.value}<span className="text-xs font-normal text-ink-ghost ml-0.5">{m.unit}</span></p>
                <p className="text-xs text-ink-ghost mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log entries */}
      <div className="space-y-3">
        {localEntries.map((entry) => {
          const recipe = recipeMap[entry.recipeId]
          const dateStr = toDate(entry.cookedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          const timeStr = toDate(entry.cookedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

          return (
            <div key={entry.id} className="flex items-start gap-4 bg-panel border border-line rounded-xl px-4 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/recipe/${entry.recipeSlug}`} className="font-medium text-sm text-ink hover:text-ember transition-colors truncate">
                    {recipe?.title ?? entry.recipeSlug}
                  </Link>
                  <span className="text-xs text-ink-ghost border border-line rounded-full px-2 py-0.5">
                    {entry.servings} serving{entry.servings !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-ink-ghost mt-0.5">{dateStr} at {timeStr}</p>
                {entry.notes && <p className="text-xs text-ink-dim mt-1 italic">"{entry.notes}"</p>}
                {recipe?.nutrition?.calories ? (
                  <p className="text-xs text-ink-ghost mt-1">
                    ~{Math.round(recipe.nutrition.calories * entry.servings).toLocaleString()} kcal ·{' '}
                    {Math.round(parseNum(recipe.nutrition.protein) * entry.servings)}g protein
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => remove(entry.id)}
                disabled={removing === entry.id}
                className="text-xs text-ink-ghost hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
                aria-label="Remove entry"
              >
                {removing === entry.id ? '…' : '✕'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
