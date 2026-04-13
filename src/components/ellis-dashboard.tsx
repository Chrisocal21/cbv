'use client'

import { useEffect, useState } from 'react'

type CollectionCount = { name: string; count: number; gap: boolean }

type PersonaStat = {
  persona: string
  name: string
  outcomes: { created: number; pass: number; flag: number; reject: number; total: number }
  flagRate: number
  rejectRate: number
}

type DigestData = {
  generatedAt: string
  week: {
    recipesCreated: number
    submissionsReviewed: number
    pendingQueue: number
  }
  collections: CollectionCount[]
  gaps: CollectionCount[]
  tokens: {
    thisMonth: number
    byPersona: { persona: string; name: string; tokensIn: number; tokensOut: number; total: number }[]
  }
  budgetPercent: number
  personaStats: PersonaStat[]
  recentActivity: {
    persona: string
    actionType: string
    outcome: string
    notes: string | null
    createdAt: string
  }[]
}

function personaColor(persona: string) {
  const map: Record<string, string> = {
    marco:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
    celeste: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    nadia:   'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    theo:    'bg-sky-500/20 text-sky-400 border-sky-500/30',
    soren:   'bg-teal-500/20 text-teal-400 border-teal-500/30',
    ellis:   'bg-violet-500/20 text-violet-400 border-violet-500/30',
    rex:     'bg-stone-500/20 text-stone-400 border-stone-500/30',
  }
  return map[persona] ?? 'bg-panel text-ink-ghost border-line'
}

// Which persona runs each collection
function personaForCollection(name: string): 'marco' | 'celeste' | 'nadia' {
  if (name === 'Baking Alchemy') return 'celeste'
  return 'marco'
}

type BatchJob = {
  collection: string
  persona: 'marco' | 'celeste' | 'nadia'
  count: number
}

type BatchResult = {
  personaName: string
  collection: string
  created: number
  results: { title: string; confidenceScore: number; recommendedAction: string }[]
  errors: string[]
}

export function EllisDashboard() {
  const [data, setData] = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(true)
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)
  const [batchError, setBatchError] = useState('')

  useEffect(() => {
    fetch('/api/admin/digest')
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  async function runBatch() {
    if (!batchJob) return
    setBatchRunning(true)
    setBatchResult(null)
    setBatchError('')

    const res = await fetch('/api/admin/staff/create-batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(batchJob),
    })

    if (res.ok) {
      const result = await res.json()
      setBatchResult(result)
      // Refresh digest counts
      fetch('/api/admin/digest').then((r) => r.ok ? r.json() : null).then(setData)
    } else {
      setBatchError('Batch run failed. Check the console.')
    }
    setBatchRunning(false)
  }

  return (
    <div className="rounded-2xl border border-line bg-panel overflow-hidden mb-8">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-7 py-5 hover:bg-panel-raised transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-violet-400" />
          <span className="font-display text-lg font-bold text-ink">Ellis</span>
          <span className="text-xs text-ink-ghost border border-line rounded px-2 py-0.5">Platform Manager</span>
          {data?.gaps && data.gaps.length > 0 && (
            <span className="text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-2 py-0.5">
              {data.gaps.length} gap{data.gaps.length > 1 ? 's' : ''} detected
            </span>
          )}
          {data?.budgetPercent !== undefined && (
            <span className={`text-xs font-semibold border rounded px-2 py-0.5 ${
              data.budgetPercent >= 95
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : data.budgetPercent >= 80
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              {data.budgetPercent}% budget
            </span>
          )}
        </div>
        <span className="text-ink-ghost text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-line p-7 space-y-8">
          {loading && (
            <div className="flex items-center gap-3 text-ink-ghost text-sm py-4">
              <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              Ellis is reading the numbers…
            </div>
          )}

          {data && (
            <>
              {/* This week summary */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">This week</p>
                <div className="grid grid-cols-3 gap-px bg-line rounded-xl overflow-hidden">
                  {[
                    { label: 'Recipes created', value: data.week.recipesCreated },
                    { label: 'Submissions reviewed', value: data.week.submissionsReviewed },
                    { label: 'Pending queue', value: data.week.pendingQueue, alert: data.week.pendingQueue > 0 },
                  ].map(({ label, value, alert }) => (
                    <div key={label} className="bg-page px-5 py-4 text-center">
                      <p className={`text-2xl font-bold font-display ${alert ? 'text-amber-400' : 'text-ink'}`}>{value}</p>
                      <p className="text-xs text-ink-ghost mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collection gaps */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">Collections</p>
                <div className="space-y-2">
                  {data.collections.map((c) => {
                    const pct = Math.min(100, Math.round((c.count / 15) * 100))
                    return (
                      <div key={c.name} className="flex items-center gap-4">
                        <span className="text-sm text-ink w-44 shrink-0 truncate">{c.name}</span>
                        <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${c.gap ? 'bg-amber-400' : 'bg-ember'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs w-6 text-right shrink-0 ${c.gap ? 'text-amber-400 font-semibold' : 'text-ink-ghost'}`}>
                          {c.count}
                        </span>
                        {c.gap && (
                          <span className="text-xs text-amber-400 shrink-0">↑ needs content</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                {data.gaps.length > 0 && (
                  <div className="mt-5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                      Ellis recommends a creation run
                    </p>

                    {/* Job config */}
                    <div className="flex flex-wrap gap-3 items-end">
                      <div>
                        <p className="text-xs text-ink-ghost mb-1.5">Collection</p>
                        <select
                          value={batchJob?.collection ?? ''}
                          onChange={(e) => {
                            const col = e.target.value
                            setBatchJob(col ? { collection: col, persona: personaForCollection(col), count: 3 } : null)
                            setBatchResult(null)
                          }}
                          className="text-sm bg-page border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-ember"
                        >
                          <option value="">Pick a gap…</option>
                          {data.gaps.map((g) => (
                            <option key={g.name} value={g.name}>{g.name} ({g.count} recipes)</option>
                          ))}
                        </select>
                      </div>
                      {batchJob && (
                        <>
                          <div>
                            <p className="text-xs text-ink-ghost mb-1.5">Count</p>
                            <select
                              value={batchJob.count}
                              onChange={(e) => setBatchJob({ ...batchJob, count: Number(e.target.value) })}
                              className="text-sm bg-page border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-ember"
                            >
                              {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} recipes</option>)}
                            </select>
                          </div>
                          <div className="flex items-end gap-2 pb-px">
                            <span className={`text-xs font-semibold px-2 py-1.5 rounded border ${personaColor(batchJob.persona)}`}>
                              {batchJob.persona === 'celeste' ? 'Céleste' : batchJob.persona.charAt(0).toUpperCase() + batchJob.persona.slice(1)} will run this
                            </span>
                            <button
                              onClick={runBatch}
                              disabled={batchRunning}
                              className="text-sm font-semibold bg-ember text-white px-5 py-2 rounded-lg hover:bg-ember-deep transition-colors disabled:opacity-40"
                            >
                              {batchRunning ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                  Running…
                                </span>
                              ) : 'Run job'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {batchError && <p className="text-sm text-red-400">{batchError}</p>}

                    {batchResult && (
                      <div className="pt-2 border-t border-amber-500/20 space-y-1">
                        <p className="text-sm font-medium text-ink">
                          ✓ {batchResult.personaName} created {batchResult.created} recipes for {batchResult.collection} — now in pending queue
                        </p>
                        {batchResult.results.map((r, i) => (
                          <p key={i} className="text-xs text-ink-ghost pl-3">
                            · {r.title} <span className={r.confidenceScore >= 85 ? 'text-green-400' : r.confidenceScore >= 65 ? 'text-amber-400' : 'text-red-400'}>({r.confidenceScore})</span>
                          </p>
                        ))}
                        {batchResult.errors.length > 0 && (
                          <p className="text-xs text-red-400">Errors: {batchResult.errors.join(', ')}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Token usage */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">
                  Token spend — this month
                </p>
                {data.tokens.byPersona.length === 0 ? (
                  <p className="text-sm text-ink-ghost">No staff activity logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.tokens.byPersona.map((p) => (
                      <div key={p.persona} className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${personaColor(p.persona)}`}>
                          {p.name}
                        </span>
                        <span className="text-sm text-ink">{p.total.toLocaleString()} tokens</span>
                        <span className="text-xs text-ink-ghost">{p.tokensIn.toLocaleString()} in · {p.tokensOut.toLocaleString()} out</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-line mt-3">
                      <span className="text-sm text-ink font-medium">Total: {data.tokens.thisMonth.toLocaleString()} tokens this month</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Crew stats — outcomes this month */}
              {data.personaStats && data.personaStats.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">Crew performance — this month</p>
                  <div className="space-y-3">
                    {data.personaStats.map((s) => (
                      <div key={s.persona} className="flex items-center gap-3 text-sm">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border shrink-0 ${personaColor(s.persona)}`}>
                          {s.name}
                        </span>
                        <span className="text-ink-dim">{s.outcomes.total} actions</span>
                        {s.outcomes.created > 0 && (
                          <span className="text-xs text-emerald-400">{s.outcomes.created} created</span>
                        )}
                        {s.outcomes.pass > 0 && (
                          <span className="text-xs text-emerald-400">{s.outcomes.pass} passed</span>
                        )}
                        {s.flagRate > 0 && (
                          <span className={`text-xs font-semibold ${s.flagRate >= 30 ? 'text-red-400' : s.flagRate >= 15 ? 'text-amber-400' : 'text-ink-ghost'}`}>
                            {s.flagRate}% flags{s.flagRate >= 30 ? ' ⚠' : ''}
                          </span>
                        )}
                        {s.rejectRate > 0 && (
                          <span className={`text-xs font-semibold ${s.rejectRate >= 20 ? 'text-red-400' : 'text-ink-ghost'}`}>
                            {s.rejectRate}% rejected
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent staff activity */}
              {data.recentActivity.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-4">Recent activity</p>
                  <div className="space-y-2">
                    {data.recentActivity.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${personaColor(a.persona)}`}>
                          {a.persona}
                        </span>
                        <span className="text-ink-dim">
                          {a.notes ?? `${a.actionType} · ${a.outcome}`}
                        </span>
                        <span className="text-xs text-ink-ghost ml-auto shrink-0">
                          {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-ink-ghost">
                Last updated {new Date(data.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
