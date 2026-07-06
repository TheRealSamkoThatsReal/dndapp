import { useOutletContext } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import { EmptyState } from '../ui/kit'
import type { CampaignContext } from '../routes/CampaignLayout'

// What players see: a live, read-only view of the DM's active combat. Updates
// arrive over sync/realtime as the DM runs the fight.
export default function PlayerCombatView() {
  const { campaign } = useOutletContext<CampaignContext>()

  const active = useLiveQuery(
    () =>
      db.encounters
        .where({ campaignId: campaign.id })
        .filter((e) => isLive(e) && !!e.active)
        .toArray()
        .then((rows) => rows[0]),
    [campaign.id],
  )

  if (active === undefined) {
    return <div className="py-16 text-center text-parchment-300/40">Loading…</div>
  }
  if (!active || !active.active) {
    return (
      <EmptyState
        icon="⚔️"
        title="No combat running"
        hint="When your DM starts a fight, the initiative order and everyone's status will appear here live."
      />
    )
  }

  const { round, turnIndex, combatants } = active.active

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-700/60 bg-ink-800/60 p-4">
        <div className="font-serif text-2xl font-semibold text-parchment-50">
          {active.name} · Round {round}
        </div>
        <div className="text-xs text-parchment-300/60">
          {combatants[turnIndex]?.name ?? '—'}'s turn
        </div>
      </div>

      <div className="space-y-2">
        {combatants.map((c, i) => {
          const pct = Math.max(0, Math.min(100, (c.currentHp / Math.max(1, c.maxHp)) * 100))
          const down = c.currentHp <= 0
          return (
            <div
              key={c.id}
              className={`rounded-xl border p-3 ${
                i === turnIndex
                  ? 'border-ember-500 bg-ember-500/10'
                  : 'border-ink-700/60 bg-ink-800/40'
              } ${down ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-700/60 font-serif text-sm text-ember-400">
                  {c.initiative}
                </span>
                <span className={`flex-1 font-medium ${c.isPC ? 'text-arcane-500' : 'text-parchment-50'}`}>
                  {c.name}
                  {down && <span className="ml-2 text-xs text-blood-500">down</span>}
                </span>
                <span className="text-xs text-parchment-300/50">AC {c.ac}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-950/60">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: pct > 50 ? '#6b8a4f' : pct > 25 ? '#d6872b' : '#b23a3a',
                  }}
                />
              </div>
              {c.conditions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.conditions.map((cond) => (
                    <span
                      key={cond.name}
                      className="rounded-full bg-arcane-500/20 px-2 py-0.5 text-xs text-arcane-500"
                    >
                      {cond.name}
                      {cond.rounds !== null && ` (${cond.rounds})`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
