import { useOutletContext } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import { EmptyState } from '../ui/kit'
import type { CampaignContext } from '../routes/CampaignLayout'
import { BattleMap } from './BattleMap'

// The player's view of combat: a live, shared battlemap. They can move their
// own token on their turn; everything else is read-only.
export default function PlayerCombatView() {
  const { campaign } = useOutletContext<CampaignContext>()

  const encounter = useLiveQuery(
    () =>
      db.encounters
        .where({ campaignId: campaign.id })
        .filter((e) => isLive(e) && !!e.active)
        .toArray()
        .then((rows) => rows[0]),
    [campaign.id],
  )

  if (encounter === undefined) {
    return <div className="py-16 text-center text-parchment-300/40">Loading…</div>
  }
  if (!encounter?.active) {
    return (
      <EmptyState
        icon="⚔️"
        title="No battle in progress"
        hint="When your DM starts a fight, the battlemap will appear here — live."
      />
    )
  }

  const { round, turnIndex, combatants } = encounter.active
  const current = combatants[turnIndex]

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-ink-700/60 bg-ink-800/60 px-4 py-3">
        <div className="font-serif text-xl font-semibold text-parchment-50">
          {encounter.name} · Round {round}
        </div>
        <div className="text-xs text-parchment-300/60">
          {current ? `${current.name}'s turn` : '—'}
        </div>
      </div>
      <BattleMap encounter={encounter} role="player" />
    </div>
  )
}
