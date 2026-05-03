'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type RecipeRow = {
  id: string
  slug: string
  title: string
  subtitle: string
  cuisine: string
  totalTime: string
  difficulty: string
  gradient: string
  imageUrl: string | null
}

interface Props {
  initialRecipes: RecipeRow[]
  initialGroceryList: string
  overlaps: Record<string, string[]>
  fridgeIngredients: string[]
  cookedThisWeekIds: string[]
}

export function WeekPlan({ initialRecipes, initialGroceryList, overlaps, fridgeIngredients, cookedThisWeekIds }: Props) {
  const router = useRouter()
  const [recipes, setRecipes] = useState<RecipeRow[]>(initialRecipes)
  const [groceryList, setGroceryList] = useState(initialGroceryList)
  const [groceryLoading, setGroceryLoading] = useState(false)
  const [groceryCopied, setGroceryCopied] = useState(false)
  const [clearLoading, setClearLoading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  async function removeRecipe(recipeId: string) {
    setRemoving(recipeId)
    const res = await fetch('/api/user/week-plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipeId, action: 'remove' }),
    })
    if (res.ok) {
      setRecipes((rs) => rs.filter((r) => r.id !== recipeId))
      router.refresh() // re-fetch server component so overlaps prop is updated
    }
    setRemoving(null)
  }

  async function clearPlan() {
    setClearLoading(true)
    const res = await fetch('/api/user/week-plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    })
    if (res.ok) {
      setRecipes([])
      setGroceryList('')
    }
    setClearLoading(false)
  }

  async function generateGroceryList() {
    setGroceryLoading(true)
    const res = await fetch('/api/user/week-plan/grocery-list', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setGroceryList(data.list)
    }
    setGroceryLoading(false)
    router.refresh()
  }

  // Monday nudge: if today is Monday and this week has recipes
  const isMonday = new Date().getDay() === 1

  if (recipes.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="flex justify-center mb-4">
          <svg className="w-10 h-10 text-ink-ghost" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
            <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
            <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
          </svg>
        </div>
        <p className="font-display text-xl text-ink mb-2">No recipes in your plan yet</p>
        <p className="text-sm text-ink-ghost mb-6">Hit &ldquo;Add to this week&rdquo; on any recipe page to start building your week.</p>
        <Link href="/explore" className="inline-flex items-center gap-2 bg-ember text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-ember/90 transition-colors">
          Browse recipes
        </Link>
      </div>
    )
  }

  const hasOverlaps = Object.keys(overlaps).length > 0
  const cookedSet = new Set(cookedThisWeekIds)
  const cookedCount = recipes.filter((r) => cookedSet.has(r.id)).length
  const progressPct = recipes.length > 0 ? Math.round((cookedCount / recipes.length) * 100) : 0

  return (
    <div className="space-y-8">

      {/* Monday nudge */}
      {isMonday && (
        <div className="flex items-center justify-between gap-4 bg-ember/8 border border-ember/20 rounded-xl px-5 py-4">
          <p className="text-sm text-ink">New week? Clear your plan and start fresh.</p>
          <button
            onClick={clearPlan}
            disabled={clearLoading}
            className="text-xs font-medium text-ember hover:underline disabled:opacity-50 flex-shrink-0"
          >
            {clearLoading ? 'Clearing…' : 'Clear plan'}
          </button>
        </div>
      )}

      {/* Progress */}
      {recipes.length > 0 && (
        <div className="bg-panel border border-line rounded-xl px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">This week</p>
            <span className="text-xs text-ink-ghost">{cookedCount} of {recipes.length} cooked</span>
          </div>
          <div className="h-2 bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-ember rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {cookedCount === recipes.length && recipes.length > 0 && (
            <p className="text-xs text-green-400 mt-2">Full week done! 🎉</p>
          )}
        </div>
      )}

      {/* Ingredient overlap callout */}
      {hasOverlaps && (
        <div className="bg-panel border border-line rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-3">Ingredient overlaps</p>
          <p className="text-sm text-ink-dim mb-4">
            These recipes share ingredients — one shopping trip covers multiple meals.
          </p>
          <div className="space-y-2">
            {Object.entries(overlaps).map(([recipeId, shared]) => {
              const r = recipes.find((r) => r.id === recipeId)
              if (!r || shared.length === 0) return null
              return (
                <div key={recipeId} className="flex items-start gap-3 text-sm">
                  <span className="text-ink font-medium truncate">{r.title}</span>
                  <span className="text-ink-ghost flex-shrink-0">shares</span>
                  <span className="text-ember text-xs font-medium">{shared.slice(0, 3).join(', ')}{shared.length > 3 ? ` +${shared.length - 3} more` : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recipe cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} this week
          </p>
          {!isMonday && (
            <button
              onClick={clearPlan}
              disabled={clearLoading}
              className="text-xs text-ink-ghost hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {clearLoading ? 'Clearing…' : 'Clear plan'}
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((r) => {
            const isCooked = cookedSet.has(r.id)
            return (
            <div key={r.id} className={`group rounded-xl border bg-panel overflow-hidden transition-colors ${isCooked ? 'border-green-500/30 bg-green-500/3' : 'border-line'}`}>
              <Link href={`/recipe/${r.slug}`}>
                <div className={`h-24 bg-gradient-to-br ${r.gradient} relative`}>
                  {r.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
                  )}
                  {isCooked && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4 pb-2">
                  <h3 className={`font-display font-bold text-sm leading-snug line-clamp-2 mb-1 transition-colors ${isCooked ? 'text-ink-ghost line-through' : 'text-ink group-hover:text-ember'}`}>
                    {r.title}
                  </h3>
                  <p className="text-xs text-ink-ghost font-display italic line-clamp-1">{r.subtitle}</p>
                  {overlaps[r.id]?.length > 0 && (
                    <p className="text-xs text-ember mt-1.5">
                      ⟳ {overlaps[r.id].slice(0, 2).join(', ')} shared
                    </p>
                  )}
                </div>
              </Link>
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-ghost">{r.cuisine} · {r.totalTime}</span>
                  <button
                    onClick={() => removeRecipe(r.id)}
                    disabled={removing === r.id}
                    className="text-xs text-ink-ghost hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {removing === r.id ? '…' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>

      {/* Grocery list */}
      <div className="border-t border-line pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-1">Grocery list</p>
            {fridgeIngredients.length > 0 && (
              <p className="text-xs text-ink-ghost">Cross-referenced against your fridge — items you have are flagged.</p>
            )}
          </div>
          <button
            onClick={generateGroceryList}
            disabled={groceryLoading}
            className="inline-flex items-center gap-2 text-xs font-medium bg-ember text-white px-4 py-2 rounded-full hover:bg-ember/90 disabled:opacity-60 transition-colors"
          >
            {groceryLoading ? 'Generating…' : groceryList ? 'Regenerate' : 'Generate list'}
          </button>
        </div>

        {groceryList && (
          <div className="bg-panel border border-line rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-ink">Your shopping list</p>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(groceryList)
                  setGroceryCopied(true)
                  setTimeout(() => setGroceryCopied(false), 2000)
                }}
                className="text-xs text-ink-ghost hover:text-ember transition-colors px-3 py-1 rounded-full border border-line hover:border-ember"
              >
                {groceryCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-sm text-ink-dim whitespace-pre-wrap font-sans leading-relaxed">{groceryList}</pre>
          </div>
        )}
      </div>

    </div>
  )
}
