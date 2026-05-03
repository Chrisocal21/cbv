'use client'

import { useState } from 'react'

interface Props {
  data: Record<string, number>  // date string (YYYY-MM-DD) → cook count
}

function getColor(count: number) {
  if (count === 0) return 'bg-line/40'
  if (count === 1) return 'bg-ember/30'
  if (count === 2) return 'bg-ember/55'
  return 'bg-ember/85'
}

export function CookHeatmap({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number } | null>(null)

  // Build 52 full weeks ending today
  const today = new Date()
  const todayDay = today.getDay() // 0=Sun, 1=Mon...
  // end of grid = this Saturday
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + (6 - todayDay))

  const weeks: { date: Date; dateStr: string; count: number }[][] = []
  let cursor = new Date(endDate)
  cursor.setDate(cursor.getDate() - 52 * 7 + 1)
  // align cursor to Sunday
  cursor.setDate(cursor.getDate() - cursor.getDay())

  while (cursor <= endDate) {
    const week: { date: Date; dateStr: string; count: number }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor)
      date.setDate(cursor.getDate() + d)
      const dateStr = date.toISOString().split('T')[0]
      week.push({ date, dateStr, count: data[dateStr] ?? 0 })
    }
    weeks.push(week)
    cursor.setDate(cursor.getDate() + 7)
  }

  return (
    <div>
      <div className="flex gap-0.5 overflow-x-auto pb-1" style={{ minWidth: 0 }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((cell) => (
              <div
                key={cell.dateStr}
                onMouseEnter={() => setTooltip({ date: cell.dateStr, count: cell.count })}
                onMouseLeave={() => setTooltip(null)}
                className={`w-3 h-3 rounded-[2px] cursor-default transition-opacity ${getColor(cell.count)} ${cell.date > today ? 'opacity-20' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      {tooltip && (
        <p className="text-xs text-ink-ghost mt-2">
          {tooltip.count === 0
            ? `${new Date(tooltip.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} — nothing cooked`
            : `${new Date(tooltip.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} — ${tooltip.count} cook${tooltip.count !== 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  )
}
