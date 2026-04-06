'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RecipeRow } from '@/lib/queries'

const DIFFICULTIES = ['Easy', 'Intermediate', 'Advanced']

export function RecipeEditForm({ recipe }: { recipe: RecipeRow }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    title: recipe.title,
    subtitle: recipe.subtitle,
    description: recipe.description,
    cuisine: recipe.cuisine,
    collection: recipe.collection,
    difficulty: recipe.difficulty,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    totalTime: recipe.totalTime,
    servings: recipe.servings,
    originStory: recipe.originStory,
    moodTags: (recipe.moodTags as string[]).join(', '),
    dietaryTags: (recipe.dietaryTags as string[]).join(', '),
    // Ingredients: each group on its own line "Group Name: item1, item2"
    ingredientsRaw: (recipe.ingredients as { group: string; items: string[] }[])
      .map((g) => `${g.group}: ${g.items.join(', ')}`)
      .join('\n'),
    // Steps: each step on its own line "Step Title: body"
    stepsRaw: (recipe.steps as { title: string; body: string }[])
      .map((s) => `${s.title}: ${s.body}`)
      .join('\n\n'),
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  function parseIngredients(raw: string) {
    return raw.split('\n').filter(Boolean).map((line) => {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) return { group: 'Ingredients', items: line.split(',').map((s) => s.trim()).filter(Boolean) }
      const group = line.slice(0, colonIdx).trim()
      const items = line.slice(colonIdx + 1).split(',').map((s) => s.trim()).filter(Boolean)
      return { group, items }
    })
  }

  function parseSteps(raw: string) {
    return raw.split(/\n{2,}/).filter(Boolean).map((block, i) => {
      const colonIdx = block.indexOf(':')
      if (colonIdx === -1) return { title: `Step ${i + 1}`, body: block.trim() }
      return { title: block.slice(0, colonIdx).trim(), body: block.slice(colonIdx + 1).trim() }
    })
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/user/recipes/${recipe.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...form,
        moodTags: form.moodTags.split(',').map((s) => s.trim()).filter(Boolean),
        dietaryTags: form.dietaryTags.split(',').map((s) => s.trim()).filter(Boolean),
        ingredients: parseIngredients(form.ingredientsRaw),
        steps: parseSteps(form.stepsRaw),
      }),
    })
    if (res.ok) setSaved(true)
    setSaving(false)
  }

  async function saveAndSubmit() {
    setSubmitting(true)
    // First save edits
    await fetch(`/api/user/recipes/${recipe.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...form,
        moodTags: form.moodTags.split(',').map((s) => s.trim()).filter(Boolean),
        dietaryTags: form.dietaryTags.split(',').map((s) => s.trim()).filter(Boolean),
        ingredients: parseIngredients(form.ingredientsRaw),
        steps: parseSteps(form.stepsRaw),
      }),
    })

    // If rejected, revert to draft first so submit-recipe accepts it
    if (recipe.status === 'rejected') {
      await fetch('/api/user/revert-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id }),
      })
    }

    // Submit for review
    const res = await fetch('/api/user/submit-recipe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipeId: recipe.id }),
    })

    if (res.ok) {
      router.push('/profile?tab=submissions')
    }
    setSubmitting(false)
  }

  const field = (key: keyof typeof form, label: string, multiline = false, rows = 3) => (
    <div>
      <label className="text-xs text-ink-ghost block mb-1">{label}</label>
      {multiline ? (
        <textarea
          rows={rows}
          value={form[key]}
          onChange={set(key)}
          className="w-full bg-panel border border-line rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ember resize-y"
        />
      ) : (
        <input
          type="text"
          value={form[key]}
          onChange={set(key)}
          className="w-full bg-panel border border-line rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ember"
        />
      )}
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Basic info */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">Basic info</h2>
        {field('title', 'Title')}
        {field('subtitle', 'Subtitle / tagline')}
        {field('description', 'Description', true, 3)}
        <div className="grid grid-cols-2 gap-4">
          {field('cuisine', 'Cuisine')}
          {field('collection', 'Collection')}
        </div>
        <div>
          <label className="text-xs text-ink-ghost block mb-1">Difficulty</label>
          <select
            value={form.difficulty}
            onChange={set('difficulty')}
            className="w-full bg-panel border border-line rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ember"
          >
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {field('prepTime', 'Prep time')}
          {field('cookTime', 'Cook time')}
          {field('totalTime', 'Total time')}
        </div>
        {field('servings', 'Servings')}
      </section>

      {/* Tags */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">Tags</h2>
        <div>
          <label className="text-xs text-ink-ghost block mb-1">Mood tags <span className="text-ink-ghost/60">(comma-separated)</span></label>
          <input type="text" value={form.moodTags} onChange={set('moodTags')}
            className="w-full bg-panel border border-line rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ember"
            placeholder="cozy, spicy, quick, comfort food" />
        </div>
        <div>
          <label className="text-xs text-ink-ghost block mb-1">Dietary tags <span className="text-ink-ghost/60">(comma-separated)</span></label>
          <input type="text" value={form.dietaryTags} onChange={set('dietaryTags')}
            className="w-full bg-panel border border-line rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ember"
            placeholder="vegetarian, gluten-free" />
        </div>
      </section>

      {/* Ingredients */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">Ingredients</h2>
          <p className="text-xs text-ink-ghost/70 mt-0.5">One group per line: <code className="bg-panel px-1 rounded">Group name: item 1, item 2, item 3</code></p>
        </div>
        <textarea
          rows={8}
          value={form.ingredientsRaw}
          onChange={set('ingredientsRaw')}
          className="w-full bg-panel border border-line rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ember font-mono resize-y"
        />
      </section>

      {/* Steps */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">Steps</h2>
          <p className="text-xs text-ink-ghost/70 mt-0.5">One step per double-newline: <code className="bg-panel px-1 rounded">Step title: description</code></p>
        </div>
        <textarea
          rows={12}
          value={form.stepsRaw}
          onChange={set('stepsRaw')}
          className="w-full bg-panel border border-line rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ember font-mono resize-y"
        />
      </section>

      {/* Origin story */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-ghost">Origin story</h2>
        {field('originStory', '', true, 4)}
      </section>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-line">
        <button
          onClick={saveAndSubmit}
          disabled={submitting}
          className="text-sm font-medium bg-ember text-white px-6 py-2.5 rounded-full hover:bg-ember-deep disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Submitting…' : 'Save & submit for review'}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="text-sm font-medium border border-line text-ink-dim hover:border-ember hover:text-ink px-6 py-2.5 rounded-full disabled:opacity-50 transition-colors"
        >
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save draft'}
        </button>
      </div>
    </div>
  )
}
