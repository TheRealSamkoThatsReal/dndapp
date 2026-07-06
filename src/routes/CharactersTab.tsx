import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import { createCharacter } from '../db/repo'
import { Button, Card, EmptyState } from '../ui/kit'
import type { CampaignContext } from './CampaignLayout'
import { CharacterSheet } from '../characters/CharacterSheet'
import { abilityMod, formatMod } from '../db/types'

export default function CharactersTab() {
  const { campaign, myUid } = useOutletContext<CampaignContext>()
  const [openId, setOpenId] = useState<string | null>(null)

  // A character owned by someone else (a player's, seen by the DM) is read-only.
  const isMine = (ownerId: string | null) => !ownerId || ownerId === myUid

  const characters = useLiveQuery(
    () =>
      db.characters
        .where({ campaignId: campaign.id })
        .filter(isLive)
        .toArray()
        .then((r) => r.sort((a, b) => a.name.localeCompare(b.name))),
    [campaign.id],
  )

  const open = characters?.find((c) => c.id === openId) ?? null

  if (open) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setOpenId(null)}
          className="text-sm text-parchment-300/60 hover:text-parchment-100"
        >
          ← All characters
        </button>
        <CharacterSheet character={open} readOnly={!isMine(open.ownerId)} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-parchment-300/60">
          {characters?.length ?? 0} character
          {characters?.length === 1 ? '' : 's'}
        </p>
        <Button
          variant="primary"
          onClick={async () => {
            const c = await createCharacter(campaign.id)
            setOpenId(c.id)
          }}
        >
          + New Character
        </Button>
      </div>

      {characters && characters.length === 0 && (
        <EmptyState
          icon="🛡️"
          title="No characters yet"
          hint="Build full 5e character sheets — abilities, skills, HP, spell slots, and inventory. They drop straight into the combat tracker."
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {characters?.map((c) => (
          <Card key={c.id} className="p-4" onClick={() => setOpenId(c.id)}>
            <div className="flex items-center gap-2">
              <h3 className="flex-1 font-serif text-lg text-parchment-50">{c.name}</h3>
              {!isMine(c.ownerId) && (
                <span className="rounded-full bg-arcane-500/20 px-2 py-0.5 text-xs text-arcane-500">
                  Player
                </span>
              )}
            </div>
            <p className="text-sm text-parchment-300/60">
              {[c.ancestry, c.className && `${c.className} ${c.level}`]
                .filter(Boolean)
                .join(' · ') || 'Unfinished'}
            </p>
            <div className="mt-3 flex gap-4 text-xs text-parchment-300/70">
              <span>❤️ {c.currentHp}/{c.maxHp}</span>
              <span>🛡️ AC {c.ac}</span>
              <span>
                Init {formatMod(abilityMod(c.abilities.dex))}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
