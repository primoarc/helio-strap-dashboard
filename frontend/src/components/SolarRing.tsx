import Ring from './Ring'
import { scoreLabel } from '../lib/format'

interface Props {
  value: number
  size?: number
}

/**
 * Anillo héroe de "readiness/energía". Brilla como un sol:
 * halo radial + marcas de instrumento alrededor + dígito grande.
 */
export default function SolarRing({ value, size = 248 }: Props) {
  const ticks = Array.from({ length: 60 })
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* halo solar */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: -size * 0.18,
          background:
            'radial-gradient(circle, rgba(255,157,46,0.30), rgba(255,157,46,0) 62%)',
          filter: 'blur(6px)',
          animation: 'pulse-soft 5s ease-in-out infinite',
        }}
      />
      {/* marcas de instrumento */}
      <svg
        aria-hidden
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0 }}
      >
        {ticks.map((_, i) => {
          const ang = (i / 60) * Math.PI * 2
          const cx = size / 2
          const outer = size / 2 - 2
          const major = i % 5 === 0
          const len = major ? 9 : 5
          const x1 = cx + Math.cos(ang) * outer
          const y1 = cx + Math.sin(ang) * outer
          const x2 = cx + Math.cos(ang) * (outer - len)
          const y2 = cx + Math.sin(ang) * (outer - len)
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,240,220,0.18)"
              strokeWidth={major ? 1.6 : 1}
            />
          )
        })}
      </svg>

      <div style={{ position: 'absolute', inset: size * 0.08 }}>
        <Ring
          value={value}
          size={size * 0.84}
          stroke={14}
          glow
          from="var(--color-solar-deep)"
          to="var(--color-solar-bright)"
        >
          <div className="font-display tnum" style={{ lineHeight: 1 }}>
            <span style={{ fontSize: size * 0.27, fontWeight: 700 }}>
              {Math.round(value)}
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-solar-bright)',
            }}
            className="font-mono"
          >
            {scoreLabel(value)}
          </div>
          <div
            style={{ marginTop: 2, fontSize: 11, color: 'var(--color-faint)' }}
            className="font-mono"
          >
            readiness
          </div>
        </Ring>
      </div>
    </div>
  )
}
