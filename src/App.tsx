import { Link, Outlet, useLocation } from 'react-router-dom'
import { SyncBadge } from './sync/SyncBadge'

export default function RootLayout() {
  const { pathname } = useLocation()
  const atRoot = pathname === '/'

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-ink-700/60 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <span className="font-serif text-lg font-semibold tracking-wide text-parchment-50">
              Grimoire
            </span>
            {!atRoot && (
              <span className="ml-1 text-xs text-parchment-300/50">
                / campaign
              </span>
            )}
          </Link>
          <SyncBadge />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
