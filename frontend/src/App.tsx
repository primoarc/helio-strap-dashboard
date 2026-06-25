import { useCallback, useEffect, useState } from 'react'
import type { HealthSnapshot } from './types'
import { fetchSnapshot } from './lib/dataSource'
import { hm, localDateKey, nf, scoreLabel } from './lib/format'

import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Panel from './components/Panel'
import SolarRing from './components/SolarRing'
import MiniRingStat from './components/MiniRingStat'
import HeartRateChart from './components/HeartRateChart'
import SleepStages from './components/SleepStages'
import ActivityBars from './components/ActivityBars'
import WeekTrend from './components/WeekTrend'
import Workouts from './components/Workouts'
import StatTile from './components/StatTile'
import Heartbeat from './components/Heartbeat'
import Icon from './components/Icon'

const SECTION_IDS = ['top', 'heart', 'sleep', 'activity', 'trends']

export default function App() {
  const [data, setData] = useState<HealthSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [active, setActive] = useState('top')

  // Scrollspy: resalta en el sidebar la sección visible.
  useEffect(() => {
    if (!data) return
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      Boolean,
    ) as HTMLElement[]
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-12% 0px -68% 0px', threshold: 0 },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [data])

  const goto = useCallback((id: string) => {
    setActive(id)
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const load = useCallback(async (refresh = false) => {
    setRefreshing(true)
    try {
      setData(await fetchSnapshot(refresh))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div className="grid min-h-svh place-items-center p-6 text-center">
        <div className="panel max-w-sm p-8">
          <Icon name="bolt" size={28} className="mx-auto text-strain" />
          <h1 className="mt-3 font-display text-xl text-ink">Sin conexión</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <button
            onClick={() => load()}
            className="panel-hover mt-5 rounded-lg bg-surface-2 px-4 py-2 text-sm text-ink"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="grid min-h-svh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-12 w-12 rounded-full"
            style={{
              background:
                'radial-gradient(circle, var(--color-solar-bright), var(--color-solar-deep))',
              animation: 'pulse-soft 1.4s ease-in-out infinite',
              boxShadow: '0 0 40px -6px var(--color-solar)',
            }}
          />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">
            Sincronizando Helio Strap…
          </p>
        </div>
      </div>
    )
  }

  const { today, week } = data
  const a = today.activity
  const isCurrentDay = today.date === localDateKey()
  const recordLabel = isCurrentDay ? 'hoy' : 'último registro'

  return (
    <div className="flex">
      <Sidebar active={active} onSelect={goto} />
      <main className="mx-auto w-full max-w-[1280px] px-5 py-6 md:px-8">
        <TopBar data={data} onRefresh={() => load(true)} refreshing={refreshing} />

        {/* Fila 1 — readiness héroe + corazón */}
        <div className="grid grid-cols-12 gap-4">
          <Panel id="top" className="col-span-12 lg:col-span-4" delay={0}>
            <div className="flex flex-col items-center">
              <SolarRing value={today.readiness} />
              <p className="mt-4 text-center text-[13px] leading-relaxed text-muted">
                Tu energía está <b className="text-ink">{scoreLabel(today.readiness).toLowerCase()}</b>.
                {!isCurrentDay
                  ? ' Registro más reciente de Zepp.'
                  : today.readiness >= 70
                  ? ' Buen día para empujar fuerte.'
                  : ' Considera una sesión ligera hoy.'}
              </p>
              <div className="mt-6 grid w-full grid-cols-3 gap-2 border-t border-line pt-5">
                <MiniRingStat
                  value={today.sleep.score}
                  label="Sueño"
                  display={String(today.sleep.score)}
                />
                <MiniRingStat
                  value={today.bodyBattery}
                  label="Hybrid"
                  display={String(today.bodyBattery)}
                  from="#2f9e74"
                  to="var(--color-recovery)"
                />
                <MiniRingStat
                  value={today.stress}
                  label="Estrés"
                  display={String(today.stress)}
                  from="var(--color-solar)"
                  to="var(--color-strain)"
                />
              </div>
            </div>
          </Panel>

          <Panel
            id="heart"
            className="col-span-12 lg:col-span-8"
            title={`Frecuencia cardíaca · ${recordLabel}`}
            delay={60}
            right={
              <div className="flex items-center gap-4 font-mono text-[11px] text-muted tnum">
                <span className="flex items-center gap-1">
                  <span className="text-faint">act</span>
                  <Heartbeat bpm={today.heart.current} size={15} />
                </span>
                <span>
                  <span className="text-faint">máx</span>{' '}
                  <b className="text-strain">{today.heart.max}</b>
                </span>
                <span>
                  <span className="text-faint">hrv</span>{' '}
                  <b className="text-ink">{today.heart.hrv}ms</b>
                </span>
              </div>
            }
          >
            <HeartRateChart series={today.heart.series} resting={today.heart.resting} />
            <div className="mt-4 grid grid-cols-4 gap-3 border-t border-line pt-4">
              {[
                { l: 'Reposo', v: `${today.heart.resting}`, u: 'ppm' },
                { l: 'Mínima', v: `${today.heart.min}`, u: 'ppm' },
                { l: 'Máxima', v: `${today.heart.max}`, u: 'ppm' },
                { l: 'SpO₂', v: `${today.spo2}`, u: '%' },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-faint">
                    {s.l}
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold tnum text-ink">
                    {s.v}
                    <span className="ml-1 font-mono text-xs text-muted">{s.u}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Fila 2 — tarjetas rápidas */}
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatTile
            icon="steps"
            label="Pasos"
            value={nf.format(a.steps)}
            sub={`meta ${nf.format(a.stepsGoal)}`}
            delay={0}
          />
          <StatTile
            icon="route"
            label="Distancia"
            value={a.distanceKm}
            unit="km"
            delay={40}
          />
          <StatTile
            icon="flame"
            label="Calorías"
            value={nf.format(a.calories)}
            unit="kcal"
            accent="var(--color-strain)"
            delay={80}
          />
          <StatTile
            icon="bolt"
            label="Exertion"
            value={today.exertion}
            unit="%"
            delay={120}
          />
          <StatTile
            icon="heart"
            label="HRV"
            value={today.heart.hrv}
            unit="ms"
            accent="var(--color-strain)"
            delay={160}
          />
          <StatTile
            icon="drop"
            label="SpO₂"
            value={today.spo2}
            unit="%"
            accent="var(--color-info)"
            delay={200}
          />
        </div>

        {/* Fila 3 — sueño + entrenos */}
        <div className="mt-4 grid grid-cols-12 gap-4">
          <Panel
            id="sleep"
            className="col-span-12 lg:col-span-7"
            title="Sueño de anoche"
            delay={0}
            right={
              <div className="text-right">
                <div className="font-display text-lg font-semibold text-ink">
                  {hm(today.sleep.totalMinutes)}
                </div>
                <div className="font-mono text-[11px] text-faint">
                  {scoreLabel(today.sleep.score)} · {today.sleep.efficiency}% efic.
                </div>
              </div>
            }
          >
            <SleepStages sleep={today.sleep} />
          </Panel>

          <Panel
            className="col-span-12 lg:col-span-5"
            title={`Entrenamientos · ${recordLabel}`}
            delay={60}
          >
            <Workouts workouts={today.workouts} />
          </Panel>
        </div>

        {/* Fila 4 — actividad por hora + tendencia semanal */}
        <div className="mt-4 grid grid-cols-12 gap-4">
          <Panel
            id="activity"
            className="col-span-12 lg:col-span-7"
            title={`Pasos por hora · ${recordLabel}`}
            delay={0}
          >
            <ActivityBars hourly={a.hourly} />
          </Panel>
          <Panel
            id="trends"
            className="col-span-12 lg:col-span-5"
            title="Readiness · 7 días"
            delay={60}
          >
            <WeekTrend week={week} metric={(d) => d.readiness} />
          </Panel>
        </div>

        <footer className="mt-8 flex items-center justify-between border-t border-line pt-4 font-mono text-[11px] text-faint">
          <span>Helio Strap · dashboard</span>
          <span>
            UI basada en componentes de OpenFit · fuente: {data.source}
          </span>
        </footer>
      </main>
    </div>
  )
}
