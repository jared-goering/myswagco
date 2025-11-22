'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log('Attempting login with:', email)
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Login response:', JSON.stringify({ data, error: signInError }, null, 2))

      if (signInError) {
        console.error('Sign in error:', signInError)
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (data.session) {
        console.log('Session created successfully!')
        console.log('Session:', data.session)
        console.log('Redirecting to:', redirectTo)
        
        // Wait a moment for the session to be stored
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Use window.location for a hard redirect to ensure middleware picks up the session
        window.location.href = redirectTo
      } else {
        console.error('No session returned')
        setError('No session returned from login')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to sign in')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-4xl font-black text-primary-600 hover:text-primary-700 transition-colors">My Swag Co</h1>
        </Link>
        <h2 className="mt-8 text-center text-4xl font-black text-charcoal-700 tracking-tight">
          Admin Login
        </h2>
        <p className="mt-3 text-center text-charcoal-500 font-semibold">
          Enter your credentials to access the dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bento-card">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-error-50 border-2 border-error-200 text-error-700 px-6 py-4 rounded-bento-lg">
                <p className="font-bold">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-6 rounded-bento-lg text-lg font-black text-white bg-primary-500 hover:bg-primary-600 shadow-soft hover:shadow-bento transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  )
}

