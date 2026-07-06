import type { CompAction, CompItem, CompMonster, CompSpell } from './types'

// ── low-level helpers ───────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'",
}
function decode(s: string): string {
  return s
    .replace(/&(?:lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&') // last, so we never double-decode
}

/** First <tag>…</tag> inner text, decoded and trimmed ('' if absent). */
function tag(xml: string, name: string): string {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml)
  return m ? decode(m[1]).trim() : ''
}

/** Every <tag>…</tag> inner block (raw, undecoded — for nested parsing). */
function tagAll(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g')
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) out.push(m[1])
  return out
}

const leadingInt = (s: string): number => {
  const m = /-?\d+/.exec(s)
  return m ? parseInt(m[0], 10) : 0
}
const paren = (s: string): string => {
  const m = /\(([^)]*)\)/.exec(s)
  return m ? m[1].trim() : ''
}
const int = (s: string): number => parseInt(s, 10) || 0

/**
 * Scan a flat compendium document for top-level elements of the given tags.
 * Relies on the format's invariant: these elements never nest within their
 * own type, and any real '<' in text is entity-escaped. Yields lazily so a
 * 54MB string is walked without building one giant array.
 */
export function* scanTopLevel(
  xml: string,
  tags: string[],
): Generator<{ tag: string; xml: string }> {
  // One global regex advances through the document linearly; then jump to the
  // matching close. (An indexOf-per-tag loop is O(n²): once a tag type is
  // exhausted, every remaining step rescans the whole file for it.)
  const openRe = new RegExp(`<(${tags.join('|')})>`, 'g')
  let m: RegExpExecArray | null
  while ((m = openRe.exec(xml))) {
    const t = m[1]
    const close = `</${t}>`
    const end = xml.indexOf(close, openRe.lastIndex)
    if (end === -1) break
    yield { tag: t, xml: xml.slice(m.index, end + close.length) }
    openRe.lastIndex = end + close.length
  }
}

// ── element → record ────────────────────────────────────────────

function parseActions(monsterXml: string): CompAction[] {
  return tagAll(monsterXml, 'action').map((block) => {
    const action: CompAction = {
      name: tag(block, 'name'),
      text: tag(block, 'text'),
    }
    const attack = tagAll(block, 'attack')[0]
    if (attack) {
      // "Name|+hit|damage" — hit/damage may be empty for non-attacks
      const [, hit, dmg] = decode(attack).split('|')
      if (hit && /-?\d/.test(hit)) action.toHit = leadingInt(hit)
      if (dmg && /d\d/.test(dmg)) action.damage = dmg.trim()
    }
    return action
  })
}

export function parseMonster(xml: string): CompMonster {
  const name = tag(xml, 'name')
  const hp = tag(xml, 'hp')
  const ac = tag(xml, 'ac')
  return {
    name,
    search: name.toLowerCase(),
    size: tag(xml, 'size'),
    type: tag(xml, 'type'),
    alignment: tag(xml, 'alignment'),
    cr: tag(xml, 'cr'),
    ac: leadingInt(ac),
    acText: ac,
    hp: leadingInt(hp),
    hitDice: paren(hp),
    speed: tag(xml, 'speed'),
    str: int(tag(xml, 'str')), dex: int(tag(xml, 'dex')), con: int(tag(xml, 'con')),
    int: int(tag(xml, 'int')), wis: int(tag(xml, 'wis')), cha: int(tag(xml, 'cha')),
    save: tag(xml, 'save'),
    skill: tag(xml, 'skill'),
    senses: tag(xml, 'senses'),
    passive: tag(xml, 'passive'),
    languages: tag(xml, 'languages'),
    immune: tag(xml, 'immune'),
    resist: tag(xml, 'resist'),
    vulnerable: tag(xml, 'vulnerable'),
    conditionImmune: tag(xml, 'conditionImmune'),
    traits: tagAll(xml, 'trait').map((t) => ({
      name: tag(t, 'name'),
      text: tag(t, 'text'),
    })),
    actions: parseActions(xml),
    npc: /yes/i.test(tag(xml, 'npc')),
  }
}

export function parseSpell(xml: string): CompSpell {
  const name = tag(xml, 'name')
  return {
    name,
    search: name.toLowerCase(),
    level: tag(xml, 'level'),
    school: tag(xml, 'school'),
    time: tag(xml, 'time'),
    range: tag(xml, 'range'),
    components: tag(xml, 'components'),
    duration: tag(xml, 'duration'),
    classes: tag(xml, 'classes'),
    text: tag(xml, 'text'),
  }
}

export function parseItem(xml: string): CompItem {
  const name = tag(xml, 'name')
  return {
    name,
    search: name.toLowerCase(),
    type: tag(xml, 'type'),
    detail: tag(xml, 'detail'),
    magic: /yes/i.test(tag(xml, 'magic')),
    weight: tag(xml, 'weight'),
    text: tag(xml, 'text'),
  }
}
