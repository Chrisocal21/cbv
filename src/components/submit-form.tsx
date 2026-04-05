'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { SignInButton, Show } from '@clerk/nextjs'

const COLLECTIONS = [
  'Culinary Journeys',
  'Seasonal Sensations',
  'Gourmet Guerillas',
  'Quick & Creative',
  'Baking Alchemy',
]
const DIFFICULTIES = ['Easy', 'Intermediate', 'Advanced']
const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free']

type Ingredient = { group: string; items: string }
type Step = { title: string; body: string }

export function SubmitForm() {
  const router = useRouter()
  const { user } = useUser()
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    collection: COLLECTIONS[0],
    cuisine: '',
    difficulty: DIFFICULTIES[0],
    prepTime: '',
    cookTime: '',
    totalTime: '',
    servings: '',
    dietaryTags: [] as string[],
    moodTags: '',
    originStory: '',
  })

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { group: 'Ingredients', items: '' },
  ])
  const [steps, setSteps] = useState<Step[]>([
    { title: '', body: '' },
  ])

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleDietary(tag: string) {
    setForm((f) => ({
      ...f,
      dietaryTags: f.dietaryTags.includes(tag)
        ? f.dietaryTags.filter((t) => t !== tag)
        : [...f.dietaryTags, tag],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    const payload = {
      ...form,
      moodTags: form.moodTags.split(',').map((t) => t.trim()).filter(Boolean),
      ingredients: ingredients.map((g) => ({
        group: g.group,
        items: g.items.split('\n').map((i) => i.trim()).filter(Boolean),
      })),
      steps: steps.map((s, i) => ({
        title: s.title || `Step ${i + 1}`,
        body: s.body,
      })),
      nutrition: { calories: 0, protein: '0g', carbs: '0g', fat: '0g', fiber: '0g' },
    }

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setStatus('done')
    } else {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data.error ?? 'Something went wrong.')
      setStatus('error')
    }
  }

  return (
    <div>
      <Show when="signed-out">
        <div className="rounded-xl border border-line bg-panel p-8 text-center">
          <p className="text-ink-dim mb-4">You need to be signed in to submit a recipe.</p>
          <SignInButton mode="modal">
            <button className="bg-ember text-white font-semibold px-6 py-3 rounded-lg hover:bg-ember-deep transition-colors">
              Sign in to continue
            </button>
          </SignInButton>
        </div>
      </Show>

      <Show when="signed-in">
        {status === 'done' ? (
          <div className="rounded-xl border border-line bg-panel p-10 text-center space-y-4">
            <div className="text-4xl">✓</div>
            <h2 className="font-display text-2xl font-bold text-ink">Recipe submitted</h2>
            <p className="text-ink-dim max-w-md mx-auto">
              Your recipe is in the queue. We'll review it and let you know when it goes live.
            </p>
            <button
              onClick={() => router.push('/')}
              className="text-ember font-medium hover:underline"
            >
              Back to home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-10">

            {/* Basic info */}
            <section className="space-y-5">
              <h2 className="font-display text-xl font-bold text-ink border-b border-line pb-3">
                About the recipe
              </h2>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
                    Title <span className="text-ember">*</span>
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="e.g. Brown Butter Financiers"
                    className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
                    Subtitle
                  </label>
                  <input
                    value={form.subtitle}
                    onChange={(e) => setField('subtitle', e.target.value)}
                    placeholder="e.g. The French bakery classic"
                    className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
                  Description <span className="text-ember">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="What makes this recipe worth making? Be honest."
                  className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors resize-none"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
                    Collection <span className="text-ember">*</span>
                  </label>
                  <select
                    value={form.collection}
                    onChange={(e) => setField('collection', e.target.value)}
                    className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-ember transition-colors"
                  >
                    {COLLECTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
                    Cuisine <span className="text-ember">*</span>
                  </label>
                  <input
                    required
                    value={form.cuisine}
                    onChange={(e) => setField('cuisine', e.target.value)}
                    placeholder="e.g. Italian, Japanese-inspired"
                    className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
                    Difficulty <span className="text-ember">*</span>
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setField('difficulty', e.target.value)}
                    className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-ember transition-colors"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'prepTime', label: 'Prep time' },
                  { key: 'cookTime', label: 'Cook time' },
                  { key: 'totalTime', label: 'Total time' },
                  { key: 'servings', label: 'Serves' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
                      {label}
                    </label>
                    <input
                      value={(form as unknown as Record<string, string>)[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      placeholder={key === 'servings' ? '4' : '20 min'}
                      className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-3">
                  Dietary tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleDietary(tag)}
                      className={`text-xs font-medium px-4 py-2 rounded-full border transition-colors ${
                        form.dietaryTags.includes(tag)
                          ? 'bg-ember border-ember text-white'
                          : 'bg-panel border-line text-ink-dim hover:border-ember'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-ink-ghost mb-2">
                  Mood tags
                  <span className="normal-case font-normal ml-2 text-ink-ghost">(comma separated)</span>
                </label>
                <input
                  value={form.moodTags}
                  onChange={(e) => setField('moodTags', e.target.value)}
                  placeholder="e.g. cozy, weeknight, umami"
                  className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
                />
              </div>
            </section>

            {/* Ingredients */}
            <section className="space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="font-display text-xl font-bold text-ink">Ingredients</h2>
                <button
                  type="button"
                  onClick={() => setIngredients([...ingredients, { group: 'Group name', items: '' }])}
                  className="text-xs text-ember font-medium hover:underline"
                >
                  + Add group
                </button>
              </div>

              {ingredients.map((group, i) => (
                <div key={i} className="space-y-2">
                  <input
                    value={group.group}
                    onChange={(e) =>
                      setIngredients(ingredients.map((g, j) => j === i ? { ...g, group: e.target.value } : g))
                    }
                    placeholder="Group name (e.g. Sauce, Marinade)"
                    className="w-full bg-panel border border-line rounded-lg px-4 py-2 text-sm text-ink-dim placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
                  />
                  <textarea
                    rows={4}
                    value={group.items}
                    onChange={(e) =>
                      setIngredients(ingredients.map((g, j) => j === i ? { ...g, items: e.target.value } : g))
                    }
                    placeholder="One ingredient per line&#10;e.g. 2 tbsp white miso paste&#10;1 tbsp mirin"
                    className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors resize-none font-mono text-sm"
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))}
                      className="text-xs text-ink-ghost hover:text-ember"
                    >
                      Remove group
                    </button>
                  )}
                </div>
              ))}
            </section>

            {/* Steps */}
            <section className="space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="font-display text-xl font-bold text-ink">Method</h2>
                <button
                  type="button"
                  onClick={() => setSteps([...steps, { title: '', body: '' }])}
                  className="text-xs text-ember font-medium hover:underline"
                >
                  + Add step
                </button>
              </div>

              {steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ember/20 text-ember text-sm font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <input
                      value={step.title}
                      onChange={(e) =>
                        setSteps(steps.map((s, j) => j === i ? { ...s, title: e.target.value } : s))
                      }
                      placeholder="Step name (optional)"
                      className="w-full bg-panel border border-line rounded-lg px-4 py-2 text-sm text-ink-dim placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors"
                    />
                    <textarea
                      required
                      rows={3}
                      value={step.body}
                      onChange={(e) =>
                        setSteps(steps.map((s, j) => j === i ? { ...s, body: e.target.value } : s))
                      }
                      placeholder="Describe exactly what to do..."
                      className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors resize-none"
                    />
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                        className="text-xs text-ink-ghost hover:text-ember"
                      >
                        Remove step
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>

            {/* Origin story */}
            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-ink border-b border-line pb-3">
                Origin story
                <span className="text-base font-normal font-sans text-ink-ghost ml-3">optional</span>
              </h2>
              <textarea
                rows={3}
                value={form.originStory}
                onChange={(e) => setField('originStory', e.target.value)}
                placeholder="Where does this recipe come from? Any history or personal story?"
                className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-ink-ghost focus:outline-none focus:border-ember transition-colors resize-none"
              />
            </section>

            {/* Submit */}
            <div className="pt-4">
              {status === 'error' && (
                <p className="text-red-500 text-sm mb-4">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="bg-ember text-white font-semibold px-8 py-4 rounded-xl hover:bg-ember-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? 'Submitting...' : 'Submit to Cookbookverse'}
              </button>
              <p className="text-xs text-ink-ghost mt-3">
                Your recipe will be reviewed before it's published.
              </p>
            </div>

          </form>
        )}
      </Show>
    </div>
  )
}
