'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { trackSignUp, trackLogin, event } from '@/lib/analytics'

type AuthMode = 'login' | 'signup' | 'forgot'

const FEATURE_MESSAGES = {
  ai_generator: {
    title: 'Sign in to use AI Design Generator',
    message: 'Create an account to generate custom designs with AI and save them for later.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  campaign: {
    title: 'Sign in to create a Group Campaign',
    message: 'Create an account to set up group campaigns where your team can pick sizes and pay themselves.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  save_artwork: {
    title: 'Sign in to save your artwork',
    message: 'Create an account to save your designs and access them anytime.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  view_orders: {
    title: 'Sign in to view your orders',
    message: 'Create an account to track your orders and view order history.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  checkout: {
    title: 'Sign in for faster checkout',
    message: 'Save your info for quick checkout and track your orders.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
}

export default function CustomerAuthModal() {
  const { 
    showAuthModal, 
    closeAuthModal, 
    authModalContext,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
  } = useCustomerAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const modalRef = useRef<HTMLDivElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (showAuthModal) {
      setMode(authModalContext?.initialMode || 'login')
      setEmail('')
      setPassword('')
      setName('')
      setError(null)
      setSuccess(null)
      // Focus email input
      setTimeout(() => emailInputRef.current?.focus(), 100)
    }
  }, [showAuthModal, authModalContext])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAuthModal) {
        closeAuthModal()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showAuthModal, closeAuthModal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'forgot') {
        const { error } = await resetPassword(email)
        if (error) throw error
        setSuccess('Password reset email sent! Check your inbox.')
        return
      }

      if (mode === 'signup') {
        const { error, requiresEmailConfirmation } = await signUpWithEmail(email, password, name)
        if (error) throw error
        trackSignUp('email')
        // If email confirmation is required, show message. Otherwise, user is already signed in
        // and the modal will close automatically via auth state change
        if (requiresEmailConfirmation) {
          setSuccess('Account created! Please check your email to confirm.')
        } else {
          // User is immediately signed in - modal will close via auth state change
          setSuccess('Account created! Welcome!')
        }
        return
      }

      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
        trackLogin('email')
        // Modal will close automatically on successful auth
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    
    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
      // Track Google sign-in attempt (actual success tracked after redirect)
      event('google_auth_initiated', { method: 'google' })
      // User will be redirected to Google
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      setLoading(false)
    }
  }

  const featureInfo = authModalContext?.feature ? FEATURE_MESSAGES[authModalContext.feature] : null

  if (!showAuthModal) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm"
        onClick={closeAuthModal}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative gradient header */}
          <div className="h-2 bg-gradient-to-r from-primary-500 via-teal-500 to-cyan-500" />
          
          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-100 transition-colors z-10"
          >
            <svg className="w-5 h-5 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6 sm:p-8">
            {/* Feature-specific header */}
            {featureInfo && mode === 'login' && (
              <div className="mb-6 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg text-white">
                    {featureInfo.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-charcoal-700">{authModalContext?.title || featureInfo.title}</h3>
                    <p className="text-sm text-charcoal-500 mt-1">{authModalContext?.message || featureInfo.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-charcoal-700 tracking-tight">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h2>
              <p className="text-charcoal-500 mt-1">
                {mode === 'login' && 'Sign in to continue'}
                {mode === 'signup' && 'Join My Swag Co today'}
                {mode === 'forgot' && "We'll send you a reset link"}
              </p>
            </div>

            {/* Google Sign In Button */}
            {mode !== 'forgot' && (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-surface-200 rounded-xl font-bold text-charcoal-700 hover:bg-surface-50 hover:border-surface-300 transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-surface-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-charcoal-400 font-medium">or</span>
                  </div>
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                  Email Address
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                  />
                  {mode === 'signup' && (
                    <p className="mt-1.5 text-xs text-charcoal-400">At least 6 characters</p>
                  )}
                </div>
              )}

              {/* Forgot password link */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <p className="text-sm font-medium text-rose-700">{error}</p>
                </div>
              )}

              {/* Success message */}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm font-medium text-emerald-700">{success}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot' && 'Send Reset Link'}
                  </>
                )}
              </button>
            </form>

            {/* Mode switcher */}
            <div className="mt-6 text-center text-sm">
              {mode === 'login' && (
                <p className="text-charcoal-500">
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(null); setSuccess(null) }}
                    className="font-bold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              )}
              {mode === 'signup' && (
                <p className="text-charcoal-500">
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
                    className="font-bold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              )}
              {mode === 'forgot' && (
                <p className="text-charcoal-500">
                  Remember your password?{' '}
                  <button
                    onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
                    className="font-bold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>

            {/* Skip for now (guest option) */}
            {authModalContext?.feature === 'checkout' && (
              <div className="mt-4 text-center">
                <button
                  onClick={closeAuthModal}
                  className="text-sm font-semibold text-charcoal-400 hover:text-charcoal-600 transition-colors"
                >
                  Continue as guest
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

