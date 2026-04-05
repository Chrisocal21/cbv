'use client'

import { useState, useRef, useEffect } from 'react'

type Verdict = 'pass' | 'flag' | 'reject'
type RecommendedAction = 'approve' | 'revise' | 'reject'
type Attribution = 'cookbookverse' | 'user'

type JudgeResult = { verdict: Verdict; notes: string; issues: string[] }

type FullRecipe = {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  collection: string
  cuisine: string
  difficulty: string
  prepTime: string
  cookTime: string
  totalTime: string
  servings: string
  moodTags: string[]
  dietaryTags: string[]
  ingredients: { group: string; items: string[] }[]
  steps: { title: string; body: string }[]
  nutrition: { calories: number; protein: string; carbs: string; fat: string; fiber: string }
  originStory?: string
  gradient: string
}

type CourtReport = {
  technique: JudgeResult
  flavour: JudgeResult
  homecook: JudgeResult
  synthesis: {
    recommendedAction: RecommendedAction
    confidenceScore: number
    synthesisNotes: string
  }
}

type GenerateResult = {
  recipe: FullRecipe
  submissionId: string
  report: CourtReport
  attributeTo: Attribution
}

type ChatMessage = { role: 'user' | 'assistant'; text: string }

const STEP_LABELS = [
  'Generating recipe with GPT-4o...',
  'Running court review...',
  'Saving to database...',
]

const SUGGESTION_TAGS = [
  'weeknight dinner', 'chicken thighs', 'pasta', 'vegetarian', '30 minutes',
  'Japanese', 'Mediterranean', 'baking', 'summer salad', 'winter warmer',
  'gluten-free', 'seafood', 'lamb', 'breakfast', 'dessert', 'one-pan',
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

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-page hover:bg-panel-raised transition-colors text-left">
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">{title}</span>
        <span className="text-ink-ghost text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 py-4 bg-page">{children}</div>}
    </div>
  )
}

export function AdminGenerator() {
  const [prompt, setPrompt] = useState('')
  const [attribution, setAttribution] = useState<Attribution>('cookbookverse')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState('')
  const [deciding, setDeciding] = useState<'publish' | 'reject' | null>(null)
  const [decided, setDecided] = useState<'publish' | 'reject' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [open, setOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [reviewStale, setReviewStale] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

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
    setChatMessages([])
    setReviewStale(false)
    setStep(1)

    // Fake step progression so the user sees activity
    const stepTimer = setTimeout(() => setStep(2), 3000)

    const res = await fetch('/api/admin/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, attributeTo: attribution }),
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

  async function sendEdit() {
    if (!chatInput.trim() || !result) return
    const instruction = chatInput.trim()
    setChatInput('')
    setChatLoading(true)
    setChatMessages(m => [...m, { role: 'user', text: instruction }])

    const res = await fetch('/api/admin/edit-recipe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        recipe: result.recipe,
        instruction,
        recipeId: result.recipe.id,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setResult(prev => prev ? { ...prev, recipe: { ...data.recipe, id: prev.recipe.id, slug: prev.recipe.slug } } : prev)
      setReviewStale(true)
      setChatMessages(m => [...m, { role: 'assistant', text: `Done — applied: "${instruction}". Re-run the court review when you're happy with the recipe.` }])
    } else {
      setChatMessages(m => [...m, { role: 'assistant', text: 'Edit failed. Please try again.' }])
    }
    setChatLoading(false)
  }

  async function rerunReview() {
    if (!result) return
    setChatLoading(true)
    setChatMessages(m => [...m, { role: 'assistant', text: 'Re-running court review…' }])

    const res = await fetch('/api/admin/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: `[RE-REVIEW ONLY] ${JSON.stringify(result.recipe)}`, attributeTo: attribution }),
    })

    if (res.ok) {
      const data = await res.json()
      setResult(prev => prev ? { ...prev, report: data.report, submissionId: data.submissionId } : prev)
      setReviewStale(false)
      setChatMessages(m => [...m, { role: 'assistant', text: `Review complete. New confidence score: ${data.report.synthesis.confidenceScore}.` }])
    } else {
      setChatMessages(m => [...m, { role: 'assistant', text: 'Re-review failed. Try again.' }])
    }
    setChatLoading(false)
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

          {/* Prompt + attribution */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-3">
                What should we make?
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. weeknight dinner, chicken thighs, Japanese-inspired, 30 minutes"
                className="w-full bg-page border border-line rounded-xl px-5 py-4 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors resize-none text-sm leading-relaxed"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {SUGGESTION_TAGS.map((tag) => (
                  <button key={tag} type="button" onClick={() => addTag(tag)}
                    className="text-xs text-ink-ghost border border-line rounded-full px-3 py-1 hover:text-ember hover:border-ember transition-colors">
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Attribution toggle */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
                Publish as
              </label>
              <div className="flex gap-2">
                <button onClick={() => setAttribution('cookbookverse')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    attribution === 'cookbookverse'
                      ? 'bg-ember text-white border-ember'
                      : 'bg-page text-ink-dim border-line hover:border-ember hover:text-ink'
                  }`}>
                  Cookbookverse
                </button>
                <button onClick={() => setAttribution('user')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    attribution === 'user'
                      ? 'bg-ember text-white border-ember'
                      : 'bg-page text-ink-dim border-line hover:border-ember hover:text-ink'
                  }`}>
                  My profile
                </button>
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div>
            {loading ? (
              <div className="flex items-center gap-4 py-2">
                <div className="w-5 h-5 border-2 border-ember border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="text-sm text-ink-dim">{STEP_LABELS[step - 1] ?? 'Working...'}</span>
              </div>
            ) : (
              <button onClick={generate} disabled={!prompt.trim()}
                className="bg-ember text-white font-semibold px-7 py-3 rounded-xl hover:bg-ember-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Generate recipe
              </button>
            )}
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          </div>

          {/* Result */}
          {result && !decided && (
            <div className="border-t border-line pt-6 space-y-5">
              {(() => { const r = result.recipe; return (<>

                {/* Title + score */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-ink leading-tight">{r.title}</h3>
                    <p className="text-ink-dim font-display italic mt-1">{r.subtitle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {reviewStale
                      ? <p className="text-xs text-amber-400 border border-amber-500/30 rounded px-2 py-1">Review stale — re-run before publishing</p>
                      : <>
                          <p className={`text-4xl font-bold font-display ${scoreColor}`}>{score}</p>
                          <p className="text-xs text-ink-ghost mt-0.5">confidence</p>
                        </>
                    }
                  </div>
                </div>

                {/* Full recipe */}
                <Section title="Overview">
                  <p className="text-sm text-ink-dim leading-relaxed mb-4">{r.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[r.collection, r.cuisine, r.difficulty, r.totalTime, `Serves ${r.servings}`].map(v => (
                      <span key={v} className="text-xs border border-line rounded-full px-3 py-1 text-ink-ghost">{v}</span>
                    ))}
                    {r.dietaryTags?.map(t => (
                      <span key={t} className="text-xs border border-green-500/30 rounded-full px-3 py-1 text-green-400">{t}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {r.moodTags?.map((t, i, arr) => (
                      <span key={t} className="text-xs text-ember">{t}{i < arr.length - 1 ? ' ·' : ''}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                    {[['Prep', r.prepTime], ['Cook', r.cookTime], ['Total', r.totalTime]].map(([l, v]) => (
                      <div key={l} className="border border-line rounded-lg p-3">
                        <p className="text-xs text-ink-ghost mb-1">{l}</p>
                        <p className="text-sm font-medium text-ink">{v}</p>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Ingredients">
                  <div className="space-y-4">
                    {r.ingredients?.map((group, gi) => (
                      <div key={gi}>
                        {group.group && <p className="text-xs font-semibold uppercase tracking-wide text-ember mb-2">{group.group}</p>}
                        <ul className="space-y-1.5">
                          {group.items.map((item, ii) => (
                            <li key={ii} className="flex items-start gap-2 text-sm text-ink-dim">
                              <span className="w-1 h-1 rounded-full bg-ember mt-2 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Method">
                  <ol className="space-y-5">
                    {r.steps?.map((s, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="font-display font-bold text-ember text-lg leading-none mt-0.5 flex-shrink-0 w-6">{i + 1}</span>
                        <div>
                          {s.title && <p className="font-semibold text-ink text-sm mb-1">{s.title}</p>}
                          <p className="text-sm text-ink-dim leading-relaxed">{s.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Section>

                <Section title="Nutrition" defaultOpen={false}>
                  <div className="grid grid-cols-5 gap-3 text-center">
                    {[
                      ['Calories', r.nutrition?.calories],
                      ['Protein', r.nutrition?.protein],
                      ['Carbs', r.nutrition?.carbs],
                      ['Fat', r.nutrition?.fat],
                      ['Fiber', r.nutrition?.fiber],
                    ].map(([label, val]) => (
                      <div key={label as string} className="border border-line rounded-lg p-3">
                        <p className="text-xs text-ink-ghost mb-1">{label}</p>
                        <p className="text-sm font-medium text-ink">{val}</p>
                      </div>
                    ))}
                  </div>
                </Section>

                {r.originStory && (
                  <Section title="Origin story" defaultOpen={false}>
                    <p className="text-sm text-ink-dim leading-relaxed">{r.originStory}</p>
                  </Section>
                )}

                <a href={`/recipe/${r.slug}`} target="_blank" rel="noopener"
                  className="inline-block text-xs text-ember hover:underline">
                  Preview live page &rarr;
                </a>

              </>)})()}

              {/* Court report */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-3">Court review</p>
                <div className="grid md:grid-cols-3 gap-3">
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
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mt-3">
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
              </div>

              {/* Chat edit panel */}
              <div className="border border-line rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-page border-b border-line flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">Edit recipe</p>
                  {reviewStale && (
                    <button onClick={rerunReview} disabled={chatLoading}
                      className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded px-3 py-1 transition-colors disabled:opacity-50">
                      Re-run court review
                    </button>
                  )}
                </div>

                {chatMessages.length > 0 && (
                  <div className="px-5 py-4 space-y-3 max-h-56 overflow-y-auto bg-page">
                    {chatMessages.map((m, i) => (
                      <div key={i} className="text-sm leading-relaxed">
                        <span className={`text-xs font-semibold uppercase tracking-wide mr-2 ${m.role === 'user' ? 'text-ember' : 'text-ink-ghost'}`}>
                          {m.role === 'user' ? 'You' : 'AI'}
                        </span>
                        <span className={m.role === 'user' ? 'text-ink font-medium' : 'text-ink-dim'}>{m.text}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <div className="p-4 bg-page flex gap-3">
                  <input type="text" value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendEdit() } }}
                    placeholder='e.g. "make it dairy-free" or "remove the cilantro"'
                    disabled={chatLoading}
                    className="flex-1 bg-panel border border-line rounded-lg px-4 py-2.5 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors disabled:opacity-50"
                  />
                  <button onClick={sendEdit} disabled={chatLoading || !chatInput.trim()}
                    className="bg-ember text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-ember-deep transition-colors disabled:opacity-40">
                    {chatLoading ? '…' : 'Apply'}
                  </button>
                </div>
              </div>

              {/* Decision */}
              <div className="space-y-3 pt-1">
                <textarea rows={2} placeholder="Admin notes (optional)" value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full bg-page border border-line rounded-lg px-4 py-3 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors resize-none"
                />
                <div className="flex gap-3 flex-wrap items-center">
                  <button disabled={!!deciding || reviewStale} onClick={() => decide('publish')}
                    className="bg-green-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {deciding === 'publish' ? 'Publishing...' : 'Publish'}
                  </button>
                  <button disabled={!!deciding} onClick={() => decide('reject')}
                    className="bg-red-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                    {deciding === 'reject' ? 'Rejecting...' : 'Reject'}
                  </button>
                  {reviewStale && <p className="text-xs text-amber-400">Re-run review before publishing</p>}
                  <button onClick={() => { setResult(null); setPrompt('') }}
                    className="ml-auto border border-line text-ink-ghost font-medium px-5 py-3 rounded-lg hover:border-ember hover:text-ember transition-colors text-sm">
                    Start over
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
                onClick={() => { setResult(null); setDecided(null); setPrompt(''); setAdminNotes(''); setChatMessages([]) }}
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
