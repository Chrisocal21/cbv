'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export function RecipeActions({
  recipeId,
  recipeTitle,
  isOwnerDraft = false,
}: {
  recipeId: string
  recipeTitle: string
  isOwnerDraft?: boolean
}) {
  const { isSignedIn } = useUser()
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [saveLabel, setSaveLabel] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleSave = async () => {
    if (!isSignedIn) {
      setSaveLabel('Sign in to save recipes')
      setTimeout(() => setSaveLabel(null), 2500)
      return
    }
    const res = await fetch('/api/user/save-recipe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipeId }),
    })
    if (res.ok) {
      const data = await res.json()
      setSaved(data.saved)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: recipeTitle, url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmit = async () => {
    setSubmitState('loading')
    const res = await fetch('/api/user/submit-recipe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipeId }),
    })
    if (res.ok) {
      setSubmitState('done')
      router.refresh()
    } else {
      setSubmitState('idle')
    }
  }

  return (
    <div className="flex items-center gap-3 py-5 border-b border-line flex-wrap">
      {isOwnerDraft && (
        <button
          onClick={handleSubmit}
          disabled={submitState !== 'idle'}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors bg-ember text-white border-ember hover:bg-ember/90 disabled:opacity-60"
        >
          {submitState === 'loading' ? 'Submitting…' : submitState === 'done' ? 'Submitted for review ✓' : 'Submit for review'}
        </button>
      )}
      <button
        onClick={handleSave}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
          saved
            ? 'bg-ember text-white border-ember'
            : 'bg-panel border-line text-ink-dim hover:border-ember hover:text-ink'
        }`}
      >
        <BookmarkIcon filled={saved} />
        {saveLabel ?? (saved ? 'Saved' : 'Save recipe')}
      </button>
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-line bg-panel text-ink-dim hover:border-ember hover:text-ink transition-colors"
      >
        <ShareIcon />
        {copied ? 'Link copied!' : 'Share'}
      </button>
    </div>
  )
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
