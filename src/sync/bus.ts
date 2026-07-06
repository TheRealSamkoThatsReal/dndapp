// A minimal pub/sub so local DB writes can trigger an immediate sync, instead
// of waiting for the polling interval. `suppressed` is raised while the sync
// engine itself writes (pushes clearing _dirty, pulled rows) so those writes
// don't re-trigger sync in a loop.

type Listener = () => void
const listeners = new Set<Listener>()
let suppressed = false

export function onLocalWrite(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function emitLocalWrite() {
  if (suppressed) return
  for (const cb of listeners) cb()
}

export function suppressWrites(v: boolean) {
  suppressed = v
}
