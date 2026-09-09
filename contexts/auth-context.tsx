'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabaseClient } from '@/lib/supabase-admin'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export async function syncAccount(user: User) {
  if (!user || !user.email) return

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.preferred_username ||
    user.email.split('@')[0] ||
    'عميل'

  try {
    const { error } = await supabaseClient.from('account').upsert(
      {
        id: user.id,
        email: user.email,
        name: name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (error) {
      console.error('Error syncing user account:', error.message)
    }
  } catch (err) {
    console.error('Unexpected error syncing account:', err)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await syncAccount(session.user)
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) {
          await syncAccount(session.user)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      const redirectUrl = redirectTo || window.location.origin
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Google Sign In Error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabaseClient.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Sign Out Error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
