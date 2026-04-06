'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

type UserCollection = { id: string; name: string; recipeIds: string[] }

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
  const [collOpen, setCollOpen] = useState(false)
  const [collections, setCollections] = useState<UserCollection[] | null>(null)
  const [collStatus, setCollStatus] = useState<Record<string, boolean>>({})
  const collRef = useRef<HTMLDivElement>(null)

  async function openCollections() {
    if (!isSignedIn) return
    if (!collOpen && !collections) {
      const res = await fetch('/api/user/collections')
      if (res.ok) setCollections(await res.json())
    }
    setCollOpen((v) => !v)
  }

  async function toggleColl(collId: string, inColl: boolean) {
    const key = inColl ? 'removeRecipeId' : 'addRecipeId'
    const res = await fetch('/api/user/collections', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: collId, [key]: recipeId }),
    })
    if (res.ok) {
      const updated: UserCollection = await res.json()
      setCollections((cs) => cs?.map((c) => c.id === collId ? updated : c) ?? null)
      setCollStatus((s) => ({ ...s, [collId]: !inColl }))
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!collOpen) return
    function handle(e: MouseEvent) {
      if (collRef.current && !collRef.current.contains(e.target as Node)) setCollOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [collOpen])

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

      {isSignedIn && (
        <div className="relative" ref={collRef}>
          <button
            onClick={openCollections}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-line bg-panel text-ink-dim hover:border-ember hover:text-ink transition-colors"
          >
            <FolderIcon />
            Add to collection
          </button>
          {collOpen && (
            <div className="absolute left-0 top-full mt-2 z-40 w-60 bg-panel border border-line rounded-xl shadow-lg overflow-hidden">
              {!collections ? (
                <p className="text-xs text-ink-ghost px-4 py-3">Loading…</p>
              ) : collections.length === 0 ? (
                <div className="px-4 py-3">
                  <p className="text-xs text-ink-ghost mb-2">No collections yet.</p>
                  <a href="/profile?tab=collections" className="text-xs text-ember hover:underline">Create one on your profile →</a>
                </div>
              ) : (
                <ul className="py-1">
                  {collections.map((c) => {
                    const inColl = (c.recipeIds as string[]).includes(recipeId) || !!collStatus[c.id]
                    const wasToggled = c.id in collStatus
                    const effectiveIn = wasToggled ? collStatus[c.id] : inColl
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => toggleColl(c.id, effectiveIn)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-page transition-colors"
                        >
                          <span className="text-ink truncate">{c.name}</span>
                          <span className={`text-xs shrink-0 ${effectiveIn ? 'text-ember' : 'text-ink-ghost'}`}>
                            {effectiveIn ? '✓ Added' : 'Add'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  <li className="border-t border-line">
                    <a href="/profile?tab=collections" className="block px-4 py-2.5 text-xs text-ink-ghost hover:text-ember transition-colors">
                      Manage collections →
                    </a>
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>
      )}
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

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}
