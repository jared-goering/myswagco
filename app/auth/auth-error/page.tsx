'use client'

import Link from 'next/link'

export default function AuthError() {
  return (
    <div className="min-h-screen bg-surface-200 flex items-center justify-center p-4">
      <div className="bento-card max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-black text-charcoal-700 mb-3">
          Authentication Error
        </h1>
        
        <p className="text-charcoal-500 mb-6">
          Something went wrong during sign in. Please try again or contact support if the problem persists.
        </p>
        
        <div className="space-y-3">
          <Link
            href="/custom-shirts"
            className="block w-full px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-bento-lg font-black transition-all"
          >
            Return to Shop
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="block w-full px-6 py-3 border-2 border-surface-300 hover:border-primary-300 text-charcoal-700 rounded-bento-lg font-bold transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

