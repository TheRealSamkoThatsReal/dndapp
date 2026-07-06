import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '../ui/kit'

type Mode = 'signin' | 'signup' | 'magic'

export function AuthPanel({ onClose }: { onClose: () => void }) {
  const { signInPassword, signUpPassword, signInMagic } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(
    null,
  )

  async function submit() {
    setBusy(true)
    setMsg(null)
    let err: string | null = null
    if (mode === 'magic') {
      err = await signInMagic(email)
      if (!err) setMsg({ kind: 'ok', text: 'Check your email for a sign-in link.' })
    } else if (mode === 'signup') {
      err = await signUpPassword(email, password)
      if (!err)
        setMsg({
          kind: 'ok',
          text: 'Account created. Check your email if confirmation is required.',
        })
    } else {
      err = await signInPassword(email, password)
      if (!err) onClose()
    }
    if (err) setMsg({ kind: 'err', text: err })
    setBusy(false)
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-ink-950/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl border border-ink-700 bg-ink-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <h2 className="font-serif text-lg font-semibold text-parchment-50">
            {mode === 'signup' ? 'Create account' : 'Sign in to sync'}
          </h2>
        </div>

        <div className="flex gap-1 text-xs">
          {(
            [
              ['signin', 'Password'],
              ['signup', 'Sign up'],
              ['magic', 'Magic link'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setMsg(null)
              }}
              className={`rounded-full px-3 py-1 transition-colors ${
                mode === m
                  ? 'bg-ember-500 text-ink-950'
                  : 'border border-ink-700 text-parchment-300/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-2 text-parchment-50 outline-none focus:border-ember-500"
        />
        {mode !== 'magic' && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Password"
            className="w-full rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-2 text-parchment-50 outline-none focus:border-ember-500"
          />
        )}

        {msg && (
          <p
            className={`text-sm ${
              msg.kind === 'err' ? 'text-blood-500' : 'text-moss-500'
            }`}
          >
            {msg.text}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy || !email}>
            {busy
              ? '…'
              : mode === 'magic'
                ? 'Send link'
                : mode === 'signup'
                  ? 'Create'
                  : 'Sign in'}
          </Button>
        </div>
      </div>
    </div>
  )
}
