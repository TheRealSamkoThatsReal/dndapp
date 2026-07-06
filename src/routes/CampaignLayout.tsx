import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Campaign } from '../db/types'

const TABS = [
  { to: '', label: 'Wiki', icon: '📚', end: true },
  { to: 'sessions', label: 'Sessions', icon: '📅', end: false },
  { to: 'combat', label: 'Combat', icon: '⚔️', end: false },
  { to: 'characters', label: 'Characters', icon: '🛡️', end: false },
]

export type CampaignContext = { campaign: Campaign }

export default function CampaignLayout() {
  const { campaignId } = useParams()
  const campaign = useLiveQuery(
    () => (campaignId ? db.campaigns.get(campaignId) : undefined),
    [campaignId],
  )

  if (campaign === undefined) {
    return <div className="py-20 text-center text-parchment-300/50">Loading…</div>
  }
  if (!campaign || campaign._deleted) {
    return (
      <div className="py-20 text-center text-parchment-300/50">
        Campaign not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span
          className="h-8 w-1.5 rounded-full"
          style={{ background: campaign.accent }}
        />
        <h1 className="font-serif text-2xl font-semibold text-parchment-50">
          {campaign.name}
        </h1>
      </div>

      <nav className="flex gap-1 border-b border-ink-700/60">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-ember-500 text-parchment-50'
                  : 'border-transparent text-parchment-300/60 hover:text-parchment-100'
              }`
            }
          >
            <span>{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ campaign } satisfies CampaignContext} />
    </div>
  )
}
