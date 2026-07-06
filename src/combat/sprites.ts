import type { Combatant } from '../db/types'

// Pick a token emoji from the creature's type — specific name keywords win
// (a "Goblin" or "Frost Giant" reads exactly), the D&D type line is the
// categorical fallback, then a generic monster.
const NAME_EMOJI: [RegExp, string][] = [
  [/dragon|wyrm|wyvern|drake/, '🐉'],
  [/goblin|hobgoblin|bugbear/, '👺'],
  [/orc|ogre|troll/, '👹'],
  [/kobold|lizard|gecko|salamander/, '🦎'],
  [/skeleton|bone/, '💀'],
  [/zombie|ghoul|ghast|mummy/, '🧟'],
  [/vampire/, '🧛'],
  [/ghost|wraith|shade|shadow|phantom|banshee|specter|spectre/, '👻'],
  [/lich|reaper|death knight/, '☠️'],
  [/demon|devil|imp|fiend|balor|barbed|bearded|erinyes|quasit/, '👿'],
  [/angel|deva|solar|planetar|couatl/, '😇'],
  [/gnoll|wolf|worg|hound|dog|jackal|hyena|mastiff/, '🐺'],
  [/owlbear|bear/, '🐻'],
  [/spider|arachnid|ettercap/, '🕷️'],
  [/scorpion/, '🦂'],
  [/snake|serpent|naga|viper|cobra|python/, '🐍'],
  [/rat|mouse|mole|weasel/, '🐀'],
  [/bat/, '🦇'],
  [/boar|pig|hog|swine/, '🐗'],
  [/horse|steed|mare|stallion|pony|nightmare/, '🐴'],
  [/minotaur|bull|ox|cow|cattle/, '🐂'],
  [/lion|tiger|panther|leopard|jaguar|cougar|puma|cat|lynx/, '🦁'],
  [/ape|gorilla|monkey|baboon/, '🦍'],
  [/crab/, '🦀'],
  [/octopus|kraken|squid/, '🐙'],
  [/shark|fish|piranha|sahuagin/, '🦈'],
  [/frog|toad/, '🐸'],
  [/eagle|hawk|raven|crow|vulture|owl|harpy|roc|bird|cockatrice/, '🦅'],
  [/beetle|insect|mantis|\bant\b|swarm/, '🪲'],
  [/worm|grub|slug/, '🪱'],
  [/bee|wasp/, '🐝'],
  [/giant|titan|goliath|ettin/, '🗿'],
  [/fire|flame|magma|lava/, '🔥'],
  [/ice|frost|snow/, '❄️'],
  [/tree|treant|plant|shrub|vine|fungus|myconid|shambling|awakened/, '🌳'],
  [/slime|ooze|jelly|pudding|cube|slaad/, '🫧'],
  [/beholder|\beye\b|gazer/, '👁️'],
  [/golem|construct|statue|guardian|automaton|animated/, '🗿'],
  [/hag|witch|crone/, '🧙‍♀️'],
  [/merfolk|merrow|siren|triton|mermaid/, '🧜'],
  [/fairy|pixie|sprite|nymph|dryad|fey|satyr/, '🧚'],
  [/unicorn|pegasus/, '🦄'],
  [/dinosaur|raptor|rex|saur|allosaur/, '🦖'],
  [/crocodile|alligator|croc/, '🐊'],
  [/elephant|mammoth|behemoth/, '🐘'],
  [/rhino/, '🦏'],
  [/deer|elk|stag|hart/, '🦌'],
  [/goat|ram/, '🐐'],
  [/turtle|tortoise/, '🐢'],
  [/dragonborn/, '🐲'],
]

const TYPE_EMOJI: [string, string][] = [
  ['dragon', '🐉'], ['undead', '💀'], ['fiend', '👿'], ['celestial', '😇'],
  ['fey', '🧚'], ['aberration', '👁️'], ['construct', '🗿'], ['elemental', '🔥'],
  ['giant', '🗿'], ['ooze', '🫧'], ['plant', '🌳'], ['beast', '🐾'],
  ['monstrosity', '🐲'], ['humanoid', '🧑'],
]

const HEROES = ['🧝', '🧙', '🧚', '🦸', '🥷', '🧑‍🎤', '🧑‍🌾', '🤺']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function spriteFor(c: Pick<Combatant, 'name' | 'isPC' | 'type'>): string {
  if (c.isPC) return HEROES[hash(c.name) % HEROES.length]
  const name = c.name.toLowerCase()
  for (const [re, emoji] of NAME_EMOJI) if (re.test(name)) return emoji
  const type = (c.type ?? '').toLowerCase()
  for (const [key, emoji] of TYPE_EMOJI) if (type.includes(key)) return emoji
  return '👾'
}
