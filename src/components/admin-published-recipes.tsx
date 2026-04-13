'use client'

import React, { useState, useMemo } from 'react'

const PAGE_SIZE = 20

type RecipeEntry = {
  id: string
  title: string
  slug: string
  cuisine: string
  collection: string
  isFeatured: boolean
  viewCount: number
  saveCount: number
  imageUrl: string | null
  createdAt: Date
}

type EditState = {
  title: string
  subtitle: string
  description: string
  collection: string
  cuisine: string
  difficulty: string
  prepTime: string
  cookTime: string
  totalTime: string
  servings: string
  gradient: string
  originStory: string
}

export function AdminPublishedRecipes({ initialRecipes }: { initialRecipes: RecipeEntry[] }) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [toggling, setToggling] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [generatingImg, setGeneratingImg] = useState<string | null>(null)
  const [imgError, setImgError] = useState<string | null>(null)
  const [imgMode, setImgMode] = useState<'real' | 'expectation'>('real')
  const [bulkRegen, setBulkRegen] = useState<{ done: number; total: number } | null>(null)
  const [theoTask, setTheoTask] = useState<string | null>(null)
  const [theoOutput, setTheoOutput] = useState<{ label: string; text: string } | null>(null)

  const generateImage = async (id: string) => {
    setGeneratingImg(id)
    setImgError(null)
    const res = await fetch('/api/admin/generate-image', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipeId: id, mode: imgMode }),
    })
    if (res.ok) {
      const { imageUrl } = await res.json()
      setRecipes((prev) => prev.map((r) => r.id === id ? { ...r, imageUrl } : r))
    } else {
      const data = await res.json().catch(() => ({}))
      setImgError(data.error ?? `HTTP ${res.status}`)
    }
    setGeneratingImg(null)
  }

  const bulkRegenAll = async () => {
    const withImages = recipes.filter((r) => r.imageUrl !== null)
    if (withImages.length === 0) return
    setBulkRegen({ done: 0, total: withImages.length })
    setImgError(null)
    for (let i = 0; i < withImages.length; i++) {
      const r = withImages[i]
      const res = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipeId: r.id, mode: imgMode }),
      })
      if (res.ok) {
        const { imageUrl } = await res.json()
        setRecipes((prev) => prev.map((p) => p.id === r.id ? { ...p, imageUrl } : p))
      }
      setBulkRegen({ done: i + 1, total: withImages.length })
    }
    setBulkRegen(null)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return recipes
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.collection.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q)
    )
  }, [recipes, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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

  const startEdit = async (id: string) => {
    setLoadingEdit(true)
    setEditingId(id)
    const res = await fetch(`/api/admin/recipes/${id}`)
    if (res.ok) {
      const data = await res.json()
      setEditState({
        title: data.title ?? '',
        subtitle: data.subtitle ?? '',
        description: data.description ?? '',
        collection: data.collection ?? '',
        cuisine: data.cuisine ?? '',
        difficulty: data.difficulty ?? '',
        prepTime: data.prepTime ?? '',
        cookTime: data.cookTime ?? '',
        totalTime: data.totalTime ?? '',
        servings: data.servings ?? '',
        gradient: data.gradient ?? '',
        originStory: data.originStory ?? '',
      })
    }
    setLoadingEdit(false)
  }

  const runTheo = async (task: string, recipeId: string, label: string) => {
    setTheoTask(task)
    setTheoOutput(null)
    const res = await fetch('/api/admin/theo-editorial', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task, recipeId }),
    })
    if (res.ok) {
      const data = await res.json()
      if (task === 'recipe-headline') {
        setEditState((s) => s ? { ...s, title: data.title ?? s.title, subtitle: data.subtitle ?? s.subtitle } : s)
        setTheoOutput(null)
      } else {
        setTheoOutput({ label, text: data.text ?? '' })
      }
    }
    setTheoTask(null)
  }

  const saveEdit = async (id: string) => {
    if (!editState) return
    setSaving(true)
    const res = await fetch(`/api/admin/recipes/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(editState),
    })
    if (res.ok) {
      setRecipes((prev) =>
        prev.map((r) => r.id === id ? { ...r, title: editState.title, collection: editState.collection, cuisine: editState.cuisine } : r)
      )
      setEditingId(null)
      setEditState(null)
    }
    setSaving(false)
  }

  const field = (key: keyof EditState, label: string, multiline = false) => (
    <div>
      <label className="text-xs text-ink-ghost block mb-1">{label}</label>
      {multiline ? (
        <textarea
          rows={3}
          value={editState?.[key] ?? ''}
          onChange={(e) => setEditState((s) => s ? { ...s, [key]: e.target.value } : s)}
          className="w-full bg-page border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-ember resize-none"
        />
      ) : (
        <input
          type="text"
          value={editState?.[key] ?? ''}
          onChange={(e) => setEditState((s) => s ? { ...s, [key]: e.target.value } : s)}
          className="w-full bg-page border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-ember"
        />
      )}
    </div>
  )

  if (recipes.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel p-10 text-center text-ink-ghost text-sm">
        No published recipes yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search + count */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Filter by title, collection, cuisine…"
          className="flex-1 bg-panel border border-line rounded-lg px-4 py-2 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
        />
        <span className="text-xs text-ink-ghost whitespace-nowrap">
          {filtered.length} of {recipes.length}
        </span>
      </div>

      {/* Bulk regen controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={imgMode}
          onChange={(e) => setImgMode(e.target.value as 'real' | 'expectation')}
          className="text-xs bg-panel border border-line rounded px-2 py-1 text-ink-ghost focus:outline-none focus:border-ember"
          title="Image style mode"
        >
          <option value="real">Real (imperfect)</option>
          <option value="expectation">Expectation (clean)</option>
        </select>
        <button
          disabled={!!bulkRegen}
          onClick={bulkRegenAll}
          className="text-xs px-3 py-1.5 rounded-full border border-line text-ink-ghost hover:border-ember hover:text-ember disabled:opacity-40 transition-colors"
        >
          {bulkRegen
            ? `Regenerating… ${bulkRegen.done}/${bulkRegen.total}`
            : `Regen all w/ images (${recipes.filter((r) => r.imageUrl !== null).length})`}
        </button>
      </div>

      {/* Error toast */}
      {imgError && (
        <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-2.5 rounded-lg">
          <span>Image generation failed: {imgError}</span>
          <button onClick={() => setImgError(null)} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

    <div className="rounded-xl border border-line overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-panel">
            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-ghost">Recipe</th>
            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-ghost hidden md:table-cell">Collection</th>
            <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-ghost hidden md:table-cell">Cuisine</th>
            <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-ghost hidden md:table-cell">Views</th>
            <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-ghost hidden md:table-cell">Saves</th>
            <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-ghost">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((r, i) => (
            <React.Fragment key={r.id}>
              <tr className={`border-b border-line ${editingId === r.id ? '' : 'last:border-0'} ${i % 2 === 0 ? 'bg-page' : 'bg-panel'}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-line bg-panel">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ink-ghost text-lg">🍽</div>
                      )}
                    </div>
                    <a href={`/recipe/${r.slug}`} target="_blank" rel="noopener"
                      className="font-medium text-ink hover:text-ember transition-colors line-clamp-1">
                      {r.title}
                    </a>
                  </div>
                </td>
                <td className="px-5 py-3 text-ink-ghost hidden md:table-cell">{r.collection}</td>
                <td className="px-5 py-3 text-ink-ghost hidden md:table-cell">{r.cuisine}</td>
                <td className="px-5 py-3 text-ink-ghost text-right hidden md:table-cell">{r.viewCount.toLocaleString()}</td>
                <td className="px-5 py-3 text-ink-ghost text-right hidden md:table-cell">{r.saveCount.toLocaleString()}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">

                    <button
                      disabled={generatingImg === r.id}
                      onClick={() => generateImage(r.id)}
                      title={r.imageUrl ? 'Regenerate photo' : 'Generate photo'}
                      className={`text-xs px-2 py-1 transition-colors ${
                        r.imageUrl ? 'text-green-400 hover:text-ember' : 'text-ink-ghost hover:text-ember'
                      } disabled:opacity-40`}
                    >
                      {generatingImg === r.id ? '⏳' : r.imageUrl ? '📷✓' : '📷'}
                    </button>
                    <button
                      onClick={() => editingId === r.id ? (setEditingId(null), setEditState(null)) : startEdit(r.id)}
                      className="text-xs text-ink-ghost hover:text-ember transition-colors px-2 py-1"
                    >
                      {editingId === r.id ? 'Cancel' : 'Edit'}
                    </button>
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
                  </div>
                </td>
              </tr>
              {editingId === r.id && (
                <tr key={`${r.id}-edit`} className={`border-b border-line last:border-0 ${i % 2 === 0 ? 'bg-page' : 'bg-panel'}`}>
                  <td colSpan={4} className="px-5 py-5">
                    {loadingEdit ? (
                      <p className="text-sm text-ink-ghost">Loading…</p>
                    ) : editState ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {field('title', 'Title')}
                          {field('subtitle', 'Subtitle')}
                          {field('collection', 'Collection')}
                          {field('cuisine', 'Cuisine')}
                          {field('difficulty', 'Difficulty')}
                          {field('gradient', 'Gradient')}
                          {field('prepTime', 'Prep time')}
                          {field('cookTime', 'Cook time')}
                          {field('totalTime', 'Total time')}
                          {field('servings', 'Servings')}
                        </div>
                        {field('description', 'Description', true)}
                        {field('originStory', 'Origin story', true)}

                        {/* Theo editorial tools */}
                        <div className="border-t border-line pt-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-3">✍ Theo</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={!!theoTask}
                              onClick={() => runTheo('recipe-headline', r.id, 'Headline')}
                              title="Theo suggests a better title and subtitle — auto-fills the fields above"
                              className="text-xs px-3 py-1.5 rounded-full border border-line text-ink-ghost hover:border-ember hover:text-ember disabled:opacity-40 transition-colors"
                            >
                              {theoTask === 'recipe-headline' ? 'Thinking…' : 'Suggest headline'}
                            </button>
                            <button
                              disabled={!!theoTask}
                              onClick={() => runTheo('editorial-intro', r.id, 'Editorial intro')}
                              title="Theo writes an editorial intro for Today's Pick usage"
                              className="text-xs px-3 py-1.5 rounded-full border border-line text-ink-ghost hover:border-ember hover:text-ember disabled:opacity-40 transition-colors"
                            >
                              {theoTask === 'editorial-intro' ? 'Thinking…' : 'Editorial intro'}
                            </button>
                            <button
                              disabled={!!theoTask}
                              onClick={() => runTheo('feature-pitch', r.id, 'Feature pitch')}
                              title="Theo writes a feature pitch — why this recipe, why now"
                              className="text-xs px-3 py-1.5 rounded-full border border-line text-ink-ghost hover:border-ember hover:text-ember disabled:opacity-40 transition-colors"
                            >
                              {theoTask === 'feature-pitch' ? 'Thinking…' : 'Feature pitch'}
                            </button>
                          </div>
                          {theoOutput && (
                            <div className="mt-3 rounded-lg border border-line bg-page p-4">
                              <p className="text-xs font-semibold text-ink-ghost mb-2">{theoOutput.label}</p>
                              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{theoOutput.text}</p>
                              <button
                                onClick={() => setTheoOutput(null)}
                                className="mt-2 text-xs text-ink-ghost hover:text-ink transition-colors"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => saveEdit(r.id)}
                            disabled={saving}
                            className="text-xs font-medium bg-ember text-white px-5 py-2 rounded-full hover:bg-ember-deep disabled:opacity-50 transition-colors"
                          >
                            {saving ? 'Saving…' : 'Save changes'}
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditState(null) }}
                            className="text-xs text-ink-ghost hover:text-ink px-3 py-2 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-ink-ghost pt-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-line hover:border-ember hover:text-ember disabled:opacity-30 transition-colors"
          >
            ← Prev
          </button>
          <span>
            Page {page + 1} of {totalPages} · {filtered.length} recipes
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg border border-line hover:border-ember hover:text-ember disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

