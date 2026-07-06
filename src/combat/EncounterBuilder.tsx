import { useLiveQuery } from 'dexie-react-hooks'
import { db, isLive } from '../db/db'
import { updateEncounter } from '../db/repo'
import type { Encounter } from '../db/types'
import { Button, Card, KIND_META } from '../ui/kit'
import { hydrateCombatants } from './engine'

export function EncounterBuilder({ encounter }: { encounter: Encounter }) {
  const entities = useLiveQuery(
    () =>
      db.entities
        .where({ campaignId: encounter.campaignId })
        .filter((e) => isLive(e) && (e.kind === 'monster' || e.kind === 'npc'))
        .toArray()
        .then((r) => r.sort((a, b) => a.name.localeCompare(b.name))),
    [encounter.campaignId],
  )
  const characters = useLiveQuery(
    () =>
      db.characters
        .where({ campaignId: encounter.campaignId })
        .filter(isLive)
        .toArray(),
    [encounter.campaignId],
  )

  const refs = encounter.memberRefs
  const countOf = (id: string) => refs.filter((r) => r === id).length

  const add = (id: string) =>
    updateEncounter(encounter.id, { memberRefs: [...refs, id] })
  const remove = (id: string) => {
    const i = refs.indexOf(id)
    if (i === -1) return
    updateEncounter(encounter.id, {
      memberRefs: refs.filter((_, idx) => idx !== i),
    })
  }

  async function start() {
    const combatants = await hydrateCombatants(refs)
    await updateEncounter(encounter.id, {
      active: { round: 1, turnIndex: 0, combatants },
    })
  }

  const total = refs.length

  return (
    <div className="space-y-5">
      <input
        value={encounter.name}
        onChange={(e) => updateEncounter(encounter.id, { name: e.target.value })}
        className="w-full border-b border-transparent bg-transparent font-serif text-2xl font-semibold text-parchment-50 outline-none focus:border-ink-700"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Picker
          title="Monsters & NPCs"
          empty="No monsters or NPCs with statblocks yet — add them in the Wiki tab."
          rows={entities?.map((e) => ({
            id: e.id,
            label: `${KIND_META[e.kind].icon} ${e.name}`,
            meta: e.statblock
              ? `AC ${e.statblock.ac} · ${e.statblock.hp} HP`
              : 'no statblock',
          }))}
          countOf={countOf}
          onAdd={add}
          onRemove={remove}
        />
        <Picker
          title="Player Characters"
          empty="No characters yet — add them in the Characters tab."
          rows={characters?.map((c) => ({
            id: c.id,
            label: `🛡️ ${c.name}`,
            meta: `AC ${c.ac} · ${c.currentHp}/${c.maxHp} HP`,
          }))}
          countOf={countOf}
          onAdd={add}
          onRemove={remove}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-ink-700/60 bg-ink-800/60 p-4">
        <span className="text-sm text-parchment-300/70">
          {total} combatant{total === 1 ? '' : 's'} ready
        </span>
        <Button variant="primary" disabled={total === 0} onClick={start}>
          🎲 Roll initiative & start
        </Button>
      </div>
    </div>
  )
}

interface Row {
  id: string
  label: string
  meta: string
}

function Picker({
  title,
  empty,
  rows,
  countOf,
  onAdd,
  onRemove,
}: {
  title: string
  empty: string
  rows: Row[] | undefined
  countOf: (id: string) => number
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-serif text-parchment-50">{title}</h3>
      {rows && rows.length === 0 && (
        <p className="text-sm text-parchment-300/40">{empty}</p>
      )}
      <div className="space-y-1">
        {rows?.map((r) => {
          const count = countOf(r.id)
          return (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-700/30"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-parchment-100">
                  {r.label}
                </div>
                <div className="text-xs text-parchment-300/40">{r.meta}</div>
              </div>
              {count > 0 && (
                <>
                  <button
                    onClick={() => onRemove(r.id)}
                    className="grid h-6 w-6 place-items-center rounded border border-ink-700 text-parchment-100 hover:bg-ink-700"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm text-ember-400">
                    {count}
                  </span>
                </>
              )}
              <button
                onClick={() => onAdd(r.id)}
                className="grid h-6 w-6 place-items-center rounded border border-ink-700 text-parchment-100 hover:bg-ink-700"
              >
                +
              </button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
