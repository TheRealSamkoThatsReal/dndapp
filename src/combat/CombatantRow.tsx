import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Combatant } from '../db/types'
import { useDice } from '../dice/DiceContext'

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated',
  'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained',
  'Stunned', 'Unconscious', 'Concentration',
]

export function CombatantRow({
  combatant: c,
  isCurrent,
  onChange,
  onRemove,
}: {
  combatant: Combatant
  isCurrent: boolean
  onChange: (patch: Partial<Combatant>) => void
  onRemove: () => void
}) {
  const { roll } = useDice()
  const [delta, setDelta] = useState('')
  const [addingCond, setAddingCond] = useState(false)

  // Pull the source statblock (if any) so we can offer attack roll buttons.
  const source = useLiveQuery(
    () => (c.sourceId ? db.entities.get(c.sourceId) : undefined),
    [c.sourceId],
  )
  const actions = source?.statblock?.actions ?? []

  const applyDelta = (sign: 1 | -1) => {
    const amt = Math.abs(parseInt(delta, 10) || 0)
    if (!amt) return
    if (sign === -1) {
      // damage soaks temp HP first
      let dmg = amt
      let temp = c.tempHp
      if (temp > 0) {
        const absorbed = Math.min(temp, dmg)
        temp -= absorbed
        dmg -= absorbed
      }
      onChange({ tempHp: temp, currentHp: Math.max(0, c.currentHp - dmg) })
    } else {
      onChange({ currentHp: Math.min(c.maxHp, c.currentHp + amt) })
    }
    setDelta('')
  }

  const addCondition = (name: string, rounds: number | null) => {
    if (c.conditions.some((x) => x.name === name)) return
    onChange({ conditions: [...c.conditions, { name, rounds }] })
    setAddingCond(false)
  }

  const hpPct = Math.max(0, Math.min(100, (c.currentHp / Math.max(1, c.maxHp)) * 100))
  const down = c.currentHp <= 0

  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        isCurrent
          ? 'border-ember-500 bg-ember-500/10'
          : 'border-ink-700/60 bg-ink-800/40'
      } ${down ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* initiative */}
        <input
          type="number"
          value={c.initiative}
          onChange={(e) => onChange({ initiative: Number(e.target.value) })}
          title="Initiative"
          className="w-11 rounded border border-ink-700 bg-ink-950/50 px-1 py-1 text-center font-serif text-parchment-50 outline-none"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`truncate font-medium ${
                c.isPC ? 'text-arcane-500' : 'text-parchment-50'
              }`}
            >
              {c.name}
            </span>
            {down && (
              <span className="rounded bg-blood-500/20 px-1.5 text-xs text-blood-500">
                down
              </span>
            )}
            <span className="ml-auto text-xs text-parchment-300/50">
              AC {c.ac}
            </span>
          </div>

          {/* hp bar */}
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-950/60">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${hpPct}%`,
                background:
                  hpPct > 50 ? '#6b8a4f' : hpPct > 25 ? '#d6872b' : '#b23a3a',
              }}
            />
          </div>
          <div className="mt-0.5 text-xs text-parchment-300/60">
            {c.currentHp}/{c.maxHp}
            {c.tempHp > 0 && (
              <span className="text-arcane-500"> (+{c.tempHp} temp)</span>
            )}
          </div>
        </div>

        {/* damage / heal */}
        <div className="flex items-center gap-1">
          <input
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyDelta(-1)}
            placeholder="0"
            inputMode="numeric"
            className="w-12 rounded border border-ink-700 bg-ink-950/50 px-1 py-1 text-center text-parchment-50 outline-none"
          />
          <button
            onClick={() => applyDelta(-1)}
            title="Damage"
            className="rounded bg-blood-600/30 px-2 py-1 text-sm text-blood-500 hover:bg-blood-600/50"
          >
            −
          </button>
          <button
            onClick={() => applyDelta(1)}
            title="Heal"
            className="rounded bg-moss-500/20 px-2 py-1 text-sm text-moss-500 hover:bg-moss-500/40"
          >
            +
          </button>
          <button
            onClick={onRemove}
            title="Remove"
            className="ml-1 text-parchment-300/40 hover:text-blood-500"
          >
            ✕
          </button>
        </div>
      </div>

      {/* conditions */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {c.conditions.map((cond) => (
          <button
            key={cond.name}
            onClick={() =>
              onChange({
                conditions: c.conditions.filter((x) => x.name !== cond.name),
              })
            }
            className="group rounded-full bg-arcane-500/20 px-2 py-0.5 text-xs text-arcane-500 hover:bg-blood-500/20 hover:text-blood-500"
            title="Click to remove"
          >
            {cond.name}
            {cond.rounds !== null && ` (${cond.rounds})`}
          </button>
        ))}

        {addingCond ? (
          <select
            autoFocus
            onChange={(e) => e.target.value && addCondition(e.target.value, null)}
            onBlur={() => setAddingCond(false)}
            defaultValue=""
            className="rounded border border-ink-700 bg-ink-950 px-1 py-0.5 text-xs text-parchment-100"
          >
            <option value="" disabled>
              condition…
            </option>
            {CONDITIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setAddingCond(true)}
            className="rounded-full border border-ink-700 px-2 py-0.5 text-xs text-parchment-300/50 hover:text-parchment-100"
          >
            + condition
          </button>
        )}

        {/* quick attack rolls from the source statblock */}
        {actions.map((a, i) => (
          <span key={i} className="ml-1 flex items-center gap-1">
            <button
              onClick={() =>
                roll(
                  `1d20${(a.toHit ?? 0) >= 0 ? '+' : ''}${a.toHit ?? 0}`,
                  'normal',
                  `${c.name} · ${a.name} to hit`,
                )
              }
              className="rounded bg-ink-700/50 px-2 py-0.5 text-xs text-ember-400 hover:bg-ink-700"
            >
              {a.name} 🎲
            </button>
            {a.damage && (
              <button
                onClick={() =>
                  roll(a.damage!, 'normal', `${c.name} · ${a.name} damage`)
                }
                className="rounded bg-ink-700/50 px-1.5 py-0.5 text-xs text-blood-500 hover:bg-ink-700"
              >
                dmg
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
