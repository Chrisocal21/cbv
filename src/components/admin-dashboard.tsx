'use client'

import { useEffect, useState } from 'react'

type Verdict = 'pass' | 'flag' | 'reject' | null

type SubmissionRow = {
  submission: {
    id: string
    techniqueVerdict: Verdict
    techniqueNotes: string | null
    flavourVerdict: Verdict
    flavourNotes: string | null
    homecookVerdict: Verdict
    homecookNotes: string | null
    confidenceScore: number | null
    synthesisNotes: string | null
    recommendedAction: Verdict
    submittedBy: string
    submittedAt: string
  }
  recipe: {
    id: string
    slug: string
    title: string
    subtitle: string
    description: string
    collection: string
    cuisine: string
    difficulty: string
    totalTime: string
    servings: string
    authorId: string | null
  }
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (!verdict) return <span className="text-ink-ghost text-xs">Pending...</span>
  const colors: Record<string, string> = {
    pass: 'bg-green-500/20 text-green-400 border-green-500/30',
    flag: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    reject: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase tracking-wide ${colors[verdict]}`}>
      {verdict}
    </span>
  )
}

function ScoreRing({ score }: { score: number | null }) {
  if (score === null) return <span className="text-ink-ghost text-sm">--</span>
  const color = score >= 85 ? 'text-green-400' : score >= 65 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-3xl font-bold font-display ${color}`}>{score}</span>
}

export function AdminDashboard() {
  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deciding, setDeciding] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/submissions')
      .then((r) => {
        if (!r.ok) throw new Error('Access denied')
        return r.json()
      })
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function rerunReview(submissionId: string) {
    setRerunning(submissionId)
    const res = await fetch('/api/admin/rerun-review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ submissionId }),
    })
    if (res.ok) {
      const { report } = await res.json()
      setRows((prev) =>
        prev.map((r) =>
          r.submission.id === submissionId
            ? {
                ...r,
                submission: {
                  ...r.submission,
                  techniqueVerdict: report.technique.verdict,
                  techniqueNotes: report.technique.notes,
                  flavourVerdict: report.flavour.verdict,
                  flavourNotes: report.flavour.notes,
                  homecookVerdict: report.homecook.verdict,
                  homecookNotes: report.homecook.notes,
                  confidenceScore: report.synthesis.confidenceScore,
                  synthesisNotes: report.synthesis.synthesisNotes,
                  recommendedAction: report.synthesis.recommendedAction,
                },
              }
            : r
        )
      )
    }
    setRerunning(null)
  }

  async function decide(submissionId: string, decision: 'publish' | 'reject') {
    setDeciding(submissionId)
    const res = await fetch('/api/admin/decide', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ submissionId, decision, notes: adminNotes[submissionId] ?? '' }),
    })
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.submission.id !== submissionId))
    }
    setDeciding(null)
  }

  if (loading) {
    return <p className="text-ink-dim py-12 text-center">Loading submissions...</p>
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-red-400">{error}</p>
        <p className="text-ink-ghost text-sm mt-2">Admin access only. Your account needs the admin role.</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel p-12 text-center">
        <p className="text-ink-dim">No pending submissions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {rows.map(({ submission: sub, recipe }) => {
        const isExpanded = expanded === sub.id
        const isBusy = deciding === sub.id
        const isRerunning = rerunning === sub.id
        const isPendingReview = !sub.techniqueVerdict && !sub.flavourVerdict && !sub.homecookVerdict

        return (
          <div
            key={sub.id}
            className="rounded-xl border border-line bg-panel overflow-hidden"
          >
            {/* Header row */}
            <div
              className="flex items-start justify-between p-6 cursor-pointer hover:bg-panel-raised transition-colors"
              onClick={() => setExpanded(isExpanded ? null : sub.id)}
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-display font-bold text-ink text-lg">{recipe.title}</h3>
                  <ScoreRing score={sub.confidenceScore} />
                </div>
                <p className="text-sm text-ink-dim">
                  {recipe.collection} &middot; {recipe.cuisine} &middot; {recipe.difficulty}
                </p>
                <p className="text-xs text-ink-ghost mt-1">{recipe.description?.slice(0, 100)}...</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <VerdictBadge verdict={sub.recommendedAction} />
                <span className="text-ink-ghost text-sm">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded court report */}
            {isExpanded && (
              <div className="border-t border-line p-6 space-y-6">

                {/* Judge verdicts */}
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { label: 'Technique', verdict: sub.techniqueVerdict, notes: sub.techniqueNotes },
                    { label: 'Flavour', verdict: sub.flavourVerdict, notes: sub.flavourNotes },
                    { label: 'Home Cook', verdict: sub.homecookVerdict, notes: sub.homecookNotes },
                  ].map(({ label, verdict, notes }) => (
                    <div key={label} className="rounded-lg border border-line bg-page p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-ghost">{label}</p>
                        <VerdictBadge verdict={verdict} />
                      </div>
                      <p className="text-sm text-ink-dim leading-relaxed">
                        {notes ?? 'Awaiting review...'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Synthesis */}
                {sub.synthesisNotes && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-400 mb-2">
                      Synthesis
                    </p>
                    <p className="text-sm text-ink-dim leading-relaxed">{sub.synthesisNotes}</p>
                  </div>
                )}

                {/* Admin notes */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-ghost mb-2">
                    Admin notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add context for the record..."
                    value={adminNotes[sub.id] ?? ''}
                    onChange={(e) =>
                      setAdminNotes((n) => ({ ...n, [sub.id]: e.target.value }))
                    }
                    className="w-full bg-page border border-line rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors resize-none"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2 flex-wrap">
                  {isPendingReview && (
                    <button
                      disabled={isRerunning}
                      onClick={() => rerunReview(sub.id)}
                      className="border border-amber-500/40 text-amber-400 font-medium px-6 py-3 rounded-lg hover:bg-amber-500/10 transition-colors disabled:opacity-50 text-sm"
                    >
                      {isRerunning ? 'Running review…' : 'Re-run review'}
                    </button>
                  )}
                  <button
                    disabled={isBusy}
                    onClick={() => decide(sub.id, 'publish')}
                    className="bg-green-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {isBusy ? 'Processing...' : 'Publish'}
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => decide(sub.id, 'reject')}
                    className="bg-red-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {isBusy ? 'Processing...' : 'Reject'}
                  </button>
                  <a
                    href={`/recipe/${recipe.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="border border-line text-ink-dim font-medium px-6 py-3 rounded-lg hover:border-ember hover:text-ember transition-colors text-sm flex items-center"
                  >
                    Preview
                  </a>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
