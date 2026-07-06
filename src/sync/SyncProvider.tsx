import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthProvider'
import { claimLocalData, subscribeRealtime, syncNow } from './engine'
import { onLocalWrite } from './bus'

type Status = 'local' | 'offline' | 'syncing' | 'synced'

interface SyncState {
  status: Status
  lastSyncedAt: number | null
  syncNow: () => void
}

const SyncContext = createContext<SyncState>({
  status: 'local',
  lastSyncedAt: null,
  syncNow: () => {},
})

// Realtime is the primary delivery path; this interval is just a backstop for
// when a realtime event is missed. Kept short enough that live combat stays
// responsive even if realtime hiccups.
const POLL_MS = 8_000

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth()
  const [status, setStatus] = useState<Status>('local')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const claimed = useRef<string | null>(null)

  const userId = user?.id ?? null

  // Debounced trigger so bursts (realtime + interval) collapse into one run.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const run = useRef<() => void>(() => {})

  useEffect(() => {
    run.current = () => {
      if (!userId) return
      if (!navigator.onLine) {
        setStatus('offline')
        return
      }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        setStatus('syncing')
        await syncNow(userId)
        setStatus('synced')
        setLastSyncedAt(Date.now())
      }, 120)
    }
  }, [userId])

  useEffect(() => {
    if (!configured) {
      setStatus('local')
      return
    }
    if (!userId) {
      setStatus('local') // signed out but sync-capable
      return
    }

    let unsub = () => {}
    ;(async () => {
      if (claimed.current !== userId) {
        await claimLocalData(userId)
        claimed.current = userId
      }
      run.current()
      unsub = subscribeRealtime(userId, () => run.current())
    })()

    const offWrite = onLocalWrite(() => run.current()) // push edits promptly
    const interval = setInterval(() => run.current(), POLL_MS)
    const onFocus = () => run.current()
    const onOnline = () => run.current()
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)

    return () => {
      unsub()
      offWrite()
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
    }
  }, [userId, configured])

  return (
    <SyncContext.Provider
      value={{ status, lastSyncedAt, syncNow: () => run.current() }}
    >
      {children}
    </SyncContext.Provider>
  )
}

export const useSync = () => useContext(SyncContext)
