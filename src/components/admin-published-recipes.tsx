'use client'

import { useState } from 'react'

type RecipeEntry = {
  id: string
  title: string
  slug: string
  cuisine: string
  collection: string
  isFeatured: boolean
  createdAt: Date
}

export function AdminPublishedRecipes({ initialRecipes }: { initialRecipes: RecipeEntry[] }) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [toggling, setToggling] = useState<string | null>(null)

  const toggle = async (id: string, currentlyFeatured: boolean) => {
    setToggling(id)
    const res = await fetch('/api/admin/feature-recipe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipeId: id, featured: !currentlyFeatured }),
    })
    if (res.ok) {
      setRecipes((prev) =>
        prev.map((r) => ({
          ...r,
          isFeatured: r.id === id ? !currentlyFeatured : currentlyFeatured ? false : r.isFeatured,
        }))
      )
    }
    setToggling(null)
  }

  if (recipes.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel p-10 text-center text-ink-ghost text-sm">
        No published recipes yet.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-panel">
            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-ghost">Recipe</th>
            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-ghost hidden md:table-cell">Collection</th>
            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-ghost hidden md:table-cell">Cuisine</th>
            <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-ghost">Today&apos;s Pick</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((r, i) => (
            <tr key={r.id} className={`border-b border-line last:border-0 ${i % 2 === 0 ? 'bg-page' : 'bg-panel'}`}>
              <td className="px-5 py-3">
                <a href={`/recipe/${r.slug}`} target="_blank" rel="noopener"
                  className="font-medium text-ink hover:text-ember transition-colors line-clamp-1">
                  {r.title}
                </a>
              </td>
              <td className="px-5 py-3 text-ink-ghost hidden md:table-cell">{r.collection}</td>
              <td className="px-5 py-3 text-ink-ghost hidden md:table-cell">{r.cuisine}</td>
              <td className="px-5 py-3 text-right">
                <button
                  disabled={toggling === r.id}
                  onClick={() => toggle(r.id, r.isFeatured)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                    r.isFeatured
                      ? 'bg-ember text-white border-ember hover:bg-ember-deep'
                      : 'bg-panel border-line text-ink-ghost hover:border-ember hover:text-ember'
                  }`}
                >
                  {r.isFeatured ? '★ Featured' : 'Set as pick'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
