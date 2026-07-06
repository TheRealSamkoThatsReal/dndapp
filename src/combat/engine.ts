import { db } from '../db/db'
import { abilityMod, type Combatant } from '../db/types'
import { rollExpression } from '../lib/dice'

// Pure turn/state helpers live in ./turn; re-exported so existing imports work.
export {
  advanceTurn,
  makeAdHoc,
  resortByInitiative,
  tickConditions,
  type Active,
} from './turn'

interface Template {
  name: string
  sourceId: string
  isPC: boolean
  ac: number
  maxHp: number
  currentHp: number
  initMod: number
  type?: string
}

const fmt = (m: number) => `${m >= 0 ? '+' : ''}${m}`

/** Resolve a member ref (entity or character id) to a combatant template. */
async function resolveRef(id: string): Promise<Template | null> {
  const entity = await db.entities.get(id)
  if (entity && !entity._deleted) {
    const sb = entity.statblock
    return {
      name: entity.name,
      sourceId: id,
      isPC: false,
      ac: sb?.ac ?? 10,
      maxHp: sb?.hp ?? 1,
      currentHp: sb?.hp ?? 1,
      initMod: sb ? abilityMod(sb.abilities.dex) : 0,
      type: sb?.type,
    }
  }
  const pc = await db.characters.get(id)
  if (pc && !pc._deleted) {
    return {
      name: pc.name,
      sourceId: id,
      isPC: true,
      ac: pc.ac,
      maxHp: pc.maxHp,
      currentHp: pc.currentHp,
      initMod: abilityMod(pc.abilities.dex),
      type: 'humanoid',
    }
  }
  return null
}

/** Build combatants from refs: number duplicates, roll initiative, sort. */
export async function hydrateCombatants(refs: string[]): Promise<Combatant[]> {
  const templates = (await Promise.all(refs.map(resolveRef))).filter(
    (t): t is Template => t !== null,
  )

  // "Goblin 1", "Goblin 2"… only when a name appears more than once.
  const totals = new Map<string, number>()
  templates.forEach((t) => totals.set(t.name, (totals.get(t.name) ?? 0) + 1))
  const seen = new Map<string, number>()

  return templates
    .map((t) => {
      let name = t.name
      if ((totals.get(t.name) ?? 0) > 1) {
        const n = (seen.get(t.name) ?? 0) + 1
        seen.set(t.name, n)
        name = `${t.name} ${n}`
      }
      return {
        id: crypto.randomUUID(),
        name,
        sourceId: t.sourceId,
        initiative: rollExpression(`1d20${fmt(t.initMod)}`).total,
        ac: t.ac,
        maxHp: t.maxHp,
        currentHp: t.currentHp,
        tempHp: 0,
        conditions: [],
        isPC: t.isPC,
        type: t.type,
      } satisfies Combatant
    })
    .sort((a, b) => b.initiative - a.initiative)
}
