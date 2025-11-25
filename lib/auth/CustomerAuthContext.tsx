'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Customer } from '@/types'

interface CustomerAuthContextType {
  // Auth state
  user: User | null
  customer: Customer | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Auth actions
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  
  // Customer profile actions
  updateCustomerProfile: (updates: Partial<Customer>) => Promise<{ error: Error | null }>
  refreshCustomer: () => Promise<void>
  
  // Modal control
  showAuthModal: boolean
  authModalContext: AuthModalContext | null
  openAuthModal: (context?: AuthModalContext) => void
  closeAuthModal: () => void
}

export interface AuthModalContext {
  title?: string
  message?: string
  feature?: 'ai_generator' | 'save_artwork' | 'view_orders' | 'checkout'
  onSuccess?: () => void
  redirectTo?: string
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined)

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalContext, setAuthModalContext] = useState<AuthModalContext | null>(null)

  // Fetch customer profile from database
  const fetchCustomerProfile = useCallback(async (userId: string): Promise<Customer | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        // Don't log 404 errors - customer table might not exist yet
        if (error.code !== 'PGRST116') {
          console.error('Error fetching customer profile:', error)
        }
        return null
      }
      
      return data as Customer
    } catch (err) {
      console.error('Error in fetchCustomerProfile:', err)
      return null
    }
  }, [])

  // Store refs to modal state to avoid re-running auth listener
  const showAuthModalRef = useRef(showAuthModal)
  const authModalContextRef = useRef(authModalContext)
  
  useEffect(() => {
    showAuthModalRef.current = showAuthModal
    authModalContextRef.current = authModalContext
  }, [showAuthModal, authModalContext])

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    console.log('CustomerAuthProvider: initializing')
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()
        console.log('CustomerAuthProvider: getSession result', { 
          hasSession: !!currentSession, 
          email: currentSession?.user?.email,
          error: error?.message 
        })
        
        if (!mounted) return
        
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        if (currentSession?.user) {
          const customerData = await fetchCustomerProfile(currentSession.user.id)
          if (mounted) {
            setCustomer(customerData)
          }
        }
      } catch (error) {
        console.error('CustomerAuthProvider: getSession error', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }
    
    getInitialSession()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        console.log('Auth state changed:', event, newSession?.user?.email)
        
        if (!mounted) return
        
        setSession(newSession)
        setUser(newSession?.user ?? null)
        
        if (newSession?.user) {
          const customerData = await fetchCustomerProfile(newSession.user.id)
          if (mounted) {
            setCustomer(customerData)
          }
          
          // Close modal and call success callback if present
          if (showAuthModalRef.current && authModalContextRef.current?.onSuccess) {
            authModalContextRef.current.onSuccess()
          }
          setShowAuthModal(false)
          setAuthModalContext(null)
        } else {
          setCustomer(null)
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchCustomerProfile])

  // Sign in with email/password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      return { error: error ? new Error(error.message) : null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  // Sign up with email/password
  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      })
      
      return { error: error ? new Error(error.message) : null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      return { error: error ? new Error(error.message) : null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCustomer(null)
    setSession(null)
  }

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      
      return { error: error ? new Error(error.message) : null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  // Update customer profile
  const updateCustomerProfile = async (updates: Partial<Customer>) => {
    if (!user) {
      return { error: new Error('Not authenticated') }
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', user.id)
      
      if (!error) {
        setCustomer(prev => prev ? { ...prev, ...updates } : null)
      }
      
      return { error: error ? new Error(error.message) : null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  // Refresh customer profile
  const refreshCustomer = async () => {
    if (user) {
      const customerData = await fetchCustomerProfile(user.id)
      setCustomer(customerData)
    }
  }

  // Modal controls
  const openAuthModal = (context?: AuthModalContext) => {
    setAuthModalContext(context || null)
    setShowAuthModal(true)
  }

  const closeAuthModal = () => {
    setShowAuthModal(false)
    setAuthModalContext(null)
  }

  const value: CustomerAuthContextType = {
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
  }

  return (
    <CustomerAuthContext.Provider value={value}>
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

// Utility hook to require authentication
export function useRequireAuth(context?: AuthModalContext) {
  const { isAuthenticated, isLoading, openAuthModal } = useCustomerAuth()
  
  const requireAuth = useCallback((callback?: () => void) => {
    if (isAuthenticated) {
      callback?.()
      return true
    }
    
    openAuthModal({
      ...context,
      onSuccess: callback,
    })
    return false
  }, [isAuthenticated, openAuthModal, context])
  
  return {
    isAuthenticated,
    isLoading,
    requireAuth,
  }
}

