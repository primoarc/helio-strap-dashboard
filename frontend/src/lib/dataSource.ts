import type { HealthSnapshot } from '../types'
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

export const dataMode = MODE
