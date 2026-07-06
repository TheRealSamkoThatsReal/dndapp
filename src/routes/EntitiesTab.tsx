import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import { createEntity, deleteEntity, updateEntity } from '../db/repo'
import type { EntityKind } from '../db/types'
import { Button, EmptyState, KIND_META } from '../ui/kit'
import type { CampaignContext } from './CampaignLayout'
import { NotesEditor } from '../components/NotesEditor'
import { StatblockEditor } from '../components/StatblockEditor'

const KINDS: EntityKind[] = ['npc', 'location', 'quest', 'item', 'monster']

export default function EntitiesTab() {
  const { campaign } = useOutletContext<CampaignContext>()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<EntityKind | 'all'>('all')

  const entities = useLiveQuery(
    () =>
      db.entities
        .where({ campaignId: campaign.id })
        .filter(isLive)
        .toArray()
        .then((rows) => rows.sort((a, b) => a.name.localeCompare(b.name))),
    [campaign.id],
  )

  const selected = entities?.find((e) => e.id === selectedId) ?? null
  const shown =
    filter === 'all' ? entities : entities?.filter((e) => e.kind === filter)

  async function add(kind: EntityKind) {
    const e = await createEntity(campaign.id, kind, '')
    setSelectedId(e.id)
    setFilter('all')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* ── list pane ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </FilterChip>
          {KINDS.map((k) => (
            <FilterChip
              key={k}
              active={filter === k}
              onClick={() => setFilter(k)}
            >
              {KIND_META[k].icon} {KIND_META[k].plural}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <Button key={k} onClick={() => add(k)} className="text-xs">
              + {KIND_META[k].label}
            </Button>
          ))}
        </div>

        <div className="space-y-1">
          {shown?.map((e) => (
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
            </button>
          ))}
          {shown && shown.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-parchment-300/40">
              Nothing here yet.
            </p>
          )}
        </div>
      </div>

      {/* ── editor pane ── */}
      <div>
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{KIND_META[selected.kind].icon}</span>
              <input
                value={selected.name}
                onChange={(e) =>
                  updateEntity(selected.id, { name: e.target.value })
                }
                className="flex-1 border-b border-transparent bg-transparent font-serif text-2xl font-semibold text-parchment-50 outline-none focus:border-ink-700"
              />
              <Button
                variant="danger"
                onClick={() => {
                  deleteEntity(selected.id)
                  setSelectedId(null)
                }}
              >
                Delete
              </Button>
            </div>

            {(selected.kind === 'monster' || selected.kind === 'npc') && (
              <StatblockEditor entity={selected} />
            )}

            <NotesEditor
              value={selected.notes}
              onChange={(notes) => updateEntity(selected.id, { notes })}
              entityNames={entities?.map((e) => e.name) ?? []}
            />
          </div>
        ) : (
          <EmptyState
            icon="📚"
            title="Your campaign wiki"
            hint="NPCs, locations, quests, items, and monsters — all cross-linked. Pick one, or create your first with the buttons on the left. Use [[double brackets]] in notes to link entities."
          />
        )}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
        active
          ? 'bg-ember-500 text-ink-950'
          : 'border border-ink-700 text-parchment-300/70 hover:text-parchment-100'
      }`}
    >
      {children}
    </button>
  )
}
