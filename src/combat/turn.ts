import type { Combatant, Encounter } from '../db/types'

// Pure combat-state transitions — no persistence, no db. Kept separate from
// engine.ts (which touches IndexedDB) so this logic stays unit-testable.

export type Active = NonNullable<Encounter['active']>

export function makeAdHoc(
  name: string,
  hp: number,
  ac: number,
  init: number,
): Combatant {
  return {
    id: crypto.randomUUID(),
    name: name || 'Combatant',
    sourceId: null,
    initiative: init,
    ac,
    maxHp: hp,
    currentHp: hp,
    tempHp: 0,
    conditions: [],
    isPC: false,
  }
}

/** Decrement timed conditions by one round; drop the expired ones. */
export function tickConditions(combatants: Combatant[]): Combatant[] {
  return combatants.map((c) => ({
    ...c,
    conditions: c.conditions
      .map((cond) =>
        cond.rounds === null ? cond : { ...cond, rounds: cond.rounds - 1 },
      )
      .filter((cond) => cond.rounds === null || cond.rounds > 0),
  }))
}

/** Move to the next/previous turn, advancing the round + ticking on wrap. */
export function advanceTurn(active: Active, dir: 1 | -1): Active {
  const n = active.combatants.length
  if (n === 0) return active

  let idx = active.turnIndex + dir
  let round = active.round
  let combatants = active.combatants

  if (idx >= n) {
    idx = 0
    round += 1
    combatants = tickConditions(combatants)
  } else if (idx < 0) {
    idx = n - 1
    round = Math.max(1, round - 1)
  }
  return { round, turnIndex: idx, combatants }
}

/** Re-sort by initiative, keeping the same creature "current". */
export function resortByInitiative(active: Active): Active {
  const currentId = active.combatants[active.turnIndex]?.id
  const combatants = [...active.combatants].sort(
    (a, b) => b.initiative - a.initiative,
  )
  const turnIndex = Math.max(
    0,
    combatants.findIndex((c) => c.id === currentId),
  )
  return { ...active, combatants, turnIndex }
}
