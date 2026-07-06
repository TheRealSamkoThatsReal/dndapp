import Dexie, { type EntityTable } from 'dexie'
import type {
  Campaign,
  Character,
  Encounter,
  Entity,
  Session,
  SyncMeta,
} from './types'

// IndexedDB is the source of truth. The app is fully usable offline;
// Supabase sync (added later) reconciles these tables across devices.
export class GrimoireDB extends Dexie {
  campaigns!: EntityTable<Campaign, 'id'>
  sessions!: EntityTable<Session, 'id'>
  entities!: EntityTable<Entity, 'id'>
  characters!: EntityTable<Character, 'id'>
  encounters!: EntityTable<Encounter, 'id'>

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
  }
}

export const db = new GrimoireDB()

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
