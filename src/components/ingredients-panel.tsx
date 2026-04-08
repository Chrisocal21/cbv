'use client'

import { useState } from 'react'

type IngredientGroup = { group: string; items: string[] }

// ─── Unit conversion ─────────────────────────────────────────────────────────
// Operates on ingredient strings like "2 tbsp white miso paste" or "250g flour"
// Only converts clear numeric measurements — leaves fractions and ranges alone.

type Unit = 'metric' | 'imperial'

// Round to a sensible number of decimal places
function round(n: number, places = 1) {
  return parseFloat(n.toFixed(places))
}

// Convert a single ingredient string
function convertIngredient(item: string, to: Unit): string {
  if (to === 'metric') {
    return item
      // oz → g  (1 oz = 28.35 g)
      .replace(/\b(\d+(?:\.\d+)?)\s*oz\b/gi, (_, n) => `${round(parseFloat(n) * 28.35, 0)}g`)
      // lb → g  (1 lb = 453.6 g, show in g under 1000, kg above)
      .replace(/\b(\d+(?:\.\d+)?)\s*lb[s]?\b/gi, (_, n) => {
        const grams = parseFloat(n) * 453.6
        return grams >= 1000 ? `${round(grams / 1000)}kg` : `${round(grams, 0)}g`
      })
      // fl oz → ml  (1 fl oz = 29.57 ml)
      .replace(/\b(\d+(?:\.\d+)?)\s*fl\.?\s*oz\b/gi, (_, n) => `${round(parseFloat(n) * 29.57, 0)}ml`)
      // cups → ml  (1 cup = 240 ml)
      .replace(/\b(\d+(?:\.\d+)?)\s*cups?\b/gi, (_, n) => {
        const ml = parseFloat(n) * 240
        return ml >= 1000 ? `${round(ml / 1000)}L` : `${round(ml, 0)}ml`
      })
      // tbsp → ml  (1 tbsp = 15 ml)
      .replace(/\b(\d+(?:\.\d+)?)\s*(?:tbsp|tablespoons?)\b/gi, (_, n) => `${round(parseFloat(n) * 15, 0)}ml`)
      // tsp → ml  (1 tsp = 5 ml)
      .replace(/\b(\d+(?:\.\d+)?)\s*(?:tsp|teaspoons?)\b/gi, (_, n) => `${round(parseFloat(n) * 5, 0)}ml`)
      // °F → °C
      .replace(/\b(\d+)\s*°?F\b/g, (_, n) => `${Math.round((parseFloat(n) - 32) * 5 / 9)}°C`)
      // inches → cm  (1 inch = 2.54 cm)
      .replace(/\b(\d+(?:\.\d+)?)\s*(?:inch(?:es)?|")\b/gi, (_, n) => `${round(parseFloat(n) * 2.54, 1)}cm`)
  } else {
    return item
      // g → oz (if < 500g) or lb (if >= 500g)
      .replace(/\b(\d+(?:\.\d+)?)\s*g\b(?!l)/gi, (_, n) => {
        const g = parseFloat(n)
        if (g >= 500) return `${round(g / 453.6, 1)}lb`
        return `${round(g / 28.35, 1)}oz`
      })
      // kg → lb
      .replace(/\b(\d+(?:\.\d+)?)\s*kg\b/gi, (_, n) => `${round(parseFloat(n) * 2.205, 1)}lb`)
      // ml → fl oz (if < 240) or cups (if >= 240)
      .replace(/\b(\d+(?:\.\d+)?)\s*ml\b/gi, (_, n) => {
        const ml = parseFloat(n)
        if (ml >= 240) return `${round(ml / 240, 1)} cup${ml >= 480 ? 's' : ''}`
        if (ml >= 15) return `${round(ml / 15, 1)} tbsp`
        return `${round(ml / 5, 1)} tsp`
      })
      // L → cups
      .replace(/\b(\d+(?:\.\d+)?)\s*L\b/gi, (_, n) => `${round(parseFloat(n) * 4.167, 1)} cups`)
      // °C → °F
      .replace(/\b(\d+)\s*°?C\b/g, (_, n) => `${Math.round(parseFloat(n) * 9 / 5 + 32)}°F`)
      // cm → inches
      .replace(/\b(\d+(?:\.\d+)?)\s*cm\b/gi, (_, n) => `${round(parseFloat(n) / 2.54, 1)}"`)
  }
}

function convertGroups(groups: IngredientGroup[], to: Unit): IngredientGroup[] {
  if (to === 'metric') return groups // metric is the stored default
  return groups.map((g) => ({
    ...g,
    items: g.items.map((item) => convertIngredient(item, to)),
  }))
}

// ─── Component ───────────────────────────────────────────────────────────────

export function IngredientsPanel({ ingredients }: { ingredients: IngredientGroup[] }) {
  const [unit, setUnit] = useState<Unit>('metric')
  const groups = convertGroups(ingredients, unit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-ink">Ingredients</h2>
        <div className="flex items-center rounded-full border border-line overflow-hidden text-xs font-semibold">
          <button
            onClick={() => setUnit('metric')}
            className={`px-3 py-1.5 transition-colors ${unit === 'metric' ? 'bg-ember text-white' : 'text-ink-ghost hover:text-ink'}`}
          >
            Metric
          </button>
          <button
            onClick={() => setUnit('imperial')}
            className={`px-3 py-1.5 transition-colors ${unit === 'imperial' ? 'bg-ember text-white' : 'text-ink-ghost hover:text-ink'}`}
          >
            Imperial
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.group}>
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-ink-ghost mb-2">
              {group.group}
            </p>
            <ul className="space-y-2">
              {group.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-dim">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ember flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
