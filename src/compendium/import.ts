import { db } from '../db/db'
import { parseItem, parseMonster, parseSpell, scanTopLevel } from './parse'
import type { CompItem, CompMonster, CompSpell } from './types'

export interface ImportProgress {
  monsters: number
  spells: number
  items: number
  done: boolean
}

/**
 * Import a Fight Club 5e XML compendium into the local reference tables.
 * Parses and inserts in batches, yielding to the event loop between them so
 * the UI stays responsive on a 50MB+ file.
 */
export async function importCompendium(
  file: File,
  onProgress: (p: ImportProgress) => void,
): Promise<ImportProgress> {
  const text = await file.text()

  // A re-import replaces the library.
  await Promise.all([
    db.compMonsters.clear(),
    db.compSpells.clear(),
    db.compItems.clear(),
  ])

  let monsters = 0
  let spells = 0
  let items = 0
  let mBatch: CompMonster[] = []
  let sBatch: CompSpell[] = []
  let iBatch: CompItem[] = []

  const flush = async () => {
    if (mBatch.length) { await db.compMonsters.bulkAdd(mBatch); mBatch = [] }
    if (sBatch.length) { await db.compSpells.bulkAdd(sBatch); sBatch = [] }
    if (iBatch.length) { await db.compItems.bulkAdd(iBatch); iBatch = [] }
  }

  let n = 0
  for (const { tag, xml } of scanTopLevel(text, ['monster', 'spell', 'item'])) {
    if (tag === 'monster') { mBatch.push(parseMonster(xml)); monsters++ }
    else if (tag === 'spell') { sBatch.push(parseSpell(xml)); spells++ }
    else { iBatch.push(parseItem(xml)); items++ }

    if (++n % 800 === 0) {
      await flush()
      onProgress({ monsters, spells, items, done: false })
      await new Promise((r) => setTimeout(r)) // let the UI paint
    }
  }
  await flush()
  const final = { monsters, spells, items, done: true }
  onProgress(final)
  return final
}

/** Build the campaign-entity fields for a compendium monster. */
export function monsterToEntityFields(m: CompMonster) {
  const meta: string[] = []
  const line = (k: string, v: string) => v && meta.push(`**${k}** ${v}`)
  line('Type', [m.size, m.type, m.alignment].filter(Boolean).join(' · '))
  line('Saves', m.save)
  line('Skills', m.skill)
  line('Senses', [m.senses, m.passive && `passive Perception ${m.passive}`].filter(Boolean).join(', '))
  line('Languages', m.languages)
  line('Damage Immunities', m.immune)
  line('Damage Resistances', m.resist)
  line('Damage Vulnerabilities', m.vulnerable)
  line('Condition Immunities', m.conditionImmune)

  const traits = m.traits
    .filter((t) => t.name || t.text)
    .map((t) => `**${t.name}.** ${t.text}`)
    .join('\n\n')

  const notes = [
    meta.join('  \n'),
    m.acText && m.acText !== String(m.ac) ? `_AC: ${m.acText}_` : '',
    traits && `### Traits\n\n${traits}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    kind: (m.npc ? 'npc' : 'monster') as 'npc' | 'monster',
    name: m.name,
    notes,
    statblock: {
      ac: m.ac,
      hp: m.hp,
      hitDice: m.hitDice,
      speed: m.speed,
      cr: m.cr,
      abilities: {
        str: m.str, dex: m.dex, con: m.con,
        int: m.int, wis: m.wis, cha: m.cha,
      },
      actions: m.actions.map((a) => ({
        name: a.name,
        desc: a.text,
        toHit: a.toHit,
        damage: a.damage,
      })),
    },
  }
}
