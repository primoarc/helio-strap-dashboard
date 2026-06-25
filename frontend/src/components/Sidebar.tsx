import Icon, { type IconName } from './Icon'

export interface NavItem {
  id: string
  icon: IconName
  label: string
}

export const NAV: NavItem[] = [
  { id: 'top', icon: 'sun', label: 'Inicio' },
  { id: 'sleep', icon: 'moon', label: 'Sueño' },
  { id: 'heart', icon: 'heart', label: 'Corazón' },
  { id: 'activity', icon: 'route', label: 'Actividad' },
  { id: 'trends', icon: 'gauge', label: 'Tendencias' },
]

interface Props {
  active: string
  onSelect: (id: string) => void
}

export default function Sidebar({ active, onSelect }: Props) {
  return (
    <aside className="sticky top-0 hidden h-svh w-[68px] flex-col items-center gap-1 border-r border-line py-5 lg:flex">
      <button
        onClick={() => onSelect('top')}
        title="Helio Strap"
        className="mb-6 grid h-10 w-10 place-items-center rounded-xl glow-solar"
      >
        <Icon name="sun" size={22} className="text-solar-bright" />
      </button>
      {NAV.map((n) => {
        const isActive = n.id === active
        return (
          <button
            key={n.id}
            title={n.label}
            onClick={() => onSelect(n.id)}
            className={`group relative grid h-11 w-11 place-items-center rounded-xl transition-colors ${
              isActive
                ? 'bg-surface-2 text-solar-bright'
                : 'text-faint hover:bg-surface hover:text-muted'
            }`}
          >
            {isActive && (
              <span className="absolute left-0 h-5 w-0.5 -translate-x-3 rounded-full bg-solar" />
            )}
            <Icon name={n.icon} size={19} />
          </button>
        )
      })}
    </aside>
  )
}
