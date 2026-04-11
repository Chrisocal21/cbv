'use client'

import { useEffect, useState } from 'react'

type Template = {
  persona: string
  systemPrompt: string
  updatedAt: string
}

const PERSONA_META: Record<string, { name: string; role: string; color: string }> = {
  marco:   { name: 'Marco',   role: 'Executive Chef',           color: 'text-amber-400' },
  celeste: { name: 'Céleste', role: 'Pastry & Baking Lead',     color: 'text-rose-400' },
  nadia:   { name: 'Nadia',   role: 'Dietary & Wellness',       color: 'text-emerald-400' },
}

export function PromptTuner() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/prompts')
      .then((r) => r.ok ? r.json() : [])
      .then((data: Template[]) => {
        setTemplates(data)
        const d: Record<string, string> = {}
        for (const t of data) d[t.persona] = t.systemPrompt
        setDrafts(d)
      })
      .finally(() => setLoading(false))
  }, [])

  async function save(persona: string) {
    setSaving(persona)
    await fetch('/api/admin/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona, systemPrompt: drafts[persona] }),
    })
    setTemplates((prev) =>
      prev.map((t) => t.persona === persona ? { ...t, systemPrompt: drafts[persona], updatedAt: new Date().toISOString() } : t)
    )
    setSaving(null)
    setSaved(persona)
    setEditing(null)
    setTimeout(() => setSaved(null), 2000)
  }

  const personasToShow = ['marco', 'celeste', 'nadia']

  return (
    <div className="border border-line rounded-xl bg-panel mb-6 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-ghost font-mono bg-white/5 px-2 py-0.5 rounded">PROMPTS</span>
          <span className="text-sm font-medium text-ink-dim">Staff Prompt Templates</span>
          <span className="text-xs text-ink-ghost">Marco · Céleste · Nadia</span>
        </div>
        <span className="text-ink-ghost text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-line px-5 pb-5 pt-4 space-y-5">
          {loading && <p className="text-sm text-ink-ghost">Loading templates…</p>}

          {!loading && personasToShow.map((persona) => {
            const meta = PERSONA_META[persona]
            const draft = drafts[persona] ?? ''
            const original = templates.find((t) => t.persona === persona)?.systemPrompt ?? ''
            const isDirty = draft !== original
            const isEditing = editing === persona

            return (
              <div key={persona} className="rounded-xl border border-line bg-white/3 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                  <div>
                    <span className={`text-sm font-semibold ${meta.color}`}>{meta.name}</span>
                    <span className="text-xs text-ink-ghost ml-2">{meta.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {saved === persona && <span className="text-xs text-emerald-400">Saved ✓</span>}
                    {isDirty && !isEditing && <span className="text-xs text-amber-400">Unsaved changes</span>}
                    {!isEditing ? (
                      <button
                        onClick={() => setEditing(persona)}
                        className="text-xs text-ink-ghost hover:text-ink border border-line rounded px-2.5 py-1 transition-colors"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setDrafts({ ...drafts, [persona]: original }); setEditing(null) }}
                          className="text-xs text-ink-ghost hover:text-ink border border-line rounded px-2.5 py-1 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => save(persona)}
                          disabled={saving === persona}
                          className="text-xs font-semibold bg-ember text-white rounded px-2.5 py-1 hover:bg-ember/90 disabled:opacity-50 transition-colors"
                        >
                          {saving === persona ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <textarea
                    value={draft}
                    onChange={(e) => setDrafts({ ...drafts, [persona]: e.target.value })}
                    rows={10}
                    className="w-full bg-transparent px-4 py-3 text-sm text-ink font-mono leading-relaxed focus:outline-none resize-y"
                    spellCheck={false}
                  />
                ) : (
                  <pre className="px-4 py-3 text-xs text-ink-dim font-mono leading-relaxed whitespace-pre-wrap line-clamp-6 overflow-hidden">
                    {original || 'No prompt loaded.'}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
