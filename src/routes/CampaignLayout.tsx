import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ensureInviteCode } from '../db/repo'
import type { Campaign } from '../db/types'
import { useAuth } from '../auth/AuthProvider'

export type Role = 'dm' | 'player'
export type CampaignContext = { campaign: Campaign; role: Role; myUid: string | null }

const DM_TABS = [
  { to: '', label: 'Wiki', icon: '📚', end: true },
  { to: 'sessions', label: 'Sessions', icon: '📅', end: false },
  { to: 'combat', label: 'Combat', icon: '⚔️', end: false },
  { to: 'party', label: 'Party', icon: '🎭', end: false },
  { to: 'characters', label: 'Characters', icon: '🛡️', end: false },
]
const PLAYER_TABS = [
  { to: 'combat', label: 'Combat', icon: '⚔️', end: false },
  { to: 'party', label: 'Party', icon: '🎭', end: false },
  { to: 'characters', label: 'My Character', icon: '🛡️', end: false },
]

export function roleFor(campaign: Campaign, userId: string | null): Role {
  // An unsynced local campaign, or one you own, is yours to DM.
  if (!campaign.ownerId || !userId) return 'dm'
  return campaign.ownerId === userId ? 'dm' : 'player'
}

export default function CampaignLayout() {
  const { campaignId } = useParams()
  const { user } = useAuth()
  const myUid = user?.id ?? null

  const campaign = useLiveQuery(
    () => (campaignId ? db.campaigns.get(campaignId) : undefined),
    [campaignId],
  )

  // Don't hang on "Loading…" forever if the campaign never arrives.
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    setSlow(false)
    const t = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(t)
  }, [campaignId])

  if (campaign === undefined && !slow) {
    return <div className="py-20 text-center text-parchment-300/50">Loading…</div>
  }
  if (!campaign || campaign._deleted) {
    return (
      <div className="space-y-3 py-20 text-center text-parchment-300/50">
        <p>Couldn't load this campaign.</p>
        <p className="text-sm">
          If you just joined, give it a moment and refresh — or check your
          connection.
        </p>
        <Link to="/" className="inline-block text-ember-400 hover:underline">
          ← Back to campaigns
        </Link>
      </div>
    )
  }

  const role = roleFor(campaign, myUid)
  const tabs = role === 'dm' ? DM_TABS : PLAYER_TABS

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-8 w-1.5 rounded-full" style={{ background: campaign.accent }} />
        <h1 className="font-serif text-2xl font-semibold text-parchment-50">
          {campaign.name}
        </h1>
        {role === 'player' ? (
          <span className="rounded-full bg-arcane-500/20 px-2 py-0.5 text-xs text-arcane-500">
            Player
          </span>
        ) : (
          <InviteCode campaign={campaign} />
        )}
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-ink-700/60">
        {tabs.map((t) => (
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

      <Outlet context={{ campaign, role, myUid } satisfies CampaignContext} />
    </div>
  )
}

function InviteCode({ campaign }: { campaign: Campaign }) {
  const [copied, setCopied] = useState(false)

  // Backfill a code for campaigns created before invite codes existed.
  useEffect(() => {
    if (!campaign.inviteCode) ensureInviteCode(campaign)
  }, [campaign])

  if (!campaign.inviteCode) return null

  const copy = () => {
    navigator.clipboard?.writeText(campaign.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={copy}
      title="Share this code with your players"
      className="ml-auto flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-1 text-xs hover:border-ember-500/60"
    >
      <span className="text-parchment-300/50">Invite</span>
      <span className="font-mono tracking-widest text-ember-400">
        {campaign.inviteCode}
      </span>
      <span className="text-parchment-300/40">{copied ? '✓' : '⧉'}</span>
    </button>
  )
}
