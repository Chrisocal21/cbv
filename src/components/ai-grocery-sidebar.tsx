'use client'

import { useState, useRef, useEffect } from 'react'

type Item = { id: string; text: string; checked: boolean }

type Match = {
  slug: string
  title: string
  cuisine: string
  totalTime: string
  imageUrl: string | null
  gradient: string
  score: number
  haveCount: number
  totalCount: number
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export function AIGrocerySidebar({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [input, setInput] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const firstRender = useRef(true)

  // Autosave to server
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const t = setTimeout(() => {
      fetch('/api/user/grocery', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items }),
      }).catch(() => {})
    }, 600)
    return () => clearTimeout(t)
  }, [items])

  // Fetch matches when items change
  useEffect(() => {
    const unchecked = items.filter((i) => !i.checked).map((i) => i.text).filter(Boolean)
    if (unchecked.length === 0) {
      setMatches([])
      return
    }

    setLoadingMatches(true)
    const t = setTimeout(() => {
      fetch('/api/user/fridge/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pantry: unchecked, save: false }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.matches) setMatches(data.matches.slice(0, 6))
        })
        .catch(() => {})
        .finally(() => setLoadingMatches(false))
    }, 700)
    return () => clearTimeout(t)
  }, [items])

  function addItem() {
    const val = input.trim()
    if (!val) return
    const parts = val.split(',').map((p) => p.trim()).filter(Boolean)
    setItems((prev) => {
      const existing = new Set(prev.map((i) => i.text.toLowerCase()))
      const next = [...prev]
      for (const p of parts) {
        if (existing.has(p.toLowerCase())) continue
        existing.add(p.toLowerCase())
        next.push({ id: uid(), text: p, checked: false })
      }
      return next
    })
    setInput('')
  }

  function toggle(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)

  return (
    <>
      {/* Mobile: Collapsible at top + horizontal slider */}
      <div className="md:hidden border-b border-line">
        {/* Grocery toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-panel-raised transition-colors"
        >
          <div>
            <h2 className="text-sm font-semibold text-ink text-left">Your ingredients</h2>
            <p className="text-xs text-ink-ghost text-left">{unchecked.length} item{unchecked.length !== 1 ? 's' : ''}</p>
          </div>
          <svg
            className={`w-5 h-5 text-ink-ghost transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Grocery list (expandable) */}
        {!collapsed && (
          <div className="px-6 pb-4 space-y-3">
            {/* Add input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                placeholder="Add ingredient..."
                className="flex-1 text-sm bg-page border border-line rounded-lg px-3 py-2 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
              />
              <button
                onClick={addItem}
                disabled={!input.trim()}
                className="px-3 py-2 rounded-lg bg-ember text-white text-sm font-medium hover:bg-ember-deep disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Items */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {unchecked.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggle(item.id)}
                    className="flex-shrink-0 w-4 h-4 rounded border-2 border-line hover:border-ember transition-colors"
                  />
                  <span className="flex-1 text-sm text-ink truncate">{item.text}</span>
                  <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 text-ink-ghost hover:text-ember text-xs">×</button>
                </div>
              ))}
              {checked.map((item) => (
                <div key={item.id} className="flex items-center gap-2 opacity-40 group">
                  <button
                    onClick={() => toggle(item.id)}
                    className="flex-shrink-0 w-4 h-4 rounded bg-ember border-2 border-ember flex items-center justify-center"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <span className="flex-1 text-sm text-ink line-through truncate">{item.text}</span>
                  <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 text-ink-ghost hover:text-ember text-xs">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matches (horizontal slider) */}
        {unchecked.length > 0 && matches.length > 0 && (
          <div className="px-6 py-4 border-t border-line">
            <h3 className="text-sm font-semibold text-ink mb-3">Recipes you can make</h3>
            <div className="-mx-6 px-6 overflow-x-auto scrollbar-none">
              <div className="flex gap-3 pb-2">
                {matches.map((match) => (
                  <a
                    key={match.slug}
                    href={`/recipe/${match.slug}`}
                    className="flex-shrink-0 w-48 border border-line rounded-xl overflow-hidden bg-panel hover:border-ember transition-colors"
                  >
                    <div className={`h-28 relative ${!match.imageUrl ? `bg-gradient-to-br ${match.gradient}` : ''}`}>
                      {match.imageUrl && <img src={match.imageUrl} alt={match.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-semibold text-ink line-clamp-2 leading-snug mb-1">{match.title}</h4>
                      <p className="text-xs text-ink-ghost mb-2">{match.cuisine} · {match.totalTime}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-ember/10 text-ember font-medium">
                        {match.haveCount}/{match.totalCount}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Sidebar (vertical) */}
      <div className="hidden md:flex md:flex-col h-full px-4 py-6 overflow-hidden">
        {/* Grocery list */}
        <div className="flex-shrink-0 border-b border-line pb-4 mb-4">
          <h2 className="text-sm font-semibold text-ink mb-3">Your ingredients</h2>
          
          {/* Add input */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              placeholder="Add ingredient..."
              className="flex-1 text-sm bg-page border border-line rounded-lg px-3 py-2 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
            />
            <button
              onClick={addItem}
              disabled={!input.trim()}
              className="px-3 py-2 rounded-lg bg-ember text-white text-sm font-medium hover:bg-ember-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>

          {/* Items list */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {unchecked.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => toggle(item.id)}
                  className="flex-shrink-0 w-4 h-4 rounded border-2 border-line hover:border-ember transition-colors"
                  aria-label="Check off"
                />
                <span className="flex-1 text-sm text-ink truncate">{item.text}</span>
                <button
                  onClick={() => remove(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-ink-ghost hover:text-ember transition-all text-xs"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            {checked.map((item) => (
              <div key={item.id} className="flex items-center gap-2 opacity-40 group">
                <button
                  onClick={() => toggle(item.id)}
                  className="flex-shrink-0 w-4 h-4 rounded bg-ember border-2 border-ember flex items-center justify-center"
                  aria-label="Uncheck"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <span className="flex-1 text-sm text-ink line-through truncate">{item.text}</span>
                <button
                  onClick={() => remove(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-ink-ghost hover:text-ember transition-all text-xs"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <p className="text-xs text-ink-ghost text-center py-4">No ingredients yet. Add some above.</p>
          )}
        </div>

        {/* Recipe matches */}
        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          <h2 className="text-sm font-semibold text-ink mb-3">
            Recipes you can make
            {unchecked.length > 0 && <span className="text-ink-ghost font-normal ml-1">({unchecked.length} ingredient{unchecked.length !== 1 ? 's' : ''})</span>}
          </h2>

          {loadingMatches && (
            <div className="flex items-center justify-center py-8 text-xs text-ink-ghost">
              <div className="w-4 h-4 border border-ember border-t-transparent rounded-full animate-spin mr-2" />
              Finding recipes...
            </div>
          )}

          {!loadingMatches && unchecked.length === 0 && (
            <p className="text-xs text-ink-ghost text-center py-8">
              Add ingredients to see what you can make.
            </p>
          )}

          {!loadingMatches && unchecked.length > 0 && matches.length === 0 && (
            <p className="text-xs text-ink-ghost text-center py-8">
              No exact matches yet. Try adding more common ingredients.
            </p>
          )}

          {!loadingMatches && matches.length > 0 && (
            <div className="space-y-3">
              {matches.map((match) => (
                <a
                  key={match.slug}
                  href={`/recipe/${match.slug}`}
                  className="block group border border-line rounded-xl overflow-hidden bg-panel hover:border-ember transition-colors"
                >
                  <div className={`h-24 relative ${!match.imageUrl ? `bg-gradient-to-br ${match.gradient}` : ''} overflow-hidden`}>
                    {match.imageUrl && (
                      <img src={match.imageUrl} alt={match.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-ink group-hover:text-ember transition-colors line-clamp-2 leading-snug mb-1">
                      {match.title}
                    </h3>
                    <p className="text-xs text-ink-ghost mb-2">{match.cuisine} · {match.totalTime}</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-ember/10 text-ember font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
                        {match.haveCount}/{match.totalCount}
                      </span>
                      {match.score >= 80 && (
                        <span className="text-[11px] text-ember font-medium">Strong match</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
