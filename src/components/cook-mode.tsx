'use client'

import { useState, useEffect } from 'react'

interface Ingredient {
  group: string
  items: string[]
}

interface Step {
  title: string
  body: string
}

interface Props {
  recipeSlug: string
  ingredients: Ingredient[]
  steps: Step[]
}

export function CookMode({ recipeSlug, ingredients, steps }: Props) {
  const storageKey = `cbv_cook_mode_${recipeSlug}`
  const [active, setActive] = useState(false)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const { ings, steps: stps } = JSON.parse(saved)
        setCheckedIngredients(new Set(ings))
        setCheckedSteps(new Set(stps))
      }
    } catch {}
  }, [storageKey])

  function toggleIngredient(key: string) {
    setCheckedIngredients((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      try { localStorage.setItem(storageKey, JSON.stringify({ ings: [...next], steps: [...checkedSteps] })) } catch {}
      return next
    })
  }

  function toggleStep(i: number) {
    setCheckedSteps((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      try { localStorage.setItem(storageKey, JSON.stringify({ ings: [...checkedIngredients], steps: [...next] })) } catch {}
      return next
    })
  }

  function reset() {
    setCheckedIngredients(new Set())
    setCheckedSteps(new Set())
    try { localStorage.removeItem(storageKey) } catch {}
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 text-xs font-medium text-ink-ghost hover:text-ember border border-line hover:border-ember px-4 py-2 rounded-full transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Cook mode
      </button>
    )
  }

  const completedSteps = checkedSteps.size
  const progressPct = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 bg-page overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-page/95 backdrop-blur-sm border-b border-line px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-widest text-ember">Cook mode</span>
          {steps.length > 0 && (
            <div className="flex items-center gap-2 flex-1 max-w-40">
              <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                <div
                  className="h-full bg-ember rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-ink-ghost flex-shrink-0">{completedSteps}/{steps.length}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(checkedIngredients.size > 0 || checkedSteps.size > 0) && (
            <button onClick={reset} className="text-xs text-ink-ghost hover:text-ember transition-colors">Reset</button>
          )}
          <button
            onClick={() => setActive(false)}
            className="text-xs font-medium text-ink-ghost hover:text-ink border border-line px-3 py-1.5 rounded-full transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-10">

        {/* Ingredients with checkboxes */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">Ingredients</h2>
          <div className="space-y-5">
            {ingredients.map((group) => (
              <div key={group.group}>
                {group.group && group.group !== 'Main' && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-ghost mb-2">{group.group}</p>
                )}
                <ul className="space-y-1.5">
                  {group.items.map((item) => {
                    const key = `${group.group}::${item}`
                    const checked = checkedIngredients.has(key)
                    return (
                      <li key={key}>
                        <button
                          onClick={() => toggleIngredient(key)}
                          className="flex items-start gap-3 text-left w-full group"
                        >
                          <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border transition-colors ${checked ? 'bg-ember border-ember' : 'border-line group-hover:border-ember/50'} flex items-center justify-center`}>
                            {checked && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm leading-snug transition-colors ${checked ? 'line-through text-ink-ghost' : 'text-ink'}`}>
                            {item}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Steps with checkboxes */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">Method</h2>
          <div className="space-y-4">
            {steps.map((step, i) => {
              const checked = checkedSteps.has(i)
              return (
                <button
                  key={i}
                  onClick={() => toggleStep(i)}
                  className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all ${checked ? 'border-ember/30 bg-ember/5 opacity-60' : 'border-line bg-panel hover:border-ember/40'}`}
                >
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${checked ? 'bg-ember border-ember text-white' : 'border-line text-ink-ghost'}`}>
                    {checked ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {step.title && (
                      <p className={`text-sm font-semibold mb-1 transition-colors ${checked ? 'text-ink-ghost line-through' : 'text-ink'}`}>
                        {step.title}
                      </p>
                    )}
                    <p className={`text-sm leading-relaxed transition-colors ${checked ? 'text-ink-ghost' : 'text-ink-dim'}`}>
                      {step.body}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {completedSteps === steps.length && steps.length > 0 && (
          <div className="text-center py-8 border border-green-500/20 bg-green-500/5 rounded-xl">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-display text-lg font-bold text-ink">All done!</p>
            <p className="text-sm text-ink-ghost mt-1">Don&apos;t forget to log it.</p>
          </div>
        )}
      </div>
    </div>
  )
}
