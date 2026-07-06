import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary:
    'bg-ember-500 text-ink-950 hover:bg-ember-400 border border-ember-600',
  ghost:
    'bg-transparent hover:bg-ink-700/40 border border-ink-700 text-parchment-100',
  danger:
    'bg-transparent hover:bg-blood-600/20 border border-blood-600/60 text-blood-500',
}

export function Button({
  variant = 'ghost',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-ink-700/60 bg-ink-800/60 backdrop-blur ${
        onClick ? 'cursor-pointer hover:border-ember-500/60 transition-colors' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700/60 pb-4">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-parchment-50">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-parchment-300/70">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: string
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-700/60 py-16 text-center">
      <div className="text-4xl opacity-70">{icon}</div>
      <div className="font-serif text-lg text-parchment-100">{title}</div>
      {hint && <p className="max-w-sm text-sm text-parchment-300/60">{hint}</p>}
      {action}
    </div>
  )
}

export const KIND_META: Record<
  string,
  { icon: string; label: string; plural: string }
> = {
  npc: { icon: '🧑‍🎤', label: 'NPC', plural: 'NPCs' },
  location: { icon: '🗺️', label: 'Location', plural: 'Locations' },
  quest: { icon: '📜', label: 'Quest', plural: 'Quests' },
  item: { icon: '⚔️', label: 'Item', plural: 'Items' },
  monster: { icon: '🐉', label: 'Monster', plural: 'Monsters' },
}
