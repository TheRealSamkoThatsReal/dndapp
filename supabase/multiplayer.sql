-- ══════════════════════════════════════════════════════════════
-- Grimoire — multiplayer / campaign sharing
-- Run AFTER schema.sql, in the Supabase SQL Editor. Safe to re-run.
--
-- Model: a campaign has one DM (the owner) and many members (players who
-- joined with the invite code). Sharing is enforced entirely by RLS:
--   • members can READ a campaign's active combat (encounters) + party wiki
--   • the DM can READ members' character sheets
--   • the party wiki (shared_entities) is collaborative: any member adds,
--     everyone reads, authors/DM edit
--   • the DM's private wiki (entities) and sessions stay owner-only — unchanged
-- ══════════════════════════════════════════════════════════════

-- ── membership ──────────────────────────────────────────────────
create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'player',
  joined_at   bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (campaign_id, user_id)
);

-- ── collaborative party wiki (separate table = zero risk of leaking the
--    DM's private entities) ───────────────────────────────────────
create table if not exists public.shared_entities (
  id         uuid primary key,
  owner_id   uuid not null references auth.users (id) on delete cascade default auth.uid(),
  updated_at bigint not null,
  deleted    boolean not null default false,
  data       jsonb not null   -- includes campaignId, kind, name, notes, authorName
);
create index if not exists shared_entities_campaign_idx
  on public.shared_entities ((data ->> 'campaignId'));
create index if not exists shared_entities_sync_idx
  on public.shared_entities (owner_id, updated_at);

-- fast invite-code lookups
create index if not exists campaigns_invite_idx
  on public.campaigns ((data ->> 'inviteCode'));

-- ── access helpers (SECURITY DEFINER bypasses RLS → no policy recursion) ──
create or replace function public.is_dm(cid uuid)
  returns boolean language sql security definer stable
  set search_path = public as $$
    select exists (select 1 from campaigns where id = cid and owner_id = auth.uid());
$$;

create or replace function public.is_member(cid uuid)
  returns boolean language sql security definer stable
  set search_path = public as $$
    select exists (
      select 1 from campaign_members where campaign_id = cid and user_id = auth.uid()
    );
$$;

create or replace function public.has_campaign_access(cid uuid)
  returns boolean language sql security definer stable
  set search_path = public as $$
    select public.is_dm(cid) or public.is_member(cid);
$$;

-- Join by invite code. SECURITY DEFINER so a non-member can look up the
-- campaign and enrol *themselves* (auth.uid()) as a player — nothing else.
create or replace function public.join_campaign(code text)
  returns uuid language plpgsql security definer
  set search_path = public as $$
declare cid uuid;
begin
  select id into cid
    from campaigns
    where data ->> 'inviteCode' = upper(trim(code)) and deleted = false
    limit 1;
  if cid is null then
    raise exception 'Invalid invite code';
  end if;
  insert into campaign_members (campaign_id, user_id, role)
    values (cid, auth.uid(), 'player')
    on conflict (campaign_id, user_id) do nothing;
  return cid;
end $$;

-- ── RLS: rewrite reads to grant shared access; writes stay restricted ────
alter table public.campaign_members enable row level security;
alter table public.shared_entities  enable row level security;

-- campaigns: members may READ (writes remain owner-only from schema.sql)
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns
  for select using (owner_id = auth.uid() or public.is_member(id));

-- encounters: members may READ active combat; only the DM writes
drop policy if exists encounters_select on public.encounters;
create policy encounters_select on public.encounters
  for select using (
    owner_id = auth.uid()
    or public.is_member((data ->> 'campaignId')::uuid)
  );

-- characters: the player owns them; the campaign's DM may also READ them
drop policy if exists characters_select on public.characters;
create policy characters_select on public.characters
  for select using (
    owner_id = auth.uid()
    or public.is_dm((data ->> 'campaignId')::uuid)
  );

-- campaign_members
drop policy if exists members_select on public.campaign_members;
create policy members_select on public.campaign_members
  for select using (user_id = auth.uid() or public.is_dm(campaign_id));
drop policy if exists members_insert on public.campaign_members;
create policy members_insert on public.campaign_members
  for insert with check (user_id = auth.uid());
drop policy if exists members_delete on public.campaign_members;
create policy members_delete on public.campaign_members
  for delete using (user_id = auth.uid() or public.is_dm(campaign_id));

-- shared_entities (party wiki): members read + create; author/DM edit + delete
drop policy if exists shared_select on public.shared_entities;
create policy shared_select on public.shared_entities
  for select using (
    owner_id = auth.uid()
    or public.has_campaign_access((data ->> 'campaignId')::uuid)
  );
drop policy if exists shared_insert on public.shared_entities;
create policy shared_insert on public.shared_entities
  for insert with check (
    owner_id = auth.uid()
    and public.has_campaign_access((data ->> 'campaignId')::uuid)
  );
drop policy if exists shared_update on public.shared_entities;
create policy shared_update on public.shared_entities
  for update using (
    owner_id = auth.uid() or public.is_dm((data ->> 'campaignId')::uuid)
  );
drop policy if exists shared_delete on public.shared_entities;
create policy shared_delete on public.shared_entities
  for delete using (
    owner_id = auth.uid() or public.is_dm((data ->> 'campaignId')::uuid)
  );

-- realtime for the new shared tables
alter publication supabase_realtime add table
  public.campaign_members, public.shared_entities;
