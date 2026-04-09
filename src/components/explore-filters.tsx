'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { RecipeRow } from '@/lib/queries'

const PAGE_SIZE = 12

type FilterState = {
  collection: string
  difficulty: string
  dietary: string
  mood: string
  search: string
}

const DIFFICULTIES = ['Easy', 'Intermediate', 'Advanced']
const DIETARY = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free']

export function ExploreFilters({
  recipes,
  initialFilters,
}: {
  recipes: RecipeRow[]
  initialFilters?: Partial<FilterState>
}) {
  const [filters, setFilters] = useState<FilterState>({
    collection: 'all',
    difficulty: 'all',
    dietary: 'all',
    mood: 'all',
    search: '',
    ...initialFilters,
  })

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      if (filters.collection !== 'all' && r.collection !== filters.collection) return false
      if (filters.difficulty !== 'all' && r.difficulty !== filters.difficulty) return false
      if (filters.dietary !== 'all' && !(r.dietaryTags as string[]).includes(filters.dietary)) return false
      if (filters.mood !== 'all' && !r.moodTags.some((t) => t.toLowerCase() === filters.mood.toLowerCase())) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const ingredientMatch = (r.ingredients as { group: string; items: string[] }[])
          .some((g) => g.items.some((item) => item.toLowerCase().includes(q)))
        if (
          !r.title.toLowerCase().includes(q) &&
          !r.description.toLowerCase().includes(q) &&
          !r.cuisine.toLowerCase().includes(q) &&
          !r.moodTags.some((t) => t.toLowerCase().includes(q)) &&
          !r.dietaryTags.some((t) => t.toLowerCase().includes(q)) &&
          !ingredientMatch
        ) return false
      }
      return true
    })
  }, [recipes, filters])

  const router = useRouter()
  const pathname = usePathname()
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushUrl = useCallback((next: FilterState) => {
    const params = new URLSearchParams()
    if (next.search) params.set('search', next.search)
    if (next.collection !== 'all') params.set('collection', next.collection)
    if (next.difficulty !== 'all') params.set('difficulty', next.difficulty)
    if (next.dietary !== 'all') params.set('dietary', next.dietary)
    if (next.mood !== 'all') params.set('mood', next.mood)
    const qs = params.toString()
    router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false })
  }, [router, pathname])

  const set = (key: keyof FilterState, value: string) => {
    setFilters((f) => {
      const next = { ...f, [key]: value }
      if (key === 'search') {
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(() => pushUrl(next), 400)
      } else {
        pushUrl(next)
      }
      return next
    })
  }

  const allMoodTags = useMemo(() => {
    const seen = new Set<string>()
    for (const r of recipes) for (const t of r.moodTags) seen.add(t)
    return Array.from(seen).sort()
  }, [recipes])

  const collections = useMemo(() => {
    const seen = new Set<string>()
    for (const r of recipes) if (r.collection) seen.add(r.collection)
    return Array.from(seen).sort()
  }, [recipes])

  const [page, setPage] = useState(1)
  // Reset page when filters change
  const visibleCount = page * PAGE_SIZE
  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  // Reset to page 1 whenever filters change
  useMemo(() => { setPage(1) }, [filtered])

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search recipes, cuisines, ingredients..."
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          className="w-full md:max-w-md px-4 py-3 rounded-xl border border-line bg-panel text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors text-sm"
        />
      </div>

      {/* Filters */}
      <div className="pb-6 border-b border-line mb-8 space-y-4">
        {/* Row 1: Collection */}
        <div>
          <p className="text-xs tracking-widest uppercase text-ink-ghost mb-2">Collection</p>
          <div className="flex flex-wrap gap-2">
            <FilterPill active={filters.collection === 'all'} onClick={() => set('collection', 'all')}>All</FilterPill>
            {collections.map((c) => (
              <FilterPill key={c} active={filters.collection === c} onClick={() => set('collection', c)}>{c}</FilterPill>
            ))}
          </div>
        </div>

        {/* Row 2: Difficulty + Dietary + Mood — compact selects */}
        <div className="flex flex-wrap gap-3 items-end">
          <FilterSelect
            label="Difficulty"
            value={filters.difficulty}
            onChange={(v) => set('difficulty', v)}
            options={[{ value: 'all', label: 'Any difficulty' }, ...DIFFICULTIES.map((d) => ({ value: d, label: d }))]}
          />
          <FilterSelect
            label="Dietary"
            value={filters.dietary}
            onChange={(v) => set('dietary', v)}
            options={[{ value: 'all', label: 'Any diet' }, ...DIETARY.map((d) => ({ value: d, label: d }))]}
          />
          {allMoodTags.length > 0 && (
            <FilterSelect
              label="Mood"
              value={filters.mood}
              onChange={(v) => set('mood', v)}
              options={[{ value: 'all', label: 'Any mood' }, ...allMoodTags.map((m) => ({ value: m, label: m }))]}
            />
          )}
        </div>
      </div>

      {/* Results */}
      <div>
        <p className="text-sm text-ink-ghost mb-6">
          {filtered.length} {filtered.length === 1 ? 'recipe' : 'recipes'}
        </p>
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-ghost">
            <p className="text-lg font-display">No recipes match those filters.</p>
            <button
              onClick={() => {
                const cleared = { collection: 'all', difficulty: 'all', dietary: 'all', mood: 'all', search: '' }
                setFilters(cleared)
                router.replace(pathname, { scroll: false })
              }}
              className="mt-4 text-ember text-sm hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((recipe) => (
                <a
                  key={recipe.id}
                  href={`/recipe/${recipe.slug}`}
                  className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
                >
                  <div className={`aspect-[4/3] bg-gradient-to-br ${recipe.gradient} overflow-hidden`}>
                    {recipe.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-semibold tracking-[0.12em] uppercase text-ink-ghost mb-2">
                      {recipe.collection}
                    </p>
                    <h3 className="font-display text-lg font-bold text-ink group-hover:text-ember transition-colors leading-snug mb-2">
                      {recipe.title}
                    </h3>
                    <p className="text-sm text-ink-dim mb-4 leading-relaxed line-clamp-2">
                      {recipe.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-ink-ghost">
                        <span>{recipe.totalTime}</span>
                        <span className="w-1 h-1 rounded-full bg-line" />
                        <span>{recipe.difficulty}</span>
                        {recipe.saveCount > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-line" />
                            <span><span className="text-ember">♥</span> {recipe.saveCount}</span>
                          </>
                        )}
                      </div>
                      {recipe.dietaryTags.slice(0, 1).map((t) => (
                        <span key={t} className="text-xs border border-line text-ink-ghost px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="text-sm font-medium border border-line text-ink-dim hover:border-ember hover:text-ink px-8 py-3 rounded-full transition-colors"
                >
                  Load more · {filtered.length - visibleCount} remaining
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const active = value !== 'all'
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs tracking-widest uppercase text-ink-ghost">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`text-xs font-medium px-3 py-2 rounded-xl border transition-colors bg-panel cursor-pointer focus:outline-none focus:border-ember ${
          active ? 'border-ember text-ink' : 'border-line text-ink-dim'
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function FilterPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-4 py-2 rounded-full border transition-colors ${
        active
          ? 'bg-ember text-white border-ember'
          : 'bg-panel border-line text-ink-dim hover:border-ember hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
