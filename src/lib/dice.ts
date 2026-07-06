// Dice engine — parses expressions like "2d6+3", "1d20-1", "4d6", "d20+1d4"
// and rolls them, with advantage/disadvantage applied to the first die.

export type RollMode = 'normal' | 'adv' | 'dis'

export interface DieRoll {
  sides: number
  value: number
  /** true when kept-but-discarded by advantage/disadvantage */
  dropped?: boolean
}

export interface RollResult {
  id: string
  expression: string
  mode: RollMode
  dice: DieRoll[]
  modifier: number
  total: number
  /** optional human context, e.g. "Goblin · Scimitar to hit" */
  label?: string
  /** natural 20 / natural 1 on a lone d20 — for flair */
  crit: 'hit' | 'miss' | null
  at: number
}

const rollDie = (sides: number) => Math.floor(Math.random() * sides) + 1

export function rollExpression(
  expr: string,
  mode: RollMode = 'normal',
  label?: string,
): RollResult {
  const clean = (expr || '1d20').replace(/\s+/g, '').toLowerCase()
  const termRe = /([+-]?)(\d*d\d+|\d+)/g

  const dice: DieRoll[] = []
  let modifier = 0
  let total = 0
  let firstDie = true

  let m: RegExpExecArray | null
  while ((m = termRe.exec(clean))) {
    const sign = m[1] === '-' ? -1 : 1
    const body = m[2]

    if (body.includes('d')) {
      const [countStr, sidesStr] = body.split('d')
      const count = countStr === '' ? 1 : parseInt(countStr, 10)
      const sides = parseInt(sidesStr, 10)
      if (!sides || count < 1) continue

      for (let i = 0; i < count; i++) {
        if (mode !== 'normal' && firstDie) {
          const a = rollDie(sides)
          const b = rollDie(sides)
          const keep = mode === 'adv' ? Math.max(a, b) : Math.min(a, b)
          const drop = mode === 'adv' ? Math.min(a, b) : Math.max(a, b)
          dice.push({ sides, value: keep })
          dice.push({ sides, value: drop, dropped: true })
          total += sign * keep
          firstDie = false
        } else {
          const v = rollDie(sides)
          dice.push({ sides, value: v })
          total += sign * v
          firstDie = false
        }
      }
    } else {
      const c = parseInt(body, 10)
      modifier += sign * c
      total += sign * c
    }
  }

  // Crit flair only for a single kept d20.
  const kept = dice.filter((d) => !d.dropped)
  let crit: RollResult['crit'] = null
  if (kept.length === 1 && kept[0].sides === 20) {
    if (kept[0].value === 20) crit = 'hit'
    else if (kept[0].value === 1) crit = 'miss'
  }

  return {
    id: crypto.randomUUID(),
    expression: clean,
    mode,
    dice,
    modifier,
    total,
    label,
    crit,
    at: Date.now(),
  }
}

/** Compact human-readable breakdown, e.g. "d20 [15] + 3 = 18". */
export function describeRoll(r: RollResult): string {
  const parts = r.dice
    .filter((d) => !d.dropped)
    .map((d) => `d${d.sides}[${d.value}]`)
  if (r.modifier) parts.push(`${r.modifier >= 0 ? '+' : ''}${r.modifier}`)
  return `${parts.join(' ')} = ${r.total}`
}
