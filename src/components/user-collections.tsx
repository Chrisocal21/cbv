'use client'

import { useState } from 'react'

type UserCollection = {
  id: string
  name: string
  description: string
  recipeIds: string[]
  createdAt: Date
}

type Recipe = {
  id: string
  title: string
  slug: string
  gradient: string
  cuisine: string
}

export function UserCollections({
  initialCollections,
  savedRecipes,
}: {
  initialCollections: UserCollection[]
  savedRecipes: Recipe[]
}) {
  const [collections, setCollections] = useState(initialCollections)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null)

  async function createCollection() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch('/api/user/collections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
    })
    if (res.ok) {
      const col = await res.json()
      setCollections((cs) => [col, ...cs])
      setNewName('')
      setNewDesc('')
      setCreating(false)
    }
    setSaving(false)
  }

  async function deleteCollection(id: string) {
    if (!confirm('Delete this collection?')) return
    await fetch('/api/user/collections', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setCollections((cs) => cs.filter((c) => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  async function toggleRecipe(collectionId: string, recipeId: string, inCollection: boolean) {
    const body = inCollection
      ? { id: collectionId, removeRecipeId: recipeId }
      : { id: collectionId, addRecipeId: recipeId }
    const res = await fetch('/api/user/collections', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json()
      setCollections((cs) => cs.map((c) => c.id === collectionId ? updated : c))
    }
  }

  const active = collections.find((c) => c.id === activeId)

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-dim">{collections.length} collection{collections.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setCreating((v) => !v)}
          className="text-xs font-medium bg-ember text-white px-4 py-2 rounded-full hover:bg-ember-deep transition-colors"
        >
          + New collection
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-panel border border-line rounded-xl p-5 mb-6 space-y-3">
          <h3 className="font-semibold text-ink text-sm">New collection</h3>
          <input
            type="text"
            placeholder="Collection name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createCollection()}
            className="w-full bg-page border border-line rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full bg-page border border-line rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember"
          />
          <div className="flex gap-2">
            <button
              onClick={createCollection}
              disabled={saving || !newName.trim()}
              className="text-xs font-medium bg-ember text-white px-4 py-2 rounded-full hover:bg-ember-deep disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setCreating(false)} className="text-xs text-ink-dim hover:text-ink px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {collections.length === 0 && !creating ? (
        <div className="text-center py-20 text-ink-ghost">
          <p className="text-lg font-display">No collections yet.</p>
          <p className="text-sm mt-1">Create one to organise your favourite recipes.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {collections.map((c) => {
            const recipes = savedRecipes.filter((r) => (c.recipeIds as string[]).includes(r.id))
            return (
              <div key={c.id} className="bg-panel border border-line rounded-xl overflow-hidden">
                {/* Preview strip */}
                <div className="flex h-10">
                  {recipes.slice(0, 3).map((r) => (
                    <div key={r.id} className={`flex-1 bg-gradient-to-br ${r.gradient}`} />
                  ))}
                  {recipes.length === 0 && <div className="flex-1 bg-gradient-to-br from-stone-400 to-stone-600" />}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-ink text-sm leading-tight">{c.name}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <CopyLinkButton id={c.id} />
                      <button onClick={() => deleteCollection(c.id)} className="text-xs text-ink-ghost hover:text-red-400 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                  {c.description && <p className="text-xs text-ink-dim mb-2">{c.description}</p>}
                  <p className="text-xs text-ink-ghost mb-3">{recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</p>

                  {/* Expand / collapse */}
                  <button
                    onClick={() => setActiveId(activeId === c.id ? null : c.id)}
                    className="text-xs text-ember hover:underline"
                  >
                    {activeId === c.id ? 'Close' : 'Manage recipes'}
                  </button>

                  {activeId === c.id && (
                    <div className="mt-3 space-y-2">
                      {savedRecipes.length === 0 && (
                        <p className="text-xs text-ink-ghost">Save some recipes first to add them here.</p>
                      )}
                      {savedRecipes.map((r) => {
                        const inCol = (c.recipeIds as string[]).includes(r.id)
                        return (
                          <div key={r.id} className="flex items-center justify-between gap-2">
                            <a href={`/recipe/${r.slug}`} className="text-xs text-ink hover:text-ember truncate">{r.title}</a>
                            <button
                              onClick={() => toggleRecipe(c.id, r.id, inCol)}
                              className={`text-xs shrink-0 px-2 py-1 rounded-full border transition-colors ${
                                inCol
                                  ? 'bg-ember/10 text-ember border-ember/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30'
                                  : 'bg-panel border-line text-ink-ghost hover:border-ember hover:text-ember'
                              }`}
                            >
                              {inCol ? 'Remove' : 'Add'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add-to-collection picker (shown globally for all saved recipe pages) */}
      {addingTo !== null && (
        <div className="hidden">{/* managed via recipe page */}</div>
      )}
    </div>
  )
}

function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const url = `${window.location.origin}/cookbook/${id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={copy}
      title="Copy shareable link"
      className="text-xs text-ink-ghost hover:text-ember transition-colors"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      )}
    </button>
  )
}
