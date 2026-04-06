'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function VariationButton({ parentSlug }: { parentSlug: string }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'confirm' | 'loading'>('idle')
  const [note, setNote] = useState('')

  async function fork() {
    setState('loading')
    const res = await fetch('/api/user/submit-variation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parentSlug, variationNote: note }),
    })
    if (res.ok) {
      const { slug } = await res.json()
      router.push(`/recipe/${slug}/edit`)
    }
    setState('idle')
  }

  if (state === 'confirm') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <input
          autoFocus
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Briefly describe your twist (optional)"
          className="text-xs bg-panel border border-line rounded-full px-3 py-1.5 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember w-56"
        />
        <button
          onClick={fork}
          className="text-xs font-medium bg-ember text-white px-3 py-1.5 rounded-full hover:bg-ember-deep transition-colors"
        >
          Create variation
        </button>
        <button
          onClick={() => setState('idle')}
          className="text-xs text-ink-ghost hover:text-ink px-2 py-1"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setState('confirm')}
      className="inline-flex items-center gap-1.5 text-xs text-ink-dim hover:text-ember border border-line hover:border-ember px-4 py-2 rounded-full transition-colors"
    >
      🍴 Submit a variation
    </button>
  )
}
