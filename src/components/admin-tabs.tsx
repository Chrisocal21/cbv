'use client'

import { useEffect, useState } from 'react'
import type { CollectionRow } from '@/lib/queries'
import { AdminGenerator } from './admin-generator'
import { AdminDashboard } from './admin-dashboard'
import { AdminPublishedRecipes } from './admin-published-recipes'
import { AdminCollections } from './admin-collections'

type Tab = 'published' | 'review' | 'generate' | 'collections'

const TABS: { id: Tab; label: string }[] = [
  { id: 'published',    label: 'Published' },
  { id: 'review',       label: 'Review' },
  { id: 'generate',     label: 'Generate' },
  { id: 'collections',  label: 'Collections' },
]

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

export function AdminTabs({
  published,
  collections,
}: {
  published: RecipeEntry[]
  collections: CollectionRow[]
}) {
  const [tab, setTab] = useState<Tab>('published')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab') as Tab | null
    if (t && TABS.some((x) => x.id === t)) setTab(t)
  }, [])

  function goTo(t: Tab) {
    setTab(t)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', t)
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-line mb-8 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => goTo(t.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'border-ember text-ember'
                : 'border-transparent text-ink-ghost hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === 'published' && (
        <>
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Published recipes</h2>
            <p className="text-sm text-ink-ghost">Manage images, featured status, and visibility.</p>
          </div>
          <AdminPublishedRecipes initialRecipes={published} />
        </>
      )}

      {tab === 'review' && (
        <>
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Review</h2>
            <p className="text-sm text-ink-ghost">Approve or reject pending recipes.</p>
          </div>
          <AdminDashboard />
        </>
      )}

      {tab === 'generate' && (
        <>
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Generate</h2>
            <p className="text-sm text-ink-ghost">Create new recipes with AI assistance.</p>
          </div>
          <AdminGenerator />
        </>
      )}

      {tab === 'collections' && (
        <>
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Collections</h2>
            <p className="text-sm text-ink-ghost">Manage collection descriptions, gradients, and images.</p>
          </div>
          <AdminCollections initialCollections={collections} />
        </>
      )}
    </div>
  )
}
