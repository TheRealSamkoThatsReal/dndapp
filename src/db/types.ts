// ── Core data model ─────────────────────────────────────────────
// Every record is a syncable object. `updatedAt` drives last-write-wins
// merge with Supabase; `_dirty` marks local changes awaiting push;
// `_deleted` is a tombstone so deletions propagate across devices.

export interface SyncMeta {
  id: string
  ownerId: string | null // Supabase user id once signed in; null while local-only
  updatedAt: number // epoch ms
  _dirty: 0 | 1 // 1 = has local changes not yet pushed
  _deleted: 0 | 1 // soft-delete tombstone
}

export interface Campaign extends SyncMeta {
  name: string
  blurb: string
  /** hue used to tint the campaign's cover card */
  accent: string
  /** short code players enter to join; '' until the DM generates one */
  inviteCode: string
  createdAt: number
}

/** Collaborative party-wiki entry: any campaign member can add, all can read.
 *  Lives in its own table so it can never expose the DM's private wiki. */
export interface SharedEntity extends SyncMeta {
  campaignId: string
  kind: EntityKind
  name: string
  notes: string
  /** display name of whoever created it */
  authorName: string
  /** when set, this row is a battlemap token position (not a wiki entry) —
   *  players write their own PC's position here since they can't write the
   *  DM-owned encounter. Everyone in the campaign can read it. */
  token?: {
    encounterId: string
    combatantId: string
    sourceId: string | null
    x: number
    y: number
  }
}

export interface Session extends SyncMeta {
  campaignId: string
  number: number
  title: string
  /** ISO date the session was/will be played */
  date: string | null
  prep: string // markdown checklist + notes for before play
  log: string // markdown notes captured during play
  recap: string // markdown summary after play
}

export type EntityKind = 'npc' | 'location' | 'quest' | 'item' | 'monster'

export interface Ability {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

/** A rollable statblock — shared by monsters and stat-bearing NPCs. */
export interface Statblock {
  ac: number
  hp: number
  hitDice: string // e.g. "2d8+2"
  speed: string
  cr: string // challenge rating, e.g. "1/4"
  /** D&D creature type line, e.g. "dragon" or "humanoid (elf)" — drives the
   *  battle-view sprite. Optional; older statblocks predate it. */
  type?: string
  abilities: Ability
  actions: StatblockAction[]
}

export interface StatblockAction {
  name: string
  /** free text; `toHit`/`damage` power the roll buttons when present */
  desc: string
  toHit?: number
  damage?: string // e.g. "1d6+2"
}

export interface Entity extends SyncMeta {
  campaignId: string
  kind: EntityKind
  name: string
  /** markdown notes; supports [[wikilinks]] to other entities by name */
  notes: string
  /** quest state, item rarity, npc disposition, etc. — kind-specific bag */
  meta: Record<string, string>
  /** present for monsters and combat-ready NPCs */
  statblock?: Statblock
}

// ── Player characters ───────────────────────────────────────────
export interface Character extends SyncMeta {
  campaignId: string | null
  name: string
  playerName: string
  ancestry: string
  className: string
  level: number
  abilities: Ability
  maxHp: number
  currentHp: number
  tempHp: number
  ac: number
  speed: number
  proficiencyBonus: number
  /** skill/save proficiencies keyed by name */
  proficiencies: string[]
  spellSlots: Record<number, { max: number; used: number }>
  inventory: { name: string; qty: number; notes: string }[]
  notes: string
}

// ── Combat ──────────────────────────────────────────────────────
export interface Condition {
  name: string
  /** rounds remaining; null = indefinite */
  rounds: number | null
}

export interface GridPos {
  x: number
  y: number
}

export interface Combatant {
  id: string
  name: string
  /** link back to the source entity/character, if any */
  sourceId: string | null
  initiative: number
  ac: number
  maxHp: number
  currentHp: number
  tempHp: number
  conditions: Condition[]
  isPC: boolean
  /** D&D creature type line, carried through for the battle-view sprite */
  type?: string
  /** walking speed in feet, for battlemap movement range (default 30) */
  speed?: number
  /** battlemap position (DM-authoritative; PCs override via a token row) */
  pos?: GridPos
}

export interface Encounter extends SyncMeta {
  campaignId: string
  name: string
  /** entity/character ids to hydrate into combatants when run */
  memberRefs: string[]
  /** live combat state, persisted so a fight survives a refresh */
  active: {
    round: number
    turnIndex: number
    combatants: Combatant[]
    /** battlemap grid size (defaults applied when absent) */
    grid?: { cols: number; rows: number }
    /** filled wall cells, as "x,y" strings */
    walls?: string[]
  } | null
}

export const ABILITY_KEYS: (keyof Ability)[] = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
]

export const abilityMod = (score: number) => Math.floor((score - 10) / 2)

export const formatMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`)
