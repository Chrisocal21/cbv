'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'

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
  missing: string[]
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export function GroceryChecklist({
  initialItems,
  showMatches = true,
}: {
  initialItems: Item[]
  showMatches?: boolean
}) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const firstRender = useRef(true)

  // ── Autosave (debounced) ───────────────────────────────────────────────
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const t = setTimeout(() => {
      fetch('/api/user/grocery', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items }),
      })
        .then(() => {
          // Notify other components that grocery list updated
          window.dispatchEvent(new CustomEvent('grocery-updated'))
        })
        .catch(() => {})
    }, 600)
    return () => clearTimeout(t)
  }, [items])

  // ── Mutations ──────────────────────────────────────────────────────────
  function addItem() {
    const val = input.trim()
    if (!val) return
    // Split on commas so "milk, eggs, bread" adds three items at once.
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

  function startEdit(item: Item) {
    setEditingId(item.id)
    setEditText(item.text)
    setTimeout(() => editRef.current?.focus(), 0)
  }

  function commitEdit() {
    const val = editText.trim()
    setItems((prev) =>
      val
        ? prev.map((i) => (i.id === editingId ? { ...i, text: val } : i))
        : prev.filter((i) => i.id !== editingId),
    )
    setEditingId(null)
    setEditText('')
  }

  function clearChecked() {
    setItems((prev) => prev.filter((i) => !i.checked))
  }

  function onAddKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addItem() }
  }

  function onEditKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditingId(null); setEditText('') }
  }

  const remaining = items.filter((i) => !i.checked)
  const done = items.filter((i) => i.checked)
  // Unchecked first (in order), checked sink to the bottom.
  const ordered = [...remaining, ...done]

  return (
    <div>
      {/* Add bar */}
      <div className="flex items-center gap-2 bg-panel border border-line rounded-xl px-3 py-2 focus-within:border-ember transition-colors">
        <svg className="w-5 h-5 text-ink-ghost shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onAddKey}
          enterKeyHint="done"
          placeholder="Add an item…"
          className="flex-1 bg-transparent text-base text-ink placeholder:text-ink-ghost focus:outline-none py-1.5"
        />
        {input.trim() && (
          <button
            type="button"
            onClick={addItem}
            className="text-sm font-medium bg-ember text-white px-4 py-1.5 rounded-full hover:bg-ember-deep transition-colors shrink-0"
          >
            Add
          </button>
        )}
      </div>

      {/* Progress — at-a-glance basket completion */}
      {items.length > 0 && (
        <div className="mt-5 mb-3">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <p className="text-sm text-ink-dim">
              {remaining.length > 0
                ? <><span className="font-semibold text-ink">{remaining.length}</span> still to get</>
                : <span className="font-semibold text-ember">All done — basket&rsquo;s full</span>}
            </p>
            {done.length > 0 && (
              <button onClick={clearChecked} className="text-xs text-ink-ghost hover:text-ember transition-colors">
                Clear {done.length} checked
              </button>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-line/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-ember transition-all duration-500"
              style={{ width: `${items.length ? (done.length / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* The list */}
      {items.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-sm text-ink-dim">Your list is empty. Add what you need above — it saves automatically and stays here for the shop.</p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {ordered.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-1 group">
              {/* Checkbox — big tap target */}
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-label={item.checked ? 'Uncheck' : 'Check off'}
                className={`shrink-0 w-9 h-9 -ml-1 flex items-center justify-center rounded-lg transition-colors ${item.checked ? 'text-ember' : 'text-ink-ghost hover:text-ink'}`}
              >
                {item.checked ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="4" className="fill-ember/15" stroke="currentColor" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.5l2.5 2.5L16 9.5" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                  </svg>
                )}
              </button>

              {/* Text / inline edit */}
              {editingId === item.id ? (
                <input
                  ref={editRef}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={onEditKey}
                  onBlur={commitEdit}
                  className="flex-1 bg-transparent text-base text-ink focus:outline-none border-b border-ember py-2"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className={`flex-1 text-left text-base py-2.5 transition-colors ${item.checked ? 'text-ink-ghost line-through' : 'text-ink'}`}
                >
                  {item.text}
                </button>
              )}

              {/* Delete */}
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.text}`}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-ink-ghost hover:text-ember opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showMatches && <RecipeMatches items={items} />}
    </div>
  )
}

// ── Quiet helper: recipes you could make from what's on the list ───────────
function RecipeMatches({ items }: { items: Item[] }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [open, setOpen] = useState(false)

  const texts = items.map((i) => i.text).join('|')
  const itemCount = items.length

  useEffect(() => {
    const list = texts.split('|').filter(Boolean)
    if (list.length < 2) return
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/user/fridge/matches', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pantry: list, save: false }),
        })
        if (res.ok) {
          const data = await res.json()
          setMatches(data.matches ?? [])
        }
      } catch { /* non-fatal */ }
    }, 700)
    return () => clearTimeout(t)
  }, [texts])

  // Hide matches when the list is too short to be meaningful.
  if (itemCount < 2 || matches.length === 0) return null

  const top = matches.slice(0, 6)

  return (
    <div className="mt-10 border-t border-line pt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-ember transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Recipes you could make from this
        <span className="text-xs font-normal text-ink-ghost">({matches.length})</span>
      </button>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {top.map((m) => (
            <a
              key={m.slug}
              href={`/recipe/${m.slug}`}
              className="group flex gap-3 rounded-xl overflow-hidden border border-line bg-panel hover:border-ember transition-all p-2.5"
            >
              <div className={`w-14 h-14 shrink-0 rounded-lg overflow-hidden relative ${!m.imageUrl ? `bg-gradient-to-br ${m.gradient}` : ''}`}>
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt={m.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ember">{Math.round(m.score * 100)}% from your list</p>
                <h3 className="font-display text-sm font-bold text-ink group-hover:text-ember transition-colors leading-snug line-clamp-2">{m.title}</h3>
                <p className="text-xs text-ink-ghost mt-0.5">{m.cuisine} · {m.totalTime}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
