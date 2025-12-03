'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Customer } from '@/types'

interface CustomerAuthContextType {
  user: User | null
  customer: Customer | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: Error | null; requiresEmailConfirmation?: boolean }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updateCustomerProfile: (updates: Partial<Customer>) => Promise<{ error: Error | null }>
  refreshCustomer: () => Promise<void>
  showAuthModal: boolean
  authModalContext: AuthModalContext | null
  openAuthModal: (context?: AuthModalContext) => void
  closeAuthModal: () => void
}

export interface AuthModalContext {
  title?: string
  message?: string
  feature?: 'ai_generator' | 'save_artwork' | 'view_orders' | 'checkout' | 'campaign'
  onSuccess?: () => void
  redirectTo?: string
  initialMode?: 'login' | 'signup' | 'forgot'
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined)

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalContext, setAuthModalContext] = useState<AuthModalContext | null>(null)

  const fetchCustomerProfile = useCallback(async (userId: string): Promise<Customer | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching customer profile:', error)
      }
      return data as Customer | null
    } catch (err) {
      console.error('Error in fetchCustomerProfile:', err)
      return null
    }
  }, [])

  const showAuthModalRef = useRef(showAuthModal)
  const authModalContextRef = useRef(authModalContext)
  
  useEffect(() => {
    showAuthModalRef.current = showAuthModal
    authModalContextRef.current = authModalContext
  }, [showAuthModal, authModalContext])

  // Basic Supabase auth setup - use getUser() to validate session with server
  useEffect(() => {
    // Validate session with the server (not just cached data)
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        // Session is invalid or expired - clear state
        setSession(null)
        setUser(null)
        setCustomer(null)
        setIsLoading(false)
        return
      }
      
      // User is valid - get the session too
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(user)
        setIsLoading(false)
        
        if (user) {
          fetchCustomerProfile(user.id).then(setCustomer)
        }
      })
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
      
      if (session?.user) {
        fetchCustomerProfile(session.user.id).then(setCustomer)
        
        if (showAuthModalRef.current && authModalContextRef.current?.onSuccess) {
          authModalContextRef.current.onSuccess()
        }
        setShowAuthModal(false)
        setAuthModalContext(null)
      } else {
        setCustomer(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchCustomerProfile])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    // If email confirmation is disabled, user will have a session immediately
    // Return the session info so the UI can handle it appropriately
    return { 
      error: error ? new Error(error.message) : null,
      requiresEmailConfirmation: !data.session && !error
    }
  }

  const signInWithGoogle = async () => {
    // Get current page path to redirect back after OAuth
    const currentPath = window.location.pathname + window.location.search
    
    // Store in sessionStorage as backup in case redirect URL isn't configured in Supabase
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_redirect_path', currentPath)
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentPath)}`,
      },
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const updateCustomerProfile = async (updates: Partial<Customer>) => {
    if (!user) return { error: new Error('Not authenticated') }
    const { error } = await supabase.from('customers').update(updates).eq('id', user.id)
    if (!error) setCustomer(prev => prev ? { ...prev, ...updates } : null)
    return { error: error ? new Error(error.message) : null }
  }

  const refreshCustomer = async () => {
    if (user) {
      const customerData = await fetchCustomerProfile(user.id)
      setCustomer(customerData)
    }
  }

  const openAuthModal = (context?: AuthModalContext) => {
    setAuthModalContext(context || null)
    setShowAuthModal(true)
  }

  const closeAuthModal = () => {
    setShowAuthModal(false)
    setAuthModalContext(null)
  }

  return (
    <CustomerAuthContext.Provider value={{
      user,
      customer,
      session,
      isLoading,
      isAuthenticated: !!user,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      resetPassword,
      updateCustomerProfile,
      refreshCustomer,
      showAuthModal,
      authModalContext,
      openAuthModal,
      closeAuthModal,
    }}>
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider')
  }
  return context
}

export function useRequireAuth(context?: AuthModalContext) {
  const { isAuthenticated, isLoading, openAuthModal } = useCustomerAuth()
  
  const requireAuth = useCallback((callback?: () => void) => {
    if (isAuthenticated) {
      callback?.()
      return true
    }
    openAuthModal({ ...context, onSuccess: callback })
    return false
  }, [isAuthenticated, openAuthModal, context])
  
  return { isAuthenticated, isLoading, requireAuth }
}
