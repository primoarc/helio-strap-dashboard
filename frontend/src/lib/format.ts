export function hm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function weekday(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { weekday: 'short' })
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function longDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

export const nf = new Intl.NumberFormat('es')

/** color semántico según un score 0-100 */
export function scoreTone(v: number): string {
  if (v >= 80) return 'var(--color-recovery)'
  if (v >= 60) return 'var(--color-solar)'
  if (v >= 40) return 'var(--color-solar-deep)'
  return 'var(--color-strain)'
}

export function scoreLabel(v: number): string {
  if (v >= 85) return 'Óptimo'
  if (v >= 70) return 'Bueno'
  if (v >= 50) return 'Moderado'
  if (v >= 35) return 'Bajo'
  return 'Crítico'
}
