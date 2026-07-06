import { db, newMeta, softDelete, uid } from './db'
import type {
  Campaign,
  Character,
  Encounter,
  Entity,
  EntityKind,
  Session,
} from './types'

// ── Campaigns ───────────────────────────────────────────────────
export async function createCampaign(name: string, accent = '#d6872b') {
  const now = Date.now()
  const campaign: Campaign = {
    ...newMeta(),
    name: name.trim() || 'Untitled Campaign',
    blurb: '',
    accent,
    createdAt: now,
  }
  await db.campaigns.add(campaign)
  return campaign
}

export async function updateCampaign(id: string, patch: Partial<Campaign>) {
  await db.campaigns.update(id, { ...patch, _dirty: 1, updatedAt: Date.now() })
}

export async function deleteCampaign(id: string) {
  // cascade soft-delete children so nothing orphaned syncs back
  const tomb = { _deleted: 1 as const, _dirty: 1 as const, updatedAt: Date.now() }
  await Promise.all([
    softDelete(db.campaigns, id),
    db.sessions.where({ campaignId: id }).modify(tomb),
    db.entities.where({ campaignId: id }).modify(tomb),
    db.encounters.where({ campaignId: id }).modify(tomb),
  ])
}

// ── Entities (wiki: npc / location / quest / item / monster) ─────
export async function createEntity(
  campaignId: string,
  kind: EntityKind,
  name: string,
) {
  const entity: Entity = {
    ...newMeta(),
    campaignId,
    kind,
    name: name.trim() || `New ${kind}`,
    notes: '',
    meta: {},
  }
  await db.entities.add(entity)
  return entity
}

export async function updateEntity(id: string, patch: Partial<Entity>) {
  await db.entities.update(id, { ...patch, _dirty: 1, updatedAt: Date.now() })
}

export const deleteEntity = (id: string) => softDelete(db.entities, id)

// ── Sessions ────────────────────────────────────────────────────
export async function createSession(campaignId: string) {
  const count = await db.sessions
    .where({ campaignId })
    .filter((s) => s._deleted === 0)
    .count()
  const session: Session = {
    ...newMeta(),
    campaignId,
    number: count + 1,
    title: `Session ${count + 1}`,
    date: null,
    prep: '',
    log: '',
    recap: '',
  }
  await db.sessions.add(session)
  return session
}

export async function updateSession(id: string, patch: Partial<Session>) {
  await db.sessions.update(id, { ...patch, _dirty: 1, updatedAt: Date.now() })
}

export const deleteSession = (id: string) => softDelete(db.sessions, id)

// ── Characters ──────────────────────────────────────────────────
export async function createCharacter(campaignId: string | null) {
  const character: Character = {
    ...newMeta(),
    campaignId,
    name: 'New Character',
    playerName: '',
    ancestry: '',
    className: '',
    level: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    maxHp: 8,
    currentHp: 8,
    tempHp: 0,
    ac: 10,
    speed: 30,
    proficiencyBonus: 2,
    proficiencies: [],
    spellSlots: {},
    inventory: [],
    notes: '',
  }
  await db.characters.add(character)
  return character
}

export async function updateCharacter(id: string, patch: Partial<Character>) {
  await db.characters.update(id, { ...patch, _dirty: 1, updatedAt: Date.now() })
}

export const deleteCharacter = (id: string) => softDelete(db.characters, id)

// ── Encounters ──────────────────────────────────────────────────
export async function createEncounter(campaignId: string, name = 'New Encounter') {
  const encounter: Encounter = {
    ...newMeta(),
    campaignId,
    name,
    memberRefs: [],
    active: null,
  }
  await db.encounters.add(encounter)
  return encounter
}

export async function updateEncounter(id: string, patch: Partial<Encounter>) {
  await db.encounters.update(id, { ...patch, _dirty: 1, updatedAt: Date.now() })
}

export const deleteEncounter = (id: string) => softDelete(db.encounters, id)

export { uid }
