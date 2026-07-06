import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSyncConfigured, supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  configured: boolean
  signInPassword: (email: string, password: string) => Promise<string | null>
  signUpPassword: (email: string, password: string) => Promise<string | null>
  signInMagic: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSyncConfigured)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Normalize Supabase errors to a string message (or null on success).
  const wrap = async (p: Promise<{ error: { message: string } | null }>) => {
    const { error } = await p
    return error ? error.message : null
  }

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    loading,
    configured: isSyncConfigured,
    signInPassword: (email, password) =>
      wrap(supabase!.auth.signInWithPassword({ email, password })),
    signUpPassword: (email, password) =>
      wrap(supabase!.auth.signUp({ email, password })),
    signInMagic: (email) =>
      wrap(
        supabase!.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        }),
      ),
    signOut: async () => {
      await supabase?.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
