// Parsed Fight Club 5e compendium records. These live in device-local Dexie
// tables OUTSIDE the sync engine — a 54MB reference library shouldn't sync.
// Monsters can be selectively "added to campaign" as real (synced) entities.

export interface CompAction {
  name: string
  text: string
  toHit?: number
  damage?: string
}

export interface CompMonster {
  id?: number
  name: string
  search: string // lowercased name, for filtering
  size: string
  type: string
  alignment: string
  cr: string
  ac: number
  acText: string
  hp: number
  hitDice: string
  speed: string
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
  save: string
  skill: string
  senses: string
  passive: string
  languages: string
  immune: string
  resist: string
  vulnerable: string
  conditionImmune: string
  traits: { name: string; text: string }[]
  actions: CompAction[]
  npc: boolean
}

export interface CompSpell {
  id?: number
  name: string
  search: string
  level: string
  school: string
  time: string
  range: string
  components: string
  duration: string
  classes: string
  text: string
}

export interface CompItem {
  id?: number
  name: string
  search: string
  type: string
  detail: string
  magic: boolean
  weight: string
  text: string
}

export const SCHOOLS: Record<string, string> = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', EN: 'Enchantment',
  EV: 'Evocation', I: 'Illusion', N: 'Necromancy', T: 'Transmutation',
}

export const ITEM_TYPES: Record<string, string> = {
  LA: 'Light Armor', MA: 'Medium Armor', HA: 'Heavy Armor', S: 'Shield',
  M: 'Melee Weapon', R: 'Ranged Weapon', A: 'Ammunition', RD: 'Rod',
  ST: 'Staff', WD: 'Wand', RG: 'Ring', P: 'Potion', SC: 'Scroll',
  W: 'Wondrous Item', G: 'Gear', $: 'Treasure',
}
