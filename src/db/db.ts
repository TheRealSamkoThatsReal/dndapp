import Dexie, { type EntityTable } from 'dexie'
import type {
  Campaign,
  Character,
  Encounter,
  Entity,
  Session,
  SharedEntity,
  SyncMeta,
} from './types'
import type { CompItem, CompMonster, CompSpell } from '../compendium/types'
import { emitLocalWrite } from '../sync/bus'

// IndexedDB is the source of truth. The app is fully usable offline;
// Supabase sync (added later) reconciles these tables across devices.
export class GrimoireDB extends Dexie {
  campaigns!: EntityTable<Campaign, 'id'>
  sessions!: EntityTable<Session, 'id'>
  entities!: EntityTable<Entity, 'id'>
  characters!: EntityTable<Character, 'id'>
  encounters!: EntityTable<Encounter, 'id'>
  sharedEntities!: EntityTable<SharedEntity, 'id'>
  // Compendium tables are device-local reference data — NOT synced (they are
  // absent from the sync engine's table list). Auto-increment ids.
  compMonsters!: EntityTable<CompMonster, 'id'>
  compSpells!: EntityTable<CompSpell, 'id'>
  compItems!: EntityTable<CompItem, 'id'>

  constructor() {
    super('grimoire')
    this.version(1).stores({
      // indexes: pk, then fields we filter/sort on. _dirty powers the sync queue.
      campaigns: 'id, updatedAt, _dirty, _deleted',
      sessions: 'id, campaignId, number, _dirty, _deleted',
      entities: 'id, campaignId, kind, name, _dirty, _deleted',
      characters: 'id, campaignId, _dirty, _deleted',
      encounters: 'id, campaignId, _dirty, _deleted',
    })
    // v2 adds the imported compendium (unmentioned v1 tables carry over).
    this.version(2).stores({
      compMonsters: '++id, search, cr',
      compSpells: '++id, search, level',
      compItems: '++id, search',
    })
    // v3 adds the collaborative party wiki (synced, unlike the compendium).
    this.version(3).stores({
      sharedEntities: 'id, campaignId, _dirty, _deleted',
    })
  }
}

export const db = new GrimoireDB()

// Ping the sync bus on any write to a synced table, so a DM's change is pushed
// within a moment instead of waiting for the polling interval. The bus ignores
// pings raised during the sync engine's own writes. (Compendium tables are not
// included — they never sync.)
const SYNCED_TABLES = [
  db.campaigns, db.sessions, db.entities,
  db.characters, db.encounters, db.sharedEntities,
]
for (const table of SYNCED_TABLES) {
  const fire = () => {
    emitLocalWrite()
  }
  table.hook('creating', fire)
  table.hook('updating', fire)
  table.hook('deleting', fire)
}

// ── helpers ─────────────────────────────────────────────────────

export const uid = () => crypto.randomUUID()

/** Fresh sync metadata for a brand-new record. */
export function newMeta(): SyncMeta {
  return {
    id: uid(),
    ownerId: null,
    updatedAt: Date.now(),
    _dirty: 1,
    _deleted: 0,
  }
}

/** Stamp a record as locally modified so the sync loop will push it. */
export function touch<T extends SyncMeta>(record: T): T {
  record.updatedAt = Date.now()
  record._dirty = 1
  return record
}

/** Soft-delete: keep a tombstone so the deletion syncs to other devices. */
export async function softDelete(
  table: EntityTable<SyncMeta, 'id'>,
  id: string,
) {
  await table.update(id, { _deleted: 1, _dirty: 1, updatedAt: Date.now() })
}

/** Filter helper: live, non-deleted records only. */
export const isLive = (r: SyncMeta) => r._deleted === 0
