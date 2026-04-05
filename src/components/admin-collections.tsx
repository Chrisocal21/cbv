'use client'

import { useState } from 'react'
import type { CollectionRow } from '@/lib/queries'

const GRADIENT_OPTIONS = [
  { label: 'Amber → Orange', value: 'from-amber-700 to-orange-600' },
  { label: 'Green → Emerald', value: 'from-green-700 to-emerald-500' },
  { label: 'Neutral → Stone', value: 'from-neutral-700 to-stone-500' },
  { label: 'Blue → Cyan', value: 'from-blue-700 to-cyan-500' },
  { label: 'Yellow → Amber', value: 'from-yellow-700 to-amber-500' },
  { label: 'Purple → Violet', value: 'from-purple-700 to-violet-500' },
  { label: 'Rose → Pink', value: 'from-rose-700 to-pink-500' },
  { label: 'Teal → Cyan', value: 'from-teal-700 to-cyan-500' },
  { label: 'Indigo → Blue', value: 'from-indigo-700 to-blue-500' },
]

export function AdminCollections({ initialCollections }: { initialCollections: CollectionRow[] }) {
  const [rows, setRows] = useState(initialCollections)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editGradient, setEditGradient] = useState('')
  const [saving, setSaving] = useState(false)

  // Create state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newGradient, setNewGradient] = useState(GRADIENT_OPTIONS[0].value)
  const [creating, setCreating] = useState(false)

  function startEdit(row: CollectionRow) {
    setEditingId(row.id)
    setEditDesc(row.description)
    setEditGradient(row.gradient)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const res = await fetch('/api/admin/collections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, description: editDesc, gradient: editGradient }),
    })
    if (res.ok) {
      const updated: CollectionRow = await res.json()
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
      setEditingId(null)
    }
    setSaving(false)
  }

  async function createCollection() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/admin/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc, gradient: newGradient }),
    })
    if (res.ok) {
      const created: CollectionRow = await res.json()
      setRows((prev) => [...prev, created])
      setNewName('')
      setNewDesc('')
      setNewGradient(GRADIENT_OPTIONS[0].value)
      setShowCreate(false)
    }
    setCreating(false)
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-line bg-panel p-5">
          {editingId === row.id ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-1">
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${editGradient} flex-shrink-0`} />
                <span className="font-display font-bold text-ink">{row.name}</span>
                <span className="text-xs text-ink-ghost ml-auto">/collections/{row.slug}</span>
              </div>
              <textarea
                className="w-full bg-page border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember resize-none"
                rows={2}
                placeholder="Description"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
              <div>
                <label className="text-xs text-ink-ghost mb-1 block">Gradient</label>
                <select
                  className="w-full bg-page border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-ember"
                  value={editGradient}
                  onChange={(e) => setEditGradient(e.target.value)}
                >
                  {GRADIENT_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label} — {g.value}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => saveEdit(row.id)}
                  disabled={saving}
                  className="text-xs font-medium bg-ember text-white px-4 py-1.5 rounded-full hover:bg-ember-deep disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-xs text-ink-ghost hover:text-ink px-3 py-1.5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${row.gradient} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3">
                  <span className="font-display font-bold text-ink">{row.name}</span>
                  <span className="text-xs text-ink-ghost">/collections/{row.slug}</span>
                </div>
                <p className="text-sm text-ink-dim mt-0.5 leading-relaxed">
                  {row.description || <span className="italic text-ink-ghost">No description</span>}
                </p>
              </div>
              <button
                onClick={() => startEdit(row)}
                className="text-xs text-ink-ghost hover:text-ember transition-colors flex-shrink-0"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Create new collection */}
      {showCreate ? (
        <div className="rounded-xl border border-ember/40 bg-panel p-5 space-y-3">
          <p className="font-display font-bold text-ink text-sm mb-1">New collection</p>
          <input
            type="text"
            placeholder="Collection name (e.g. Fermentation Lab)"
            className="w-full bg-page border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <textarea
            placeholder="Short description (optional)"
            className="w-full bg-page border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember resize-none"
            rows={2}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div>
            <label className="text-xs text-ink-ghost mb-1 block">Gradient</label>
            <select
              className="w-full bg-page border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-ember"
              value={newGradient}
              onChange={(e) => setNewGradient(e.target.value)}
            >
              {GRADIENT_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label} — {g.value}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={createCollection}
              disabled={creating || !newName.trim()}
              className="text-xs font-medium bg-ember text-white px-4 py-1.5 rounded-full hover:bg-ember-deep disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating…' : 'Create collection'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs text-ink-ghost hover:text-ink px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full rounded-xl border border-dashed border-line hover:border-ember text-ink-ghost hover:text-ember text-sm py-4 transition-colors"
        >
          + Add collection
        </button>
      )}
    </div>
  )
}
