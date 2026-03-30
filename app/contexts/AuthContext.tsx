'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Session, User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type UserProfile = Database['public']['Tables']['users']['Row']
type UserUpdate = Database['public']['Tables']['users']['Update']

interface AuthState {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (data: UserUpdate) => Promise<void>
  connectWallet: (address: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  })

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      setState((prev) => ({
        ...prev,
        profile,
      }))
    },
    [supabase]
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: !session ? false : prev.loading,
      }))

      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          setState((prev) => ({ ...prev, loading: false }))
        })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }))

      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setState((prev) => ({
          ...prev,
          profile: null,
        }))
      }

      setState((prev) => ({ ...prev, loading: false }))
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setState({
      session: null,
      user: null,
      profile: null,
      loading: false,
    })
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (state.user) {
      await fetchProfile(state.user.id)
    }
  }, [state.user, fetchProfile])

  const updateProfile = useCallback(
    async (data: UserUpdate) => {
      if (!state.user) return

      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', state.user.id)

      if (!error) {
        setState((prev) => ({
          ...prev,
          profile: prev.profile ? { ...prev.profile, ...data } : null,
        }))
      }
    },
    [supabase, state.user]
  )

  const connectWallet = useCallback(
    async (address: string) => {
      if (!state.user) return

      await supabase
        .from('users')
        .update({
          wallet_address: address,
          wallet_connected: true,
        })
        .eq('id', state.user.id)

      setState((prev) => ({
        ...prev,
        profile: prev.profile
          ? {
              ...prev.profile,
              wallet_address: address,
              wallet_connected: true,
            }
          : null,
      }))
    },
    [supabase, state.user]
  )

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signOut,
        refreshProfile,
        updateProfile,
        connectWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
