'use client'

import { useEffect, useState } from 'react'

type Settings = {
  monthlyTokenBudget: number
  autoCreationEnabled: boolean
  creationThreshold: number
  dailyRunCount: number
}

type BudgetMeta = {
  tokensUsed: number
  percentUsed: number
  hardStop: boolean
  softStop: boolean
}

export function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [budgetMeta, setBudgetMeta] = useState<BudgetMeta | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data)
      })
    // budget meta comes from the digest endpoint
    fetch('/api/admin/digest')
      .then((r) => r.json())
      .then((data) => {
        if (data.tokens) {
          const total = Object.values(data.tokens as Record<string, number>).reduce(
            (a: number, b) => a + (b as number),
            0
          ) as number
          setBudgetMeta({
            tokensUsed: total,
            percentUsed: data.budgetPercent ?? 0,
            hardStop: (data.budgetPercent ?? 0) >= 95,
            softStop: (data.budgetPercent ?? 0) >= 80,
          })
        }
      })
  }, [])

  async function save() {
    if (!settings) return
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const budgetPct = budgetMeta?.percentUsed ?? 0
  const barColor =
    budgetPct >= 95 ? 'bg-red-500' : budgetPct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'
  const statusLabel =
    budgetPct >= 95 ? 'Emergency — creation halted' : budgetPct >= 80 ? 'Warning — auto-creation paused' : 'Healthy'
  const statusColor =
    budgetPct >= 95 ? 'text-red-400' : budgetPct >= 80 ? 'text-amber-400' : 'text-emerald-400'

  return (
    <div className="border border-line rounded-xl bg-panel mb-6 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-ghost font-mono bg-white/5 px-2 py-0.5 rounded">ELLIS</span>
          <span className="text-sm font-medium text-ink-dim">Platform Settings</span>
          {budgetMeta && (
            <span className={`text-xs ${statusColor} ml-1`}>{statusLabel}</span>
          )}
        </div>
        <span className="text-ink-ghost text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && settings && (
        <div className="px-5 pb-5 space-y-5 border-t border-line pt-4">
          {/* Budget bar */}
          {budgetMeta && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-ghost">Monthly token budget used</span>
                <span className={statusColor}>{Math.round(budgetPct)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${Math.min(100, budgetPct)}%` }}
                />
              </div>
              <div className="text-xs text-ink-ghost">
                {budgetMeta.tokensUsed.toLocaleString()} tokens used this month
              </div>
            </div>
          )}

          {/* Monthly budget */}
          <div className="space-y-1.5">
            <label className="text-xs text-ink-dim font-medium block">Monthly token budget</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.monthlyTokenBudget}
                onChange={(e) =>
                  setSettings({ ...settings, monthlyTokenBudget: parseInt(e.target.value) || 0 })
                }
                className="w-36 bg-white/5 border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-ember"
                step={50000}
                min={0}
              />
              <span className="text-xs text-ink-ghost">tokens / month</span>
            </div>
          </div>

          {/* Threshold */}
          <div className="space-y-1.5">
            <label className="text-xs text-ink-dim font-medium block">
              Creation threshold — <span className="text-ink-ghost">{settings.creationThreshold} recipes per collection</span>
            </label>
            <input
              type="range"
              min={4}
              max={20}
              value={settings.creationThreshold}
              onChange={(e) =>
                setSettings({ ...settings, creationThreshold: parseInt(e.target.value) })
              }
              className="w-full accent-ember"
            />
            <div className="flex justify-between text-xs text-ink-ghost">
              <span>4</span>
              <span>20</span>
            </div>
          </div>

          {/* Daily run frequency */}
          <div className="space-y-1.5">
            <label className="text-xs text-ink-dim font-medium block">Runs per day</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setSettings({ ...settings, dailyRunCount: n })}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    settings.dailyRunCount === n
                      ? 'bg-ember text-white border-ember'
                      : 'bg-white/5 text-ink-dim border-line hover:border-ember/50'
                  }`}
                >
                  {n}×
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-ghost">
              Cron fires at 7am, 1pm, 9pm UTC — Ellis only acts on the first {settings.dailyRunCount} of those
            </p>
          </div>

          {/* Auto-creation toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-ink-dim font-medium">Auto-creation</div>
              <div className="text-xs text-ink-ghost mt-0.5">
                Ellis dispatches creation jobs automatically each day
              </div>
            </div>
            <button
              onClick={() =>
                setSettings({ ...settings, autoCreationEnabled: !settings.autoCreationEnabled })
              }
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                settings.autoCreationEnabled ? 'bg-ember' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  settings.autoCreationEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Save */}
          <div className="pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-ember text-white text-sm font-medium hover:bg-ember/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
