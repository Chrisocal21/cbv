'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type GroceryItem = { id: string; text: string; checked: boolean }

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
  missing: string[]
}

export function FridgeMatchesSidebar({ initialItems, mobile = false }: { initialItems: GroceryItem[]; mobile?: boolean }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch latest grocery items from API
      const groceryRes = await fetch('/api/user/grocery')
      if (!groceryRes.ok) return
      const { items: currentItems } = await groceryRes.json()
      
      const unchecked = currentItems.filter((i: GroceryItem) => !i.checked)
      if (unchecked.length < 2) {
        setMatches([])
        return
      }

      const pantry = unchecked.map((i: GroceryItem) => i.text)
      const res = await fetch('/api/user/fridge/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pantry, save: false }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setMatches(data.matches ?? [])
      }
    } catch {
      // Ignore errors
    } finally {
      setLoading(false)
    }
  }, [])

  // Listen for grocery updates via custom event
  useEffect(() => {
    const handleGroceryUpdate = () => {
      fetchMatches()
    }
    
    window.addEventListener('grocery-updated', handleGroceryUpdate)
    
    return () => {
      window.removeEventListener('grocery-updated', handleGroceryUpdate)
    }
  }, [fetchMatches])

  // Fetch matches on mount
  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const top = matches.slice(0, 8)

  if (mobile) {
    // Mobile: Horizontal slider
    return (
      <div>
        <div className="mb-4">
          <h2 className="font-display text-xl font-bold text-ink mb-1">Recipes you can make</h2>
          <p className="text-sm text-ink-ghost">Based on what&rsquo;s in your list</p>
        </div>

        {loading && matches.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-8 px-4 border border-line rounded-xl bg-panel">
            <p className="text-sm text-ink-ghost">Add at least 2 items to your list to see recipe matches.</p>
          </div>
        ) : (
          <div className="-mx-6 px-6 overflow-x-auto scrollbar-none">
            <div className="flex gap-3 pb-2">
              {top.map((m) => (
                <Link
                  key={m.slug}
                  href={`/recipe/${m.slug}`}
                  className="group flex-shrink-0 w-64 rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
                >
                  <div className={`h-40 overflow-hidden relative ${!m.imageUrl ? `bg-gradient-to-br ${m.gradient}` : ''}`}>
                    {m.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.imageUrl} alt={m.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-medium">
                        {m.cuisine.slice(0, 3).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-display text-base font-bold text-ink group-hover:text-ember transition-colors leading-snug line-clamp-2 mb-2">
                      {m.title}
                    </h3>
                    <p className="text-xs text-ink-ghost mb-3">{m.cuisine} · {m.totalTime}</p>
                    
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ember bg-ember/10 px-2 py-1 rounded-full">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {m.haveCount}/{m.totalCount}
                      </span>
                      {m.score >= 0.8 && (
                        <span className="text-xs font-medium text-ink-ghost">Strong match</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop: Sidebar
  return (
    <div className="w-96 border-l border-line bg-panel overflow-y-auto">
      <div className="p-6 border-b border-line sticky top-0 bg-panel z-10">
        <h2 className="font-display text-xl font-bold text-ink mb-1">Recipes you can make</h2>
        <p className="text-sm text-ink-ghost">Based on what&rsquo;s in your list</p>
      </div>

      <div className="p-6">
        {loading && matches.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-ember border-t-transparent rounded-full animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-ink-ghost">Add at least 2 items to your list to see recipe matches.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {top.map((m) => (
              <Link
                key={m.slug}
                href={`/recipe/${m.slug}`}
                className="group flex gap-3 rounded-xl overflow-hidden border border-line bg-page hover:border-ember transition-all p-3"
              >
                <div className={`w-20 h-20 shrink-0 rounded-lg overflow-hidden relative ${!m.imageUrl ? `bg-gradient-to-br ${m.gradient}` : ''}`}>
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt={m.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60 text-xs font-medium">
                      {m.cuisine.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="min-w-0 flex-1 flex flex-col">
                  <h3 className="font-display text-base font-bold text-ink group-hover:text-ember transition-colors leading-snug line-clamp-2 mb-1">
                    {m.title}
                  </h3>
                  <p className="text-xs text-ink-ghost mb-2">{m.cuisine} · {m.totalTime}</p>
                  
                  <div className="mt-auto flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ember bg-ember/10 px-2 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {m.haveCount}/{m.totalCount}
                    </span>
                    {m.score >= 0.8 && (
                      <span className="text-xs font-medium text-ink-ghost">Strong match</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
