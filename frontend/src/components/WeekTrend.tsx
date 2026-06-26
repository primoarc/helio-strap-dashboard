import type { DayData } from '../types'
import { weekday, scoreTone } from '../lib/format'
import { TEXT, type Lang } from '../lib/i18n'

interface Props {
  week: DayData[]
  metric: (d: DayData) => number
  unit?: string
  lang: Lang
}

/** Tendencia de 7 días como línea, área y puntos por día. */
export default function WeekTrend({ week, metric, lang }: Props) {
  const copy = TEXT[lang]
  const vals = week.map(metric)
  const width = 320
  const height = 150
  const padX = 18
  const padTop = 14
  const padBottom = 28
  const plotH = height - padTop - padBottom
  const step = week.length > 1 ? (width - padX * 2) / (week.length - 1) : 0

  const points = vals.map((v, i) => ({
    date: week[i].date,
    value: v,
    x: padX + i * step,
    y: padTop + (1 - Math.max(0, Math.min(100, v)) / 100) * plotH,
  }))
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L ${points[points.length - 1]?.x ?? padX} ${height - padBottom} L ${padX} ${
    height - padBottom
  } Z`
  const latest = points[points.length - 1]

  return (
    <div className="h-44">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={lang === 'en' ? 'Weekly readiness trend' : 'Tendencia semanal de readiness'}
      >
        <defs>
          <linearGradient id="readiness-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-solar)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-solar)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="readiness-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-recovery)" />
            <stop offset="100%" stopColor="var(--color-solar-bright)" />
          </linearGradient>
        </defs>

        {[25, 50, 75].map((v) => {
          const y = padTop + (1 - v / 100) * plotH
          return (
            <g key={v}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeDasharray="4 7"
              />
              <text
                x={width - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-faint font-mono text-[9px]"
              >
                {v}
              </text>
            </g>
          )
        })}

        <path d={area} fill="url(#readiness-area)" />
        <path
          d={line}
          fill="none"
          stroke="url(#readiness-line)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />

        {points.map((p, i) => {
          const active = i === points.length - 1
          return (
            <g key={p.date}>
              <line
                x1={p.x}
                x2={p.x}
                y1={p.y + 9}
                y2={height - padBottom}
                stroke={scoreTone(p.value)}
                strokeOpacity={active ? 0.5 : 0.22}
                strokeWidth="2"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={active ? 7 : 5}
                fill={scoreTone(p.value)}
                stroke="var(--color-bg)"
                strokeWidth="3"
                style={{
                  filter: active ? 'drop-shadow(0 0 10px var(--color-solar))' : 'none',
                }}
              />
              <text
                x={p.x}
                y={Math.max(11, p.y - 12)}
                textAnchor="middle"
                className={`fill-current font-mono text-[11px] tnum ${
                  active ? 'text-solar-bright' : 'text-muted'
                }`}
              >
                {p.value}
              </text>
              <text
                x={p.x}
                y={height - 7}
                textAnchor="middle"
                className={`fill-current font-mono text-[10px] uppercase ${
                  active ? 'text-solar-bright' : 'text-faint'
                }`}
              >
                {weekday(p.date, lang)}
              </text>
            </g>
          )
        })}
      </svg>
      {latest && (
        <div className="-mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-faint">
          <span>{copy.sevenDays}</span>
          <span className="text-solar-bright">
            {copy.current} {latest.value}
          </span>
        </div>
      )}
    </div>
  )
}
