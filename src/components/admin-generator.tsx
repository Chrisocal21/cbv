'use client'

import { useState } from 'react'

type Verdict = 'pass' | 'flag' | 'reject'
type RecommendedAction = 'approve' | 'revise' | 'reject'

type JudgeResult = { verdict: Verdict; notes: string; issues: string[] }
type GenerateResult = {
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
    moodTags: string[]
    dietaryTags: string[]
    originStory?: string
  }
  submissionId: string
  report: {
    technique: JudgeResult
    flavour: JudgeResult
    homecook: JudgeResult
    synthesis: {
      recommendedAction: RecommendedAction
      confidenceScore: number
      synthesisNotes: string
    }
  }
}

const STEP_LABELS = [
  'Generating recipe with GPT-4o...',
  'Running court review...',
  'Saving to database...',
]

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const colors: Record<Verdict, string> = {
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

const SUGGESTION_TAGS = [
  'weeknight dinner', 'chicken thighs', 'pasta', 'vegetarian', '30 minutes',
  'Japanese', 'Mediterranean', 'baking', 'summer salad', 'winter warmer',
  'gluten-free', 'seafood', 'lamb', 'breakfast', 'dessert', 'one-pan',
]

export function AdminGenerator() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState('')
  const [deciding, setDeciding] = useState<'publish' | 'reject' | null>(null)
  const [decided, setDecided] = useState<'publish' | 'reject' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [open, setOpen] = useState(true)

  function addTag(tag: string) {
    setPrompt((p) => {
      const trimmed = p.trim()
      if (!trimmed) return tag
      if (trimmed.endsWith(',')) return trimmed + ' ' + tag
      return trimmed + ', ' + tag
    })
  }

  async function generate() {
    if (!prompt.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    setDecided(null)
    setStep(1)

    // Fake step progression so the user sees activity
    const stepTimer = setTimeout(() => setStep(2), 3000)

    const res = await fetch('/api/admin/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })

    clearTimeout(stepTimer)
    setStep(3)

    if (res.ok) {
      const data = await res.json()
      setResult(data)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Generation failed.')
    }

    setLoading(false)
    setStep(0)
  }

  async function decide(decision: 'publish' | 'reject') {
    if (!result) return
    setDeciding(decision)
    const res = await fetch('/api/admin/decide', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        submissionId: result.submissionId,
        decision,
        notes: adminNotes,
      }),
    })
    if (res.ok) {
      setDecided(decision)
    }
    setDeciding(null)
  }

  const score = result?.report.synthesis.confidenceScore ?? null
  const scoreColor = score === null ? '' : score >= 85 ? 'text-green-400' : score >= 65 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="rounded-2xl border border-line bg-panel overflow-hidden mb-8">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-7 py-5 hover:bg-panel-raised transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-ember" />
          <span className="font-display text-lg font-bold text-ink">Generate a new recipe</span>
          <span className="text-xs text-ink-ghost border border-line rounded px-2 py-0.5">Admin only</span>
        </div>
        <span className="text-ink-ghost text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-line p-7 space-y-6">

          {/* Prompt input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-3">
              What should we make?
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. weeknight dinner, chicken thighs, Japanese-inspired, 30 minutes&#10;&#10;Be as specific or loose as you like."
              className="w-full bg-page border border-line rounded-xl px-5 py-4 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors resize-none text-sm leading-relaxed"
            />

            {/* Tag suggestions */}
            <div className="flex flex-wrap gap-2 mt-3">
              {SUGGESTION_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="text-xs text-ink-ghost border border-line rounded-full px-3 py-1 hover:text-ember hover:border-ember transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button + loading state */}
          <div>
            {loading ? (
              <div className="flex items-center gap-4 py-2">
                <div className="w-5 h-5 border-2 border-ember border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="text-sm text-ink-dim">{STEP_LABELS[step - 1] ?? 'Working...'}</span>
              </div>
            ) : (
              <button
                onClick={generate}
                disabled={!prompt.trim()}
                className="bg-ember text-white font-semibold px-7 py-3 rounded-xl hover:bg-ember-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate recipe
              </button>
            )}
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          </div>

          {/* Result */}
          {result && !decided && (
            <div className="border-t border-line pt-6 space-y-6">

              {/* Recipe at a glance */}
              <div className="rounded-xl bg-page border border-line p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-ink leading-tight">
                      {result.recipe.title}
                    </h3>
                    <p className="text-ink-dim font-display italic mt-1">{result.recipe.subtitle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-4xl font-bold font-display ${scoreColor}`}>{score}</p>
                    <p className="text-xs text-ink-ghost mt-0.5">confidence</p>
                  </div>
                </div>
                <p className="text-sm text-ink-dim leading-relaxed mb-3">{result.recipe.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs border border-line rounded-full px-3 py-1 text-ink-ghost">{result.recipe.collection}</span>
                  <span className="text-xs border border-line rounded-full px-3 py-1 text-ink-ghost">{result.recipe.cuisine}</span>
                  <span className="text-xs border border-line rounded-full px-3 py-1 text-ink-ghost">{result.recipe.difficulty}</span>
                  <span className="text-xs border border-line rounded-full px-3 py-1 text-ink-ghost">{result.recipe.totalTime}</span>
                  <span className="text-xs border border-line rounded-full px-3 py-1 text-ink-ghost">Serves {result.recipe.servings}</span>
                </div>
                {(result.recipe.moodTags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.recipe.moodTags.map((t) => (
                      <span key={t} className="text-xs text-ember">{t}</span>
                    )).reduce((acc: React.ReactNode[], el, i, arr) => {
                      acc.push(el)
                      if (i < arr.length - 1) acc.push(<span key={`sep-${i}`} className="text-ink-ghost text-xs">&middot;</span>)
                      return acc
                    }, [])}
                  </div>
                )}
                <a
                  href={`/recipe/${result.recipe.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-block mt-3 text-xs text-ember hover:underline"
                >
                  Preview full recipe &rarr;
                </a>
              </div>

              {/* Court report */}
              <div className="grid md:grid-cols-3 gap-4">
                {([
                  { label: 'Technique', judge: result.report.technique },
                  { label: 'Flavour', judge: result.report.flavour },
                  { label: 'Home Cook', judge: result.report.homecook },
                ] as const).map(({ label, judge }) => (
                  <div key={label} className="rounded-lg border border-line bg-page p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-ghost">{label}</p>
                      <VerdictBadge verdict={judge.verdict} />
                    </div>
                    <p className="text-sm text-ink-dim leading-relaxed">{judge.notes}</p>
                    {judge.issues?.length > 0 && (
                      <ul className="space-y-1 pt-1">
                        {judge.issues.map((issue, i) => (
                          <li key={i} className="text-xs text-amber-400 flex gap-1.5">
                            <span className="mt-0.5">!</span>{issue}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* Synthesis */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Synthesis</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                    result.report.synthesis.recommendedAction === 'approve'
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : result.report.synthesis.recommendedAction === 'reject'
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}>
                    {result.report.synthesis.recommendedAction}
                  </span>
                </div>
                <p className="text-sm text-ink-dim leading-relaxed">{result.report.synthesis.synthesisNotes}</p>
              </div>

              {/* Admin notes + decision */}
              <div className="space-y-3">
                <textarea
                  rows={2}
                  placeholder="Admin notes (optional)"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full bg-page border border-line rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors resize-none"
                />
                <div className="flex gap-3">
                  <button
                    disabled={!!deciding}
                    onClick={() => decide('publish')}
                    className="bg-green-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {deciding === 'publish' ? 'Publishing...' : 'Publish'}
                  </button>
                  <button
                    disabled={!!deciding}
                    onClick={() => decide('reject')}
                    className="bg-red-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {deciding === 'reject' ? 'Rejecting...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => { setResult(null); setPrompt('') }}
                    className="border border-line text-ink-ghost font-medium px-6 py-3 rounded-lg hover:border-ember hover:text-ember transition-colors text-sm"
                  >
                    Generate another
                  </button>
                </div>
              </div>
            </div>
          )}

          {decided && (
            <div className="border-t border-line pt-6 text-center space-y-3">
              <p className="text-ink-dim">
                {decided === 'publish'
                  ? `"${result?.recipe.title}" is now live.`
                  : `"${result?.recipe.title}" was rejected.`}
              </p>
              <button
                onClick={() => { setResult(null); setDecided(null); setPrompt(''); setAdminNotes('') }}
                className="text-ember text-sm font-medium hover:underline"
              >
                Generate another recipe
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
