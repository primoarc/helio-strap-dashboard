import type { Workout } from '../types'
import Icon, { type IconName } from './Icon'
import { clock, hm } from '../lib/format'

const TYPE_ICON: Record<string, IconName> = {
  Correr: 'route',
  Ciclismo: 'route',
  Caminata: 'steps',
  Fuerza: 'bolt',
  Yoga: 'pulse',
}

export default function Workouts({ workouts }: { workouts: Workout[] }) {
  if (workouts.length === 0) {
    return (
      <div className="flex h-full min-h-28 flex-col items-center justify-center gap-2 text-center">
        <Icon name="moon" size={20} className="text-faint" />
        <p className="text-[13px] text-faint">Día de descanso · sin entrenos</p>
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {workouts.map((w) => (
        <li
          key={w.id}
          className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5"
        >
          <span
            className="grid h-9 w-9 place-items-center rounded-lg text-solar"
            style={{ background: 'var(--color-elevated)' }}
          >
            <Icon name={TYPE_ICON[w.type] ?? 'pulse'} size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{w.type}</span>
              <span className="font-mono text-[11px] text-faint">
                {clock(w.start)}
              </span>
            </div>
            <div className="mt-0.5 flex gap-3 font-mono text-[11px] text-muted tnum">
              <span>{hm(w.durationMin)}</span>
              <span className="text-strain">{w.avgHr} ppm</span>
              <span>{w.calories} kcal</span>
              {w.distanceKm != null && <span>{w.distanceKm} km</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
