import { useState } from 'react'
import { updateEncounter } from '../db/repo'
import type { Combatant, Encounter } from '../db/types'
import { Button } from '../ui/kit'
import { advanceTurn, makeAdHoc, resortByInitiative, type Active } from './engine'
import { CombatantRow } from './CombatantRow'
import { BattleMap } from './BattleMap'

export function CombatTracker({ encounter }: { encounter: Encounter }) {
  const active = encounter.active!
  const [adHoc, setAdHoc] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [form, setForm] = useState({ name: '', hp: '10', ac: '12', init: '10' })

  const save = (next: Active) => updateEncounter(encounter.id, { active: next })

  const patchCombatant = (id: string, patch: Partial<Combatant>) =>
    save({
      ...active,
      combatants: active.combatants.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    })

  const removeCombatant = (id: string) => {
    const idx = active.combatants.findIndex((c) => c.id === id)
    const combatants = active.combatants.filter((c) => c.id !== id)
    const turnIndex =
      idx < active.turnIndex
        ? active.turnIndex - 1
        : Math.min(active.turnIndex, Math.max(0, combatants.length - 1))
    save({ ...active, combatants, turnIndex })
  }

  const addAdHoc = () => {
    const c = makeAdHoc(
      form.name,
      parseInt(form.hp, 10) || 1,
      parseInt(form.ac, 10) || 10,
      parseInt(form.init, 10) || 0,
    )
    save(resortByInitiative({ ...active, combatants: [...active.combatants, c] }))
    setForm({ name: '', hp: '10', ac: '12', init: '10' })
    setAdHoc(false)
  }

  const current = active.combatants[active.turnIndex]

  return (
    <div className="space-y-4">
      {/* header: round + turn controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-800/60 p-4">
        <div>
          <div className="font-serif text-2xl font-semibold text-parchment-50">
            Round {active.round}
          </div>
          <div className="text-xs text-parchment-300/60">
            {current ? `${current.name}'s turn` : '—'}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setShowMap((m) => !m)}>
            {showMap ? '🗺️ Hide map' : '🗺️ Map'}
          </Button>
          <Button onClick={() => save(advanceTurn(active, -1))}>← Prev</Button>
          <Button variant="primary" onClick={() => save(advanceTurn(active, 1))}>
            Next turn →
          </Button>
        </div>
      </div>

      {showMap && <BattleMap encounter={encounter} role="dm" />}

      {/* combatant list, in initiative order */}
      <div className="space-y-2">
        {active.combatants.map((c, i) => (
          <CombatantRow
            key={c.id}
            combatant={c}
            isCurrent={i === active.turnIndex}
            onChange={(patch) => patchCombatant(c.id, patch)}
            onRemove={() => removeCombatant(c.id)}
          />
        ))}
      </div>

      {/* add ad-hoc combatant */}
      {adHoc ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-ink-700/60 p-3">
          <Labeled label="Name">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-36 rounded border border-ink-700 bg-ink-950/50 px-2 py-1 text-parchment-50 outline-none"
            />
          </Labeled>
          {(['init', 'hp', 'ac'] as const).map((k) => (
            <Labeled key={k} label={k === 'init' ? 'Init' : k.toUpperCase()}>
              <input
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                inputMode="numeric"
                className="w-16 rounded border border-ink-700 bg-ink-950/50 px-2 py-1 text-center text-parchment-50 outline-none"
              />
            </Labeled>
          ))}
          <Button variant="primary" onClick={addAdHoc}>
            Add
          </Button>
          <Button onClick={() => setAdHoc(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button onClick={() => setAdHoc(true)}>+ Add combatant</Button>
          <Button onClick={() => save(resortByInitiative(active))}>
            Re-sort by initiative
          </Button>
          <Button
            variant="danger"
            className="ml-auto"
            onClick={() => {
              if (confirm('End this combat? Initiative and HP will be cleared.'))
                updateEncounter(encounter.id, { active: null })
            }}
          >
            End combat
          </Button>
        </div>
      )}
    </div>
  )
}

function Labeled({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-parchment-300/50">
        {label}
      </span>
      {children}
    </label>
  )
}
