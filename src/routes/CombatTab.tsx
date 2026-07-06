import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import { createEncounter, deleteEncounter } from '../db/repo'
import { Button, Card, EmptyState } from '../ui/kit'
import type { CampaignContext } from './CampaignLayout'
import { EncounterBuilder } from '../combat/EncounterBuilder'
import { CombatTracker } from '../combat/CombatTracker'
import PlayerCombatView from '../combat/PlayerCombatView'

export default function CombatTab() {
  const { campaign, role } = useOutletContext<CampaignContext>()
  const [openId, setOpenId] = useState<string | null>(null)

  // Players get the live, read-only spectator view.
  if (role === 'player') return <PlayerCombatView />

  const encounters = useLiveQuery(
    () =>
      db.encounters
        .where({ campaignId: campaign.id })
        .filter(isLive)
        .toArray()
        .then((rows) => rows.sort((a, b) => b.updatedAt - a.updatedAt)),
    [campaign.id],
  )

  const open = encounters?.find((e) => e.id === openId) ?? null

  if (open) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setOpenId(null)}
          className="text-sm text-parchment-300/60 hover:text-parchment-100"
        >
          ← All encounters
        </button>
        {open.active ? (
          <CombatTracker encounter={open} />
        ) : (
          <EncounterBuilder encounter={open} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-parchment-300/60">
          {encounters?.length ?? 0} encounter
          {encounters?.length === 1 ? '' : 's'}
        </p>
        <Button
          variant="primary"
          onClick={async () => {
            const e = await createEncounter(campaign.id)
            setOpenId(e.id)
          }}
        >
          + New Encounter
        </Button>
      </div>

      {encounters && encounters.length === 0 && (
        <EmptyState
          icon="⚔️"
          title="No encounters yet"
          hint="Build an encounter from your wiki monsters and party, roll initiative, and run the fight — HP, conditions, and rounds all tracked."
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {encounters?.map((e) => (
          <Card key={e.id} className="p-4" onClick={() => setOpenId(e.id)}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-parchment-50">{e.name}</h3>
              {e.active && (
                <span className="rounded-full bg-blood-500/20 px-2 py-0.5 text-xs text-blood-500">
                  ● Round {e.active.round}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-parchment-300/60">
              {e.active
                ? `${e.active.combatants.length} in combat`
                : `${e.memberRefs.length} member${e.memberRefs.length === 1 ? '' : 's'} · not started`}
            </p>
            <div className="mt-3">
              <Button
                variant="danger"
                className="text-xs"
                onClick={(ev) => {
                  ev.stopPropagation()
                  deleteEncounter(e.id)
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
