import type { DailyBrief } from '../types'
import { TEXT, type Lang } from '../lib/i18n'
import Icon from './Icon'

interface Props {
  brief: DailyBrief | null
  error?: string | null
  loading: boolean
  lang: Lang
  onRefresh: () => void
}

export default function DailyBriefPanel({
  brief,
  error,
  loading,
  lang,
  onRefresh,
}: Props) {
  const copy = TEXT[lang]
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-xl border border-line bg-surface-2/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              {copy.dailyBrief}
            </div>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              {brief?.title ?? copy.readyToGenerate}
            </h3>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="panel-hover grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-elevated text-solar disabled:opacity-60"
            title={copy.refreshAnalysis}
          >
            <Icon name="sync" size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <p className="mt-4 text-[14px] leading-relaxed text-muted">
          {error ??
            brief?.summary ??
            copy.autoBriefEmpty}
        </p>
        {brief?.recommendation && (
          <p className="mt-3 border-l-2 border-solar pl-3 text-[14px] leading-relaxed text-ink">
            {brief.recommendation}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
          <span className="rounded-full bg-elevated px-2.5 py-1 text-solar-bright">
            {copy.focus}: {brief?.focus ?? copy.pending}
          </span>
          <span className="rounded-full bg-elevated px-2.5 py-1 text-faint">
            {copy.source}: {brief?.source ?? copy.notGenerated}
          </span>
        </div>
      </div>

      <div className="grid content-start gap-3">
        {(brief?.bullets?.length
          ? brief.bullets
          : [copy.briefEmptyBullet]
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
