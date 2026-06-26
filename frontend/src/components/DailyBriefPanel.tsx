import type { DailyBrief } from '../types'
import Icon from './Icon'

interface Props {
  brief: DailyBrief | null
  error?: string | null
  loading: boolean
  onRefresh: () => void
}

export default function DailyBriefPanel({
  brief,
  error,
  loading,
  onRefresh,
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-xl border border-line bg-surface-2/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              Daily AI brief
            </div>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              {brief?.title ?? 'Listo para generar'}
            </h3>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="panel-hover grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-elevated text-solar disabled:opacity-60"
            title="Actualizar análisis"
          >
            <Icon name="sync" size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <p className="mt-4 text-[14px] leading-relaxed text-muted">
          {error ??
            brief?.summary ??
            'Se genera automáticamente después de las 8:00 AM o cuando presionas actualizar.'}
        </p>
        {brief?.recommendation && (
          <p className="mt-3 border-l-2 border-solar pl-3 text-[14px] leading-relaxed text-ink">
            {brief.recommendation}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
          <span className="rounded-full bg-elevated px-2.5 py-1 text-solar-bright">
            foco: {brief?.focus ?? 'pendiente'}
          </span>
          <span className="rounded-full bg-elevated px-2.5 py-1 text-faint">
            fuente: {brief?.source ?? 'sin generar'}
          </span>
        </div>
      </div>

      <div className="grid content-start gap-3">
        {(brief?.bullets?.length
          ? brief.bullets
          : ['Abre la app después de las 8:00 AM para generar tu brief.']
        ).map((b) => (
          <div
            key={b}
            className="rounded-lg border border-line bg-surface-2/40 px-3 py-2 text-[13px] text-muted"
          >
            {b}
          </div>
        ))}
        {brief?.warnings?.map((w) => (
          <div
            key={w}
            className="rounded-lg border border-strain/30 bg-strain/10 px-3 py-2 text-[13px] text-ink"
          >
            {w}
          </div>
        ))}
      </div>
    </div>
  )
}
