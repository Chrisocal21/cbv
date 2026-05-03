'use client'

import { useEffect, useState } from 'react'
import type { CollectionRow } from '@/lib/queries'
import { EllisDashboard } from './ellis-dashboard'
import { RexMonitor } from './rex-monitor'
import { AdminGenerator } from './admin-generator'
import { AdminDashboard } from './admin-dashboard'
import { AdminPublishedRecipes } from './admin-published-recipes'
import { AdminCollections } from './admin-collections'
import { AdminSettings } from './admin-settings'
import { PromptTuner } from './prompt-tuner'
import { PipelineViewer } from './pipeline-viewer'

type Tab = 'overview' | 'generate' | 'review' | 'published' | 'collections' | 'pipeline' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',     label: 'Overview' },
  { id: 'generate',     label: 'Generate' },
  { id: 'review',       label: 'Review' },
  { id: 'published',    label: 'Published' },
  { id: 'collections',  label: 'Collections' },
  { id: 'pipeline',     label: 'Pipeline' },
  { id: 'settings',     label: 'Settings' },
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
  const [tab, setTab] = useState<Tab>('overview')

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
      {tab === 'overview' && (
        <div className="space-y-4">
          <EllisDashboard />
          <RexMonitor />
        </div>
      )}

      {tab === 'generate' && <AdminGenerator />}

      {tab === 'review' && (
        <>
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Pending submissions</h2>
            <p className="text-sm text-ink-ghost">User and generated recipes awaiting your decision.</p>
          </div>
          <AdminDashboard />
        </>
      )}

      {tab === 'published' && (
        <>
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Published recipes</h2>
            <p className="text-sm text-ink-ghost">Manage featured status and Today&apos;s Pick.</p>
          </div>
          <AdminPublishedRecipes initialRecipes={published} />
        </>
      )}

      {tab === 'collections' && (
        <>
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Collections</h2>
            <p className="text-sm text-ink-ghost">Manage collection names, descriptions, and gradients. Add new ones here.</p>
          </div>
          <AdminCollections initialCollections={collections} />
        </>
      )}

      {tab === 'pipeline' && <PipelineViewer />}

      {tab === 'settings' && (
        <div className="space-y-4">
          <AdminSettings />
          <PromptTuner />
        </div>
      )}
    </div>
  )
}
