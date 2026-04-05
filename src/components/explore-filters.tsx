'use client'

import { useState, useMemo } from 'react'
import type { Recipe, Collection } from '@/lib/data'

type FilterState = {
  collection: Collection | 'all'
  difficulty: string
  dietary: string
  mood: string
  search: string
}

const DIFFICULTIES = ['Easy', 'Intermediate', 'Advanced']
const DIETARY = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free']

export function ExploreFilters({
  recipes,
  collectionMeta,
  initialFilters,
}: {
  recipes: Recipe[]
  collectionMeta: Record<Collection, { description: string; gradient: string }>
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
      if (filters.dietary !== 'all' && !r.dietaryTags.includes(filters.dietary as Recipe['dietaryTags'][number])) return false
      if (filters.mood !== 'all' && !r.moodTags.some((t) => t.toLowerCase() === filters.mood.toLowerCase())) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !r.title.toLowerCase().includes(q) &&
          !r.description.toLowerCase().includes(q) &&
          !r.cuisine.toLowerCase().includes(q) &&
          !r.moodTags.some((t) => t.toLowerCase().includes(q)) &&
          !r.dietaryTags.some((t) => t.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [recipes, filters])

  const set = (key: keyof FilterState, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }))

  const allMoodTags = useMemo(() => {
    const seen = new Set<string>()
    for (const r of recipes) for (const t of r.moodTags) seen.add(t)
    return Array.from(seen).sort()
  }, [recipes])

  const collections = Object.keys(collectionMeta) as Collection[]

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

      {/* Filter pills */}
      <div className="flex flex-wrap gap-x-8 gap-y-4 pb-8 border-b border-line mb-8">
        {/* Collections */}
        <div>
          <p className="text-xs tracking-widest uppercase text-ink-ghost mb-2">Collection</p>
          <div className="flex flex-wrap gap-2">
            <FilterPill active={filters.collection === 'all'} onClick={() => set('collection', 'all')}>
              All
            </FilterPill>
            {collections.map((c) => (
              <FilterPill key={c} active={filters.collection === c} onClick={() => set('collection', c)}>
                {c}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <p className="text-xs tracking-widest uppercase text-ink-ghost mb-2">Difficulty</p>
          <div className="flex flex-wrap gap-2">
            <FilterPill active={filters.difficulty === 'all'} onClick={() => set('difficulty', 'all')}>
              All
            </FilterPill>
            {DIFFICULTIES.map((d) => (
              <FilterPill key={d} active={filters.difficulty === d} onClick={() => set('difficulty', d)}>
                {d}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Dietary */}
        <div>
          <p className="text-xs tracking-widest uppercase text-ink-ghost mb-2">Dietary</p>
          <div className="flex flex-wrap gap-2">
            <FilterPill active={filters.dietary === 'all'} onClick={() => set('dietary', 'all')}>
              Any
            </FilterPill>
            {DIETARY.map((d) => (
              <FilterPill key={d} active={filters.dietary === d} onClick={() => set('dietary', d)}>
                {d}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Mood */}
        {allMoodTags.length > 0 && (
          <div>
            <p className="text-xs tracking-widest uppercase text-ink-ghost mb-2">Mood</p>
            <div className="flex flex-wrap gap-2">
              <FilterPill active={filters.mood === 'all'} onClick={() => set('mood', 'all')}>
                Any
              </FilterPill>
              {allMoodTags.map((m) => (
                <FilterPill key={m} active={filters.mood === m} onClick={() => set('mood', m)}>
                  {m}
                </FilterPill>
              ))}
            </div>
          </div>
        )}
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
              onClick={() => setFilters({ collection: 'all', difficulty: 'all', dietary: 'all', mood: 'all', search: '' })}
              className="mt-4 text-ember text-sm hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((recipe) => (
              <a
                key={recipe.id}
                href={`/recipe/${recipe.slug}`}
                className="group rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all"
              >
                <div className={`aspect-[4/3] bg-gradient-to-br ${recipe.gradient}`} />
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
        )}
      </div>
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
