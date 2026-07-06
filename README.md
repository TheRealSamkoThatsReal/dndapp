# 📖 Grimoire — D&D DM Companion

An offline-first PWA for running D&D: campaign wiki, session logs, combat
tracker, and character sheets — all local-first, synced across your devices.

**Live:** https://therealsamkothatsreal.github.io/dndapp/

## Stack

- **React 19 + TypeScript + Vite 8**
- **Tailwind v4** — warm "grimoire" theme
- **Dexie / IndexedDB** — local-first source of truth (works fully offline)
- **Supabase** — accounts + cross-device sync (optional; app runs without it)
- **vite-plugin-pwa** — installable, offline service worker

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build + PWA service worker
```

The app is fully usable with **no backend** — it stores everything in
IndexedDB and shows a "Local only" badge.

## Enable accounts + sync

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   tables, row-level-security policies, and realtime publication.
3. Copy **Project Settings → API → Project URL** and **anon public key**.
4. Create `.env.local` (see `.env.example`):

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. Restart `npm run dev`. The badge becomes **"Sign in to sync"**. Sign up,
   and your existing local data is adopted into your account and synced.

> **Tip for quick testing:** in Supabase **Authentication → Providers → Email**,
> turn off "Confirm email" so password sign-up works without an inbox round-trip.

## Compendium import (Fight Club 5e XML)

The Wiki tab's **📖 Add from Compendium** button imports a Fight Club / Game
Master 5e XML compendium (monsters, spells, items). It's parsed in-browser in
chunks and stored in **device-local Dexie tables that are not synced** — a
50MB+ reference library has no business in your account. Search it, then add
the monsters you actually need to a campaign; those become real synced entities
with full statblocks ready to drop into combat.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with
the `VITE_SUPABASE_*` values stored as GitHub Actions **secrets** and publishes
to GitHub Pages. (The anon key is a public client key — safe to ship; RLS is
the real security boundary.)

For **magic-link / email-confirmation** sign-in on the live site, add the Pages
URL to Supabase → **Authentication → URL Configuration**:
- Site URL: `https://therealsamkothatsreal.github.io/dndapp/`
- Redirect URLs: `https://therealsamkothatsreal.github.io/dndapp/`

Email + password sign-in works without this.

## How sync works

- IndexedDB is the source of truth; the UI never waits on the network.
- Every record carries `updatedAt`, a `_dirty` flag, and a `_deleted`
  tombstone. The sync engine (`src/sync/engine.ts`) pushes dirty records and
  pulls remote changes newer than a per-table cursor, merging **last-write-wins**.
- Triggers: on sign-in, on a 20s interval, on window focus, on reconnect, and
  via Supabase **realtime** for near-instant cross-device updates.

## Project layout

```
src/
├─ db/          types · Dexie schema · repo (CRUD + sync stamping)
├─ auth/        AuthProvider · AuthPanel (sign-in modal)
├─ sync/        engine (push/pull/merge) · SyncProvider · SyncBadge
├─ lib/         supabase client (null until configured)
├─ ui/          shared kit (Button, Card, EmptyState…)
├─ components/  NotesEditor (markdown + [[wikilinks]])
└─ routes/      Campaigns · CampaignLayout · Entities/Sessions/Combat/Characters
supabase/
└─ schema.sql   run once in the Supabase SQL editor
```
