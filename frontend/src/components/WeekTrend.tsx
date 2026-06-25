import type { DayData } from '../types'
import { weekday, scoreTone } from '../lib/format'

interface Props {
  week: DayData[]
  metric: (d: DayData) => number
  unit?: string
}

/** Tendencia de 7 días como barras coloreadas por score. */
export default function WeekTrend({ week, metric }: Props) {
  const vals = week.map(metric)
  const max = Math.max(...vals, 1)
  return (
    <div className="flex h-40 items-end gap-2">
      {week.map((d, i) => {
        const v = vals[i]
        const pct = (v / max) * 100
        const today = i === week.length - 1
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
            <span className="font-mono text-[11px] tnum text-muted">{v}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-md transition-all"
                style={{
                  height: `${Math.max(4, pct)}%`,
                  background: scoreTone(v),
                  opacity: today ? 1 : 0.5,
                  boxShadow: today ? '0 0 18px -4px var(--color-solar)' : 'none',
                }}
              />
            </div>
            <span
              className={`font-mono text-[10px] uppercase ${
                today ? 'text-solar-bright' : 'text-faint'
              }`}
            >
              {weekday(d.date)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
