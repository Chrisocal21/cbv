'use client'

import { useState } from 'react'

type Group = { group: string; items: string[] }

export function GroceryListClient({
  groups,
  allItems,
}: {
  groups: Group[]
  allItems: string[]
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const toggle = (item: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      return next
    })
  }

  const unchecked = allItems.filter((i) => !checked.has(i))

  const copy = async () => {
    const text = unchecked.join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-ghost">
          {unchecked.length} of {allItems.length} remaining
        </p>
        <div className="flex gap-3">
          {checked.size > 0 && (
            <button
              onClick={() => setChecked(new Set())}
              className="text-xs text-ink-ghost hover:text-ink transition-colors"
            >
              Uncheck all
            </button>
          )}
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 text-xs font-medium border border-line hover:border-ember text-ink-dim hover:text-ink px-4 py-2 rounded-full transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                Copy list
              </>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 text-xs font-medium border border-line hover:border-ember text-ink-dim hover:text-ink px-4 py-2 rounded-full transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
            Print
          </button>
        </div>
      </div>

      {/* Ingredient groups */}
      <div className="space-y-8">
        {groups.map(({ group, items }) => (
          <div key={group}>
            <h2 className="font-display text-sm font-bold text-ink-ghost uppercase tracking-widest mb-3">
              {group || 'Ingredients'}
            </h2>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item}>
                  <label className={`flex items-start gap-3 cursor-pointer group ${checked.has(item) ? 'opacity-40' : ''}`}>
                    <span className={`mt-0.5 w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors ${checked.has(item) ? 'bg-ember border-ember' : 'border-line group-hover:border-ember'}`}>
                      {checked.has(item) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked.has(item)}
                      onChange={() => toggle(item)}
                    />
                    <span className={`text-sm leading-relaxed ${checked.has(item) ? 'line-through text-ink-ghost' : 'text-ink'}`}>
                      {item}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
