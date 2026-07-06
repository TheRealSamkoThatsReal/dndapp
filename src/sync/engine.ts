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
  { remote: 'shared_entities', local: db.sharedEntities as EntityTable<SyncMeta, 'id'> },
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
  // Only push records this user OWNS (or hasn't claimed yet). Shared data
  // pulled from a DM/other member stays read-only locally — never re-pushed
  // (and RLS would reject it anyway).
  const dirty = await local
    .filter((r) => r._dirty === 1 && (r.ownerId === userId || r.ownerId === null))
    .toArray()
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
  await mergeRows(local, data, (u) => (maxSeen = Math.max(maxSeen, u)))
  setCursor(userId, remote, maxSeen)
}

/** Reconstruct a local record from a remote row. */
function toLocalRecord(row: RemoteRow): SyncMeta {
  return {
    ...(row.data as object),
    id: row.id,
    ownerId: row.owner_id,
    updatedAt: row.updated_at,
    _deleted: row.deleted ? 1 : 0,
    _dirty: 0,
  } as SyncMeta
}

interface RemoteRow {
  id: string
  owner_id: string | null
  updated_at: number
  deleted: boolean
  data: unknown
}

/** Merge remote rows into a table (last-write-wins; never clobbers a
 *  newer local record). Optionally reports each row's timestamp. */
async function mergeRows(
  local: EntityTable<SyncMeta, 'id'>,
  rows: RemoteRow[],
  onSeen?: (updatedAt: number) => void,
) {
  await db.transaction('rw', local, async () => {
    for (const row of rows) {
      onSeen?.(row.updated_at)
      const existing = await local.get(row.id)
      if (!existing || row.updated_at > existing.updatedAt) {
        await local.put(toLocalRecord(row))
      }
    }
  })
}

/**
 * Pull one campaign's shared data directly, bypassing the incremental cursor.
 * Needed right after joining: the campaign/combat/party rows already exist with
 * timestamps older than our cursor, so a normal incremental pull would skip them.
 */
async function backfillCampaign(campaignId: string) {
  if (!supabase) return
  const { data: camp } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle()
  if (camp) await mergeRows(db.campaigns as EntityTable<SyncMeta, 'id'>, [camp])

  for (const [remote, local] of [
    ['encounters', db.encounters],
    ['shared_entities', db.sharedEntities],
  ] as const) {
    const { data } = await supabase
      .from(remote)
      .select('*')
      .eq('data->>campaignId', campaignId)
    if (data?.length) {
      await mergeRows(local as EntityTable<SyncMeta, 'id'>, data as RemoteRow[])
    }
  }
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

/** Redeem an invite code via the server-side join function, then pull. */
export async function joinCampaign(
  userId: string,
  code: string,
): Promise<{ ok: boolean; error?: string; campaignId?: string }> {
  if (!supabase) return { ok: false, error: 'Sync is not configured.' }
  const { data, error } = await supabase.rpc('join_campaign', {
    code: code.trim().toUpperCase(),
  })
  if (error) return { ok: false, error: error.message }

  const campaignId = data as string
  // Backfill directly (the cursor would skip these older rows), then kick off a
  // normal sync for anything else. Backfill is what guarantees the campaign
  // appears immediately instead of hanging on "Loading…".
  await backfillCampaign(campaignId)
  void syncNow(userId)
  return { ok: true, campaignId }
}

/** Leave a campaign you joined: drop membership server-side, then purge the
 *  read-only shared copies locally (your own characters are kept). */
export async function leaveCampaign(
  userId: string,
  campaignId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase) {
    const { error } = await supabase
      .from('campaign_members')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
    if (error) return { ok: false, error: error.message }
  }
  await db.campaigns.delete(campaignId)
  await db.encounters.where({ campaignId }).delete()
  // remove pulled party-wiki entries we don't own (keep our own contributions)
  await db.sharedEntities
    .where({ campaignId })
    .filter((e) => e.ownerId !== userId)
    .delete()
  return { ok: true }
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
