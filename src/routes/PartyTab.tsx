import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import {
  createSharedEntity,
  deleteSharedEntity,
  updateSharedEntity,
} from '../db/repo'
import type { EntityKind } from '../db/types'
import { useAuth } from '../auth/AuthProvider'
import { Button, EmptyState, KIND_META } from '../ui/kit'
import { NotesEditor } from '../components/NotesEditor'
import type { CampaignContext } from './CampaignLayout'

const KINDS: EntityKind[] = ['npc', 'location', 'quest', 'item', 'monster']

export default function PartyTab() {
  const { campaign, role, myUid } = useOutletContext<CampaignContext>()
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const authorName = user?.email?.split('@')[0] ?? 'A player'

  const entries = useLiveQuery(
    () =>
      db.sharedEntities
        .where({ campaignId: campaign.id })
        .filter(isLive)
        .toArray()
        .then((r) => r.sort((a, b) => a.name.localeCompare(b.name))),
    [campaign.id],
  )

  const selected = entries?.find((e) => e.id === selectedId) ?? null
  // Author or DM may edit; everyone else sees it read-only.
  const canEdit = (ownerId: string | null) =>
    role === 'dm' || ownerId === myUid || ownerId === null

  async function add(kind: EntityKind) {
    const e = await createSharedEntity(campaign.id, kind, authorName)
    setSelectedId(e.id)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-parchment-300/60">
        Shared party notes — everyone in the campaign can add and read these.
        {role === 'dm' && ' (Your private Wiki tab stays hidden from players.)'}
      </p>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <Button key={k} onClick={() => add(k)} className="text-xs">
                + {KIND_META[k].label}
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            {entries?.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-parchment-300/40">
                No shared entries yet.
              </p>
            )}
            {entries?.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === e.id
                    ? 'bg-ember-500/15 text-parchment-50'
                    : 'hover:bg-ink-700/40 text-parchment-100'
                }`}
              >
                <span>{KIND_META[e.kind].icon}</span>
                <span className="flex-1 truncate">{e.name}</span>
                <span className="text-xs text-parchment-300/40">{e.authorName}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{KIND_META[selected.kind].icon}</span>
                <input
                  value={selected.name}
                  disabled={!canEdit(selected.ownerId)}
                  onChange={(e) => updateSharedEntity(selected.id, { name: e.target.value })}
                  className="flex-1 border-b border-transparent bg-transparent font-serif text-2xl font-semibold text-parchment-50 outline-none focus:border-ink-700 disabled:opacity-80"
                />
                {canEdit(selected.ownerId) && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      deleteSharedEntity(selected.id)
                      setSelectedId(null)
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <p className="text-xs text-parchment-300/40">Added by {selected.authorName}</p>
              {canEdit(selected.ownerId) ? (
                <NotesEditor
                  value={selected.notes}
                  onChange={(notes) => updateSharedEntity(selected.id, { notes })}
                  entityNames={entries?.map((e) => e.name) ?? []}
                />
              ) : (
                <div className="whitespace-pre-wrap rounded-xl border border-ink-700/60 p-4 text-sm text-parchment-100">
                  {selected.notes || 'No details.'}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon="🎭"
              title="Party notes"
              hint="A shared space the whole table can edit — session recaps, clues, the party's shopping list, inside jokes. Create one on the left."
            />
          )}
        </div>
      </div>
    </div>
  )
}
