import type { EntityTable } from 'dexie'
import { db } from '../db/db'
import type { SyncMeta } from '../db/types'
import { supabase } from '../lib/supabase'

// Maps each local Dexie table to its remote Postgres table. Add new tables
// here and to supabase/schema.sql to keep them in sync.
const TABLES: { remote: string; local: EntityTable<SyncMeta, 'id'> }[] = [
  { remote: 'campaigns', local: db.campaigns as EntityTable<SyncMeta, 'id'> },
  { remote: 'sessions', local: db.sessions as EntityTable<SyncMeta, 'id'> },
  { remote: 'entities', local: db.entities as EntityTable<SyncMeta, 'id'> },
  { remote: 'characters', local: db.characters as EntityTable<SyncMeta, 'id'> },
  { remote: 'encounters', local: db.encounters as EntityTable<SyncMeta, 'id'> },
]

const cursorKey = (userId: string, remote: string) =>
  `grimoire.cursor.${userId}.${remote}`

function getCursor(userId: string, remote: string): number {
  return Number(localStorage.getItem(cursorKey(userId, remote)) ?? 0)
}
function setCursor(userId: string, remote: string, value: number) {
  localStorage.setItem(cursorKey(userId, remote), String(value))
}

// Local-only bookkeeping fields never belong in the shared payload.
function stripLocal(record: SyncMeta): Record<string, unknown> {
  const { _dirty, ...rest } = record
  void _dirty
  return rest
}

/** On first sign-in, adopt any local-only records into the account. */
export async function claimLocalData(userId: string) {
  for (const { local } of TABLES) {
    await local
      .filter((r) => r.ownerId === null)
      .modify({ ownerId: userId, _dirty: 1 })
  }
}

/** Push every dirty local record for one table. */
async function pushTable(
  userId: string,
  remote: string,
  local: EntityTable<SyncMeta, 'id'>,
) {
  const dirty = await local.filter((r) => r._dirty === 1).toArray()
  if (!dirty.length) return

  const rows = dirty.map((r) => ({
    id: r.id,
    owner_id: userId,
    updated_at: r.updatedAt,
    deleted: r._deleted === 1,
    data: stripLocal(r),
  }))

  const { error } = await supabase!.from(remote).upsert(rows)
  if (error) throw error

  // Clear the dirty flag — but only if the record hasn't changed since we
  // read it (guards against clobbering an edit made mid-push).
  await db.transaction('rw', local, async () => {
    for (const r of dirty) {
      const cur = await local.get(r.id)
      if (cur && cur.updatedAt === r.updatedAt) {
        await local.update(r.id, { _dirty: 0 })
      }
    }
  })
}

/** Pull remote changes newer than our cursor and merge (last-write-wins). */
async function pullTable(
  userId: string,
  remote: string,
  local: EntityTable<SyncMeta, 'id'>,
) {
  const since = getCursor(userId, remote)
  const { data, error } = await supabase!
    .from(remote)
    .select('*')
    .gt('updated_at', since)
    .order('updated_at', { ascending: true })
  if (error) throw error
  if (!data?.length) return

  let maxSeen = since
  await db.transaction('rw', local, async () => {
    for (const row of data) {
      maxSeen = Math.max(maxSeen, row.updated_at)
      const localRow = await local.get(row.id)
      // Remote wins only if strictly newer; a dirty-and-newer local record
      // is preserved and will be pushed on the next cycle.
      if (!localRow || row.updated_at > localRow.updatedAt) {
        await local.put({
          ...(row.data as object),
          id: row.id,
          ownerId: row.owner_id,
          updatedAt: row.updated_at,
          _deleted: row.deleted ? 1 : 0,
          _dirty: 0,
        } as SyncMeta)
      }
    }
  })
  setCursor(userId, remote, maxSeen)
}

let running = false

/** Full bidirectional sync: push local changes, then pull remote ones. */
export async function syncNow(userId: string) {
  if (!supabase || running || !navigator.onLine) return
  running = true
  try {
    for (const { remote, local } of TABLES) {
      await pushTable(userId, remote, local)
      await pullTable(userId, remote, local)
    }
  } catch (err) {
    console.warn('[sync] failed:', err)
  } finally {
    running = false
  }
}

/** Subscribe to realtime changes so other devices' edits arrive quickly. */
export function subscribeRealtime(userId: string, onChange: () => void) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('grimoire-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void supabase!.removeChannel(channel)
    void userId
  }
}
