'use client'

import { useState, useRef, KeyboardEvent } from 'react'

export function FridgeEditor({ initialIngredients }: { initialIngredients: string[] }) {
  const [items, setItems] = useState<string[]>(initialIngredients)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addItem() {
    const val = input.trim()
    if (!val || items.includes(val)) { setInput(''); return }
    setItems((prev) => [...prev, val])
    setInput('')
    setSaved(false)
  }

  function removeItem(item: string) {
    setItems((prev) => prev.filter((i) => i !== item))
    setSaved(false)
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addItem() }
    if (e.key === 'Backspace' && input === '' && items.length > 0) {
      setItems((prev) => prev.slice(0, -1))
      setSaved(false)
    }
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/user/fridge', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fridgeIngredients: items }),
    })
    if (res.ok) setSaved(true)
    setSaving(false)
  }

  return (
    <div>
      {/* Chip input */}
      <div
        className="min-h-[80px] w-full bg-panel border border-line rounded-xl px-3 py-2 flex flex-wrap gap-2 cursor-text focus-within:border-ember transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-ember/10 text-ember text-sm border border-ember/20"
          >
            {item}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeItem(item) }}
              className="text-ember/60 hover:text-ember ml-0.5 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setSaved(false) }}
          onKeyDown={onKey}
          placeholder={items.length === 0 ? 'Add ingredients — press Enter or comma to add…' : ''}
          className="flex-1 min-w-[160px] bg-transparent text-sm text-ink placeholder:text-ink-ghost focus:outline-none py-1"
        />
      </div>
      <p className="text-xs text-ink-ghost mt-2 mb-5">Press <kbd className="bg-panel border border-line rounded px-1">Enter</kbd> or <kbd className="bg-panel border border-line rounded px-1">,</kbd> to add. The AI will use this list when suggesting recipes.</p>

      <button
        onClick={save}
        disabled={saving}
        className="text-sm font-medium bg-ember text-white px-6 py-2.5 rounded-full hover:bg-ember-deep disabled:opacity-50 transition-colors"
      >
        {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save fridge'}
      </button>
    </div>
  )
}
