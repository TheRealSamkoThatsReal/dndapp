import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useSync } from './SyncProvider'
import { AuthPanel } from '../auth/AuthPanel'

const DOT: Record<string, string> = {
  local: 'text-parchment-300/60',
  offline: 'text-blood-500',
  syncing: 'text-ember-400 animate-pulse',
  synced: 'text-moss-500',
}

const LABEL: Record<string, string> = {
  local: 'Local only',
  offline: 'Offline',
  syncing: 'Syncing…',
  synced: 'Synced',
}

export function SyncBadge() {
  const { configured, user, signOut } = useAuth()
  const { status } = useSync()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)

  // No Supabase keys yet → honest local-only pill with a hint.
  if (!configured) {
    return (
      <span
        title="Add Supabase keys to .env.local to enable accounts & cross-device sync"
        className="rounded-full border border-ink-700 px-3 py-1 text-xs text-parchment-300/60"
      >
        ● Local only
      </span>
    )
  }

  // Configured but signed out → invite sign-in.
  if (!user) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-ember-500/50 px-3 py-1 text-xs text-ember-400 hover:bg-ember-500/10"
        >
          Sign in to sync
        </button>
        {open && <AuthPanel onClose={() => setOpen(false)} />}
      </>
    )
  }

  // Signed in → live status + account menu.
  return (
    <div className="relative">
      <button
        onClick={() => setMenu((m) => !m)}
        className="flex items-center gap-2 rounded-full border border-ink-700 px-3 py-1 text-xs text-parchment-100"
      >
        <span className={DOT[status]}>●</span>
        {LABEL[status]}
      </button>
      {menu && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-ink-700 bg-ink-800 p-3 shadow-xl">
          <p className="truncate text-sm text-parchment-100">{user.email}</p>
          <p className="mt-0.5 text-xs text-parchment-300/50">
            Changes sync automatically.
          </p>
          <button
            onClick={() => {
              setMenu(false)
              signOut()
            }}
            className="mt-3 w-full rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-parchment-100 hover:bg-ink-700/40"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
