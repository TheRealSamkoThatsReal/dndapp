import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase is optional: the app runs fully local-only until these are set.
// Add them to a `.env.local` file (see .env.example) to enable accounts + sync.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSyncConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSyncConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
