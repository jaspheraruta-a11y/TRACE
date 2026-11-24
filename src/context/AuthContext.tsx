import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase, supabaseConfig } from '@/lib/supabase/client'
import type { AppRole } from '@/lib/supabase/database.types'
import type { StaffProfile } from '@/lib/roles'

export type AuthStatus =
  | 'unconfigured'
  | 'initializing'
  | 'signed_out'
  | 'loading_profile'
  | 'unprovisioned'
  | 'inactive'
  | 'error'
  | 'authenticated'

type ProfileState = 'idle' | 'loading' | 'ready' | 'missing' | 'error'

interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  profile: StaffProfile | null
  profileError: string | null
  isConfigured: boolean
  isAdmin: boolean
  hasRole: (...roles: AppRole[]) => boolean
  signOut: () => Promise<void>
  refreshProfile: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(!supabase)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [profileState, setProfileState] = useState<ProfileState>('idle')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileReloadToken, setProfileReloadToken] = useState(0)

  useEffect(() => {
    if (!supabase) return

    let active = true

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('Unable to restore the TRACE session:', error.message)
        }
        setSession(data.session)
        setSessionLoaded(true)
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error('Unable to restore the TRACE session:', error)
        setSessionLoaded(true)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setSessionLoaded(true)

      if (!nextSession) {
        setProfile(null)
        setProfileState('idle')
        setProfileError(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id

  useEffect(() => {
    if (!supabase || !userId) {
      setProfile(null)
      setProfileState('idle')
      setProfileError(null)
      return
    }

    let active = true
    setProfile(null)
    setProfileState('loading')
    setProfileError(null)

    void supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return

        if (error) {
          console.error('Unable to load the staff profile:', error.message)
          setProfileState('error')
          setProfileError(error.message)
          return
        }

        if (!data) {
          setProfileState('missing')
          return
        }

        setProfile(data)
        setProfileState('ready')
      })

    return () => {
      active = false
    }
  }, [userId, profileReloadToken])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
    setSession(null)
    setProfile(null)
    setProfileState('idle')
    setProfileError(null)
  }, [])

  const refreshProfile = useCallback(() => {
    setProfileReloadToken((token) => token + 1)
  }, [])

  const status: AuthStatus = useMemo(() => {
    if (!supabaseConfig.isConfigured) return 'unconfigured'
    if (!sessionLoaded) return 'initializing'
    if (!session) return 'signed_out'
    if (profileState === 'idle' || profileState === 'loading') {
      return 'loading_profile'
    }
    if (profileState === 'error') return 'error'
    if (profileState === 'missing') return 'unprovisioned'
    if (!profile?.is_active) return 'inactive'
    return 'authenticated'
  }, [sessionLoaded, session, profileState, profile])

  const hasRole = useCallback(
    (...roles: AppRole[]) =>
      Boolean(
        profile?.is_active &&
          roles.length > 0 &&
          roles.includes(profile.role),
      ),
    [profile],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile,
      profileError,
      isConfigured: supabaseConfig.isConfigured,
      isAdmin: Boolean(profile?.is_active && profile.role === 'administrator'),
      hasRole,
      signOut,
      refreshProfile,
    }),
    [status, session, profile, profileError, hasRole, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
