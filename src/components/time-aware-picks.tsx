'use client'

import { useEffect, useState } from 'react'

export type TimePick = {
  id: string
  slug: string
  title: string
  collection: string
  totalTime: string
  difficulty: string
  imageUrl: string | null
  gradient: string
  moodTags: string[]
  ingredients: string[]
}

// Meal windows keyed off the viewer's *local* hour. First match wins; the last
// entry is the catch-all for late night.
const WINDOWS: { from: number; to: number; label: string; kw: string[] }[] = [
  { from: 5, to: 11, label: 'Good for breakfast', kw: ['breakfast', 'brunch', 'egg', 'pancake', 'oat', 'granola', 'toast', 'smoothie', 'morning', 'coffee', 'porridge'] },
  { from: 11, to: 15, label: 'Lunch ideas', kw: ['lunch', 'salad', 'sandwich', 'soup', 'wrap', 'light', 'bowl', 'quick'] },
  { from: 15, to: 18, label: 'Afternoon treats', kw: ['snack', 'bake', 'dessert', 'cake', 'cookie', 'tea', 'treat', 'sweet', 'pastry'] },
  { from: 18, to: 22, label: 'Tonight’s dinner', kw: ['dinner', 'weeknight', 'roast', 'comfort', 'pasta', 'curry', 'hearty', 'stew', 'main', 'braise'] },
  { from: 0, to: 24, label: 'Late-night bites', kw: ['snack', 'dessert', 'quick', 'comfort', 'easy', 'sweet'] },
]

function windowForHour(h: number) {
  return WINDOWS.find((w) => h >= w.from && h < w.to) ?? WINDOWS[WINDOWS.length - 1]
}

// Reduce an ingredient line ("2 cloves garlic, minced") to comparable tokens so
// a grocery entry of "garlic" still matches. Drops quantities and short words.
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

// Count how many of the recipe's ingredients are covered by the grocery list.
function groceryOverlap(recipeIngredients: string[], groceryTokenSet: Set<string>): number {
  if (groceryTokenSet.size === 0) return 0
  let have = 0
  for (const line of recipeIngredients) {
    const t = tokens(line)
    if (t.some((w) => groceryTokenSet.has(w))) have += 1
  }
  return have
}

export function TimeAwarePicks({
  pool,
  fallbackHeading,
  groceryItems = [],
}: {
  pool: TimePick[]
  fallbackHeading: string
  groceryItems?: string[]
}) {
  // Render a deterministic first paint (server order + neutral heading), then
  // re-rank once we know the viewer's local time — avoids hydration mismatch.
  const [mounted, setMounted] = useState(false)
  const [hour, setHour] = useState(12)

  useEffect(() => {
    setHour(new Date().getHours())
    setMounted(true)
  }, [])

  const win = windowForHour(hour)
  const groceryTokenSet = new Set(groceryItems.flatMap(tokens))

  const ranked = pool
    .map((r) => {
      if (!mounted) return { r, score: 0, have: 0 }
      const hay = [...(r.moodTags ?? []), r.title, r.collection].join(' ').toLowerCase()
      let score = 0
      for (const k of win.kw) if (hay.includes(k)) score += 1
      // Each grocery ingredient the recipe uses is a strong nudge — these are
      // things you can make right now without another shop.
      const have = groceryOverlap(r.ingredients ?? [], groceryTokenSet)
      score += have * 2
      return { r, score, have }
    })
    // Stable sort keeps the server's personalised order for equal scores.
    .sort((a, b) => b.score - a.score)

  const top = ranked.slice(0, 3)
  const matched = mounted && ranked.some((x) => x.score > 0)
  const heading = matched ? win.label : fallbackHeading

  if (top.length === 0) return null

  return (
    <section className="mx-auto max-w-2xl px-6 pb-4">
      <div className="flex items-baseline justify-between mb-4 border-t border-line pt-8">
        <h2 className="font-display text-xl font-bold text-ink">{heading}</h2>
        <a href="/explore" className="text-sm text-ember hover:text-ember-deep transition-colors">See all</a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {top.map(({ r: recipe, have }) => (
          <a
            key={recipe.id}
            href={`/recipe/${recipe.slug}`}
            className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
          >
            <div className={`aspect-[4/3] overflow-hidden relative ${!recipe.imageUrl ? `bg-gradient-to-br ${recipe.gradient}` : ''}`}>
              {recipe.imageUrl && (
                <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              )}
              {have > 0 && (
                <span className="absolute top-2 left-2 rounded-full bg-ember/90 text-white text-[10px] font-semibold tracking-wide px-2 py-0.5 backdrop-blur-sm">
                  {have} on your list
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold tracking-[0.1em] uppercase text-ink-ghost mb-1 truncate">{recipe.collection}</p>
              <h3 className="font-display text-sm font-bold text-ink group-hover:text-ember transition-colors leading-snug line-clamp-2">{recipe.title}</h3>
              <p className="text-xs text-ink-ghost mt-1.5">{recipe.totalTime} · {recipe.difficulty}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
