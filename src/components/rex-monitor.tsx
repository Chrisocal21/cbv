'use client'

import { useEffect, useState } from 'react'

type RexAlert = {
  level: 'ok' | 'warn' | 'critical'
  persona: string
  signal: string
  detail: string
}

type RexData = {
  generatedAt: string
  alerts: RexAlert[]
  criticalCount: number
  warnCount: number
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

export function RexMonitor() {
  const [data, setData] = useState<RexData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/rex')
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const headerStatus =
    !data ? null
    : data.criticalCount > 0 ? { label: `${data.criticalCount} critical`, color: 'bg-red-500/20 text-red-400 border-red-500/30' }
    : data.warnCount > 0 ? { label: `${data.warnCount} warning${data.warnCount > 1 ? 's' : ''}`, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
    : { label: 'all clear', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }

  return (
    <div className="border border-line rounded-xl bg-panel mb-6 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
          <span className="text-xs text-ink-ghost font-mono bg-white/5 px-2 py-0.5 rounded">REX</span>
          <span className="text-sm font-medium text-ink-dim">System Health</span>
          {headerStatus && (
            <span className={`text-xs font-semibold border rounded px-2 py-0.5 ${headerStatus.color}`}>
              {headerStatus.label}
            </span>
          )}
        </div>
        <span className="text-ink-ghost text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-line px-5 pb-5 pt-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-ink-ghost py-2">
              <div className="w-3.5 h-3.5 border border-stone-400 border-t-transparent rounded-full animate-spin" />
              Rex is scanning…
            </div>
          )}

          {data && (
            <div className="space-y-2">
              {data.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-lg px-3 py-2.5 border text-sm ${
                    alert.level === 'critical'
                      ? 'bg-red-500/10 border-red-500/30'
                      : alert.level === 'warn'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}
                >
                  <span className="text-base leading-none mt-px">
                    {alert.level === 'critical' ? '⛔' : alert.level === 'warn' ? '⚠️' : '✓'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {alert.persona !== 'rex' && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${personaColor(alert.persona)}`}>
                          {alert.persona}
                        </span>
                      )}
                      <span className={`text-xs font-mono ${
                        alert.level === 'critical' ? 'text-red-400'
                        : alert.level === 'warn' ? 'text-amber-400'
                        : 'text-emerald-400'
                      }`}>
                        {alert.signal}
                      </span>
                    </div>
                    <p className="text-ink-dim mt-1">{alert.detail}</p>
                  </div>
                </div>
              ))}

              <p className="text-xs text-ink-ghost pt-1">
                Last scan: {new Date(data.generatedAt).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
