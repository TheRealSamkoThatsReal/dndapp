-- ══════════════════════════════════════════════════════════════
-- Grimoire — Supabase schema
-- Run this in your project's SQL editor (Dashboard → SQL Editor → New query).
--
-- Design: each table mirrors a local Dexie table. The full record lives
-- in a `data` jsonb blob so the client model can evolve without migrations.
-- Sync columns (updated_at, deleted) are real columns so we can do
-- incremental pulls (`where updated_at > cursor`) and last-write-wins merge.
-- Row-level security scopes every row to its owner.
--
-- Safe to re-run: policies are dropped before being recreated.
-- ══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- Tables -------------------------------------------------------------------
create table if not exists public.campaigns (
  id         uuid primary key,
  owner_id   uuid not null references auth.users (id) on delete cascade default auth.uid(),
  updated_at bigint not null,          -- epoch ms; drives incremental sync + LWW
  deleted    boolean not null default false,
  data       jsonb not null
);
create table if not exists public.sessions   (like public.campaigns including all);
create table if not exists public.entities   (like public.campaigns including all);
create table if not exists public.characters (like public.campaigns including all);
create table if not exists public.encounters (like public.campaigns including all);

-- Enable row-level security (static so the SQL linter detects it) ----------
alter table public.campaigns  enable row level security;
alter table public.sessions   enable row level security;
alter table public.entities   enable row level security;
alter table public.characters enable row level security;
alter table public.encounters enable row level security;

-- Incremental-pull index on each table ------------------------------------
create index if not exists campaigns_sync_idx  on public.campaigns  (owner_id, updated_at);
create index if not exists sessions_sync_idx   on public.sessions   (owner_id, updated_at);
create index if not exists entities_sync_idx   on public.entities   (owner_id, updated_at);
create index if not exists characters_sync_idx on public.characters (owner_id, updated_at);
create index if not exists encounters_sync_idx on public.encounters (owner_id, updated_at);

-- Policies: an owner sees and mutates only their own rows.
-- Dropped-then-created so this whole script is safely re-runnable. --------
do $$
declare t text;
begin
  foreach t in array array['campaigns','sessions','entities','characters','encounters']
  loop
    execute format('drop policy if exists %1$s_select on public.%1$s;', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s;', t);
    execute format('drop policy if exists %1$s_update on public.%1$s;', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s;', t);

    execute format('create policy %1$s_select on public.%1$s for select using (auth.uid() = owner_id);', t);
    execute format('create policy %1$s_insert on public.%1$s for insert with check (auth.uid() = owner_id);', t);
    execute format('create policy %1$s_update on public.%1$s for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);', t);
    execute format('create policy %1$s_delete on public.%1$s for delete using (auth.uid() = owner_id);', t);
  end loop;
end $$;

-- Realtime: broadcast row changes so other devices pull near-instantly ----
alter publication supabase_realtime add table
  public.campaigns, public.sessions, public.entities,
  public.characters, public.encounters;
