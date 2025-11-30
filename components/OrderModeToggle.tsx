'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrderStore } from '@/lib/store/orderStore'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { OrderMode } from '@/types'

export default function OrderModeToggle() {
  const searchParams = useSearchParams()
  const { orderMode, setOrderMode } = useOrderStore()
  const { isAuthenticated, openAuthModal } = useCustomerAuth()
  
  // Initialize mode from URL parameter (only if authenticated for campaign mode)
  useEffect(() => {
    const modeParam = searchParams.get('mode')
    if (modeParam === 'campaign' && orderMode !== 'campaign' && isAuthenticated) {
      setOrderMode('campaign')
    }
  }, [searchParams, orderMode, setOrderMode, isAuthenticated])
  
  // Handle campaign mode selection - requires auth
  const handleCampaignClick = () => {
    if (isAuthenticated) {
      setOrderMode('campaign')
    } else {
      openAuthModal({
        feature: 'campaign',
        onSuccess: () => setOrderMode('campaign'),
      })
    }
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6 mb-8">
      <h3 className="text-lg font-black text-charcoal-700 mb-4">
        How do you want to run this order?
      </h3>
      
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Regular Order Option */}
        <button
          onClick={() => setOrderMode('regular')}
          className={`relative p-5 rounded-xl text-left transition-all duration-200 border-2 ${
            orderMode === 'regular'
              ? 'border-primary-500 bg-primary-50 shadow-sm'
              : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              orderMode === 'regular'
                ? 'border-primary-500 bg-primary-500'
                : 'border-charcoal-300'
            }`}>
              {orderMode === 'regular' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              )}
            </div>
            <div className="flex-1">
              <div className="font-black text-charcoal-700 mb-1">Regular Order</div>
              <p className="text-sm text-charcoal-500">
                You pick all sizes and pay the full amount.
              </p>
            </div>
          </div>
        </button>

        {/* Group Campaign Option */}
        <button
          onClick={handleCampaignClick}
          className={`relative p-5 rounded-xl text-left transition-all duration-200 border-2 ${
            orderMode === 'campaign'
              ? 'border-teal-500 bg-teal-50 shadow-sm'
              : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
          }`}
        >
          {/* New badge */}
          <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-[10px] font-black rounded-full shadow-sm">
            NEW
          </span>
          
          <div className="flex items-start gap-4">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              orderMode === 'campaign'
                ? 'border-teal-500 bg-teal-500'
                : 'border-charcoal-300'
            }`}>
              {orderMode === 'campaign' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              )}
            </div>
            <div className="flex-1">
              <div className="font-black text-charcoal-700 mb-1">Group Campaign</div>
              <p className="text-sm text-charcoal-500">
                We create a link so your group can pick sizes (and pay) themselves.
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Group Campaign explainer */}
      <AnimatePresence>
        {orderMode === 'campaign' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-teal-700 mb-1">What's a Group Campaign?</h4>
                  <ul className="text-sm text-charcoal-600 space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="text-teal-500">•</span>
                      Share a link with your group
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-teal-500">•</span>
                      Everyone chooses their own size
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-teal-500">•</span>
                      Option for everyone to pay their share
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-teal-500">•</span>
                      We batch everything into one print run
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

