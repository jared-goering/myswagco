'use client'

import { motion } from 'framer-motion'

interface SignInPromptCardProps {
  onOpenAuthModal: (initialMode: 'login' | 'signup') => void
}

export default function SignInPromptCard({ onOpenAuthModal }: SignInPromptCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bento-card bg-gradient-to-br from-violet-50/50 to-fuchsia-50/50 border-2 border-violet-200 mb-6"
    >
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Icon Section */}
        <div className="flex-shrink-0">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center shadow-lg">
            <svg 
              className="w-7 h-7 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-black text-charcoal-700 mb-2 tracking-tight">
            Sign in for a faster checkout experience
          </h3>
          <p className="text-sm text-charcoal-600 font-medium mb-4">
            Create a free account or sign in to enjoy these benefits:
          </p>
          <ul className="space-y-2 mb-5">
            <li className="flex items-start gap-2 text-sm text-charcoal-600">
              <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">Save your info automatically for instant future checkouts</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-charcoal-600">
              <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">Track your orders in real-time</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-charcoal-600">
              <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">Access order history and reorder easily</span>
            </li>
          </ul>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onOpenAuthModal('signup')}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-black shadow-soft hover:shadow-bento transition-all"
            >
              Create Account
            </button>
            <button
              onClick={() => onOpenAuthModal('login')}
              className="px-6 py-3 border-2 border-violet-300 hover:border-violet-400 bg-white hover:bg-violet-50 text-charcoal-700 rounded-xl font-black transition-all"
            >
              Sign In
            </button>
          </div>

          {/* Optional note */}
          <p className="text-xs text-charcoal-400 font-medium mt-4">
            Don't worry, you can still checkout as a guest below.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

