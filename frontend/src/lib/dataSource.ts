import type { DailyBrief, HealthSnapshot } from '../types'
import { buildDemoSnapshot } from '../data/demo'

/**
 * Única puerta de entrada a los datos para la UI.
 *
 * - 'demo'  → datos sintéticos locales (sin red).
 * - 'zepp'  → pega al backend Python que habla con la nube de Zepp/Huami.
 *
 * El modo se controla con VITE_DATA_SOURCE (.env). Por defecto: demo.
 */

const MODE = (import.meta.env.VITE_DATA_SOURCE as string) || 'demo'

export async function fetchSnapshot(refresh = false): Promise<HealthSnapshot> {
  if (MODE === 'zepp') {
    // refresh=1 le dice al backend que ignore su caché y baje datos frescos.
    const res = await fetch(`/api/snapshot${refresh ? '?refresh=1' : ''}`)
    if (!res.ok) {
      throw new Error(`Backend Zepp respondió ${res.status}`)
    }
    return (await res.json()) as HealthSnapshot
  }

  // Modo demo: pequeño delay para simular sincronización.
  await new Promise((r) => setTimeout(r, 450))
  return buildDemoSnapshot()
}

export async function fetchDailyBrief(refresh = false): Promise<DailyBrief> {
  if (MODE === 'zepp') {
    const res = await fetch(`/api/daily-brief${refresh ? '?refresh=1' : ''}`)
    if (!res.ok) {
      throw new Error(`Brief respondió ${res.status}`)
    }
    return (await res.json()) as DailyBrief
  }

  const demo = buildDemoSnapshot()
  const today = demo.today
  return {
    date: today.date,
    generatedAt: new Date().toISOString(),
    source: 'local',
    title: `Construir: readiness ${today.readiness}`,
    summary: `Sueño ${today.sleep.score}, HRV ${today.heart.hrv} ms, Hybrid ${today.bodyBattery} y estrés ${today.stress}.`,
    recommendation: 'Buen día para zona 2, técnica o fuerza controlada.',
    focus: 'base aeróbica',
    bullets: [
      `Readiness ${today.readiness}: ${today.readiness >= 70 ? 'bueno' : 'moderado'}.`,
      `Sueño ${today.sleep.score} con ${Math.floor(today.sleep.totalMinutes / 60)}h ${String(today.sleep.totalMinutes % 60).padStart(2, '0')}m.`,
      `Exertion ${today.exertion}% con ${today.activity.steps} pasos.`,
    ],
    warnings: [],
  }
}

export const dataMode = MODE
