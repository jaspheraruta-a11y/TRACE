import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/**
 * Configuration is validated once at module load. The application never
 * creates a client with placeholder credentials, so a misconfigured
 * deployment fails loudly and safely instead of silently using fake data.
 */
export const supabaseConfig = {
  url: supabaseUrl,
  isConfigured:
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) &&
    supabaseAnonKey.length > 20,
} as const

export const supabase = supabaseConfig.isConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

export function getSupabaseProjectHost(): string | null {
  if (!supabaseConfig.isConfigured) return null
  try {
    return new URL(supabaseConfig.url).host
  } catch {
    return null
  }
}
