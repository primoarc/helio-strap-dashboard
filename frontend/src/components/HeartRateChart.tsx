import { useId } from 'react'
import type { Point } from '../types'

interface Props {
  series: Point[]
  resting: number
  height?: number
}

/**
 * Curva de frecuencia cardíaca del día (área + línea con gradiente).
 * SVG custom para un look de instrumento, no de librería genérica.
 */
export default function HeartRateChart({ series, resting, height = 150 }: Props) {
  const id = useId().replace(/:/g, '')
  const W = 640
  const H = height
  const pad = 6
  const vals = series.map((p) => p.v)
  const min = Math.min(...vals) - 6
  const max = Math.max(...vals) + 6
  const x = (i: number) => pad + (i / (series.length - 1)) * (W - pad * 2)
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2)

  const line = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(' ')
  const area = `${line} L${x(series.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(
    1,
  )},${H - pad} Z`
  const restY = y(resting)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      role="img"
      aria-label="Frecuencia cardíaca durante el día"
    >
      <defs>
        <linearGradient id={`hr-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-strain)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--color-strain)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`hr-line-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-solar)" />
          <stop offset="100%" stopColor="var(--color-strain)" />
        </linearGradient>
      </defs>

      {/* línea de reposo */}
      <line
        x1={pad}
        x2={W - pad}
        y1={restY}
        y2={restY}
        stroke="var(--color-line-strong)"
        strokeDasharray="3 5"
      />
      <text
        x={W - pad}
        y={restY - 5}
        textAnchor="end"
        className="font-mono"
        fontSize="10"
        fill="var(--color-faint)"
      >
        reposo {resting}
      </text>

      <path d={area} fill={`url(#hr-fill-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={`url(#hr-line-${id})`}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
