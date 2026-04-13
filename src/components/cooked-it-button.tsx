'use client'

import { useState } from 'react'

interface Props {
  recipeId: string
  recipeSlug: string
  recipeTitle: string
}

export function CookedItButton({ recipeId, recipeSlug, recipeTitle }: Props) {
  const [state, setState] = useState<'idle' | 'confirm' | 'done'>('idle')
  const [servings, setServings] = useState(2)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function log() {
    setLoading(true)
    try {
      const res = await fetch('/api/user/cooked-log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipeId, recipeSlug, servings, notes }),
      })
      if (res.ok) setState('done')
      // If not ok (e.g. 401 signed-out), stay in 'confirm' state silently
    } finally {
      setLoading(false)
    }
  }

  if (state === 'done') {
    return (
      <span className="text-xs text-inbox px-4 py-2 border border-line rounded-full bg-panel flex items-center gap-1.5">
        ✅ Logged — nice work!
      </span>
    )
  }

  if (state === 'confirm') {
    return (
      <div className="p-4 bg-panel border border-line rounded-2xl space-y-3 max-w-xs">
        <p className="text-sm font-medium text-ink">Log: {recipeTitle}</p>
        <label className="block text-xs text-ink-dim">
          Servings made
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              className="w-7 h-7 rounded-full border border-line text-ink-dim hover:text-ember hover:border-ember transition-colors text-base leading-none"
            >−</button>
            <span className="text-ink text-sm w-6 text-center">{servings}</span>
            <button
              onClick={() => setServings((s) => s + 1)}
              className="w-7 h-7 rounded-full border border-line text-ink-dim hover:text-ember hover:border-ember transition-colors text-base leading-none"
            >+</button>
          </div>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes? (optional)"
          rows={2}
          className="w-full bg-page border border-line rounded-xl px-3 py-2 text-xs text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={log}
            disabled={loading}
            className="text-xs font-medium bg-ember text-white px-4 py-2 rounded-full hover:bg-ember-deep disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : 'Save to cook log'}
          </button>
          <button
            onClick={() => setState('idle')}
            className="text-xs text-ink-ghost hover:text-ink px-2 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setState('confirm')}
      className="inline-flex items-center gap-1.5 text-xs text-ink-dim hover:text-ember border border-line hover:border-ember px-4 py-2 rounded-full transition-colors"
    >
      🍳 I cooked this
    </button>
  )
}
