'use client'

import { useState } from 'react'

interface Nutrition {
  calories: number
  protein: string
  carbs: string
  fat: string
  fiber: string
}

export function NutritionPanel({ nutrition }: { nutrition: Nutrition }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="text-xs font-semibold tracking-[0.18em] uppercase text-ink-ghost">
          Nutrition per serving
        </span>
        <span className="text-ink-ghost text-sm">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="pb-6 grid grid-cols-5 gap-3">
          {[
            { label: 'Calories', value: String(nutrition.calories) },
            { label: 'Protein', value: nutrition.protein },
            { label: 'Carbs', value: nutrition.carbs },
            { label: 'Fat', value: nutrition.fat },
            { label: 'Fiber', value: nutrition.fiber },
          ].map(({ label, value }) => (
            <div key={label} className="bg-panel border border-line rounded-lg px-3 py-3 text-center">
              <p className="text-xs text-ink-ghost mb-1">{label}</p>
              <p className="font-semibold text-ink text-sm">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
