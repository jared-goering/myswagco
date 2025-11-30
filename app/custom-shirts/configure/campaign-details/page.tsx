'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useOrderStore } from '@/lib/store/orderStore'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { PaymentStyle } from '@/types'
import DatePicker from '@/components/DatePicker'

// Type for per-garment campaign pricing
interface CampaignGarmentPrice {
  pricePerShirt: number
  garmentCostPerShirt: number
  printCostPerShirt: number
  garmentName: string
}

export default function CampaignDetailsPage() {
  const router = useRouter()
  const { isAuthenticated, customer, user, openAuthModal, signOut, isLoading: authLoading } = useCustomerAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const store = useOrderStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasSubmittedRef = useRef(false)
  
  // Per-garment campaign pricing state
  const [campaignPrices, setCampaignPrices] = useState<Record<string, CampaignGarmentPrice>>({})
  const [isPricingLoading, setIsPricingLoading] = useState(false)
  
  // Form state
  const [campaignName, setCampaignName] = useState(store.campaignName || '')
  const [deadline, setDeadline] = useState(store.campaignDeadline || '')
  const [paymentStyle, setPaymentStyle] = useState<PaymentStyle>(store.paymentStyle || 'everyone_pays')
  
  // Get garment IDs for pricing calculation
  const garmentIdsForPricing = store.getSelectedGarmentIds()
  const fallbackGarmentId = store.garmentId
  const allGarmentIds = garmentIdsForPricing.length > 0 ? garmentIdsForPricing : (fallbackGarmentId ? [fallbackGarmentId] : [])
  
  // Fetch per-garment campaign prices when component loads or garments/print config changes
  const fetchCampaignPrices = useCallback(async () => {
    if (allGarmentIds.length === 0) return
    
    setIsPricingLoading(true)
    try {
      const response = await fetch('/api/campaigns/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garment_ids: allGarmentIds,
          print_config: store.printConfig
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCampaignPrices(data.prices || {})
      }
    } catch (err) {
      console.error('Error fetching campaign prices:', err)
    } finally {
      setIsPricingLoading(false)
    }
  }, [allGarmentIds.join(','), JSON.stringify(store.printConfig)])
  
  useEffect(() => {
    fetchCampaignPrices()
  }, [fetchCampaignPrices])
  
  // Check if in campaign mode (skip if we just submitted)
  useEffect(() => {
    if (store.orderMode !== 'campaign' && !hasSubmittedRef.current) {
      router.replace('/custom-shirts/configure')
    }
  }, [store.orderMode, router])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Validate form
  const isValid = campaignName.trim().length > 0 && deadline.length > 0
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!isAuthenticated) {
      openAuthModal({ feature: 'campaign' })
      return
    }
    
    if (!isValid) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Update store with campaign details
      store.setCampaignDetails({
        name: campaignName,
        deadline: new Date(deadline).toISOString(),
        paymentStyle,
      })
      
      // Build artwork URLs from the store
      const artworkUrls: Record<string, string> = {}
      Object.entries(store.artworkFileRecords).forEach(([location, record]) => {
        if (record?.file_url) {
          artworkUrls[location] = record.vectorized_file_url || record.file_url
        }
      })
      
      // Upload mockup images for all colors
      const mockupImageUrls: Record<string, string> = {}
      const mockupDataUrls = store.mockupImageDataUrls || {}
      
      for (const [color, dataUrl] of Object.entries(mockupDataUrls)) {
        if (!dataUrl) continue
        try {
          // Convert data URL to blob
          const response = await fetch(dataUrl)
          const blob = await response.blob()
          
          // Upload to storage via API
          const formData = new FormData()
          formData.append('file', blob, `mockup-${color.toLowerCase().replace(/\s+/g, '-')}.png`)
          formData.append('location', 'campaign-mockup')
          
          const uploadResponse = await fetch('/api/artwork/upload-temp', {
            method: 'POST',
            body: formData,
          })
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json()
            mockupImageUrls[color] = uploadResult.file_url
          }
        } catch (uploadErr) {
          console.error(`Error uploading mockup image for ${color}:`, uploadErr)
          // Continue without this mockup
        }
      }
      
      // Use first color's mockup as the legacy single mockup for backwards compatibility
      const firstColor = Object.keys(mockupImageUrls)[0]
      const mockupImageUrl = firstColor ? mockupImageUrls[firstColor] : null
      
      // Get selected garment IDs
      const garmentIds = store.getSelectedGarmentIds()
      const garmentId = garmentIds[0] || store.garmentId
      
      if (!garmentId) {
        setError('Please select a garment first')
        setIsSubmitting(false)
        return
      }
      
      // Build garment_configs for multi-garment campaigns
      // Maps each garment ID to { price, colors }
      // Uses per-garment campaign pricing (garment cost + print cost, no setup fees)
      const isMultiGarment = garmentIds.length > 1
      let garmentConfigs: Record<string, { price: number; colors: string[] }> | undefined
      let selectedColors: string[] = []
      
      if (garmentIds.length > 0) {
        // Build garment_configs with per-garment prices and colors
        garmentConfigs = {}
        
        garmentIds.forEach(id => {
          const colors = store.getGarmentColors(id)
          selectedColors = [...selectedColors, ...colors]
          
          // Use the calculated campaign price per shirt for this garment
          // Falls back to the quote price if campaign pricing isn't available
          const campaignPrice = campaignPrices[id]?.pricePerShirt
          const fallbackPrice = store.multiGarmentQuote?.per_shirt_price || store.quote?.per_shirt_price || 0
          const price = campaignPrice || fallbackPrice
          
          garmentConfigs![id] = { price, colors }
        })
      } else if (store.selectedColors.length > 0) {
        selectedColors = store.selectedColors
      }
      
      // Calculate legacy price_per_shirt (first garment's price for backwards compatibility)
      const firstGarmentPrice = garmentId && campaignPrices[garmentId]?.pricePerShirt
      const legacyPricePerShirt = firstGarmentPrice || store.multiGarmentQuote?.per_shirt_price || store.quote?.per_shirt_price || 0
      
      // Create campaign via API
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          deadline: new Date(deadline).toISOString(),
          payment_style: paymentStyle,
          // For multi-garment, send garment_configs; for single, send garment_id
          ...(isMultiGarment && garmentConfigs 
            ? { garment_configs: garmentConfigs }
            : { garment_id: garmentId, selected_colors: selectedColors, price_per_shirt: legacyPricePerShirt }
          ),
          print_config: store.printConfig,
          artwork_urls: artworkUrls,
          artwork_transforms: store.artworkTransforms,
          price_per_shirt: legacyPricePerShirt,
          organizer_name: customer?.name || store.customerName,
          organizer_email: customer?.email || user?.email || store.email,
          mockup_image_url: mockupImageUrl, // Legacy field for backwards compatibility
          mockup_image_urls: mockupImageUrls, // New field: mockup per color
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create campaign')
      }
      
      const campaign = await response.json()
      
      // Mark as submitted to prevent the orderMode useEffect from redirecting
      hasSubmittedRef.current = true
      
      // Reset campaign state
      store.resetCampaign()
      store.reset()
      
      // Redirect to campaign confirmation page
      router.push(`/campaigns/${campaign.slug}/created`)
    } catch (err: any) {
      console.error('Error creating campaign:', err)
      setError(err.message || 'Failed to create campaign. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Get garment for display
  const garmentIds = store.getSelectedGarmentIds()
  const hasGarments = garmentIds.length > 0 || store.garmentId
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4]">
      {/* Header */}
      <header className="fixed top-4 left-0 right-0 z-50 transition-all duration-300 flex justify-center px-4">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-lg rounded-full px-8 py-3 flex items-center gap-4"
        >
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="My Swag Co" 
              width={150} 
              height={45}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-3">
            {/* Step indicators */}
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
              <div className="w-4 h-0.5 bg-teal-300 rounded-full" />
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
              <div className="w-4 h-0.5 bg-teal-300 rounded-full" />
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
              <div className="w-4 h-0.5 bg-teal-300 rounded-full" />
              <span className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-black">4</span>
            </div>
            <span className="text-sm font-bold text-charcoal-700 whitespace-nowrap ml-1">Campaign Details</span>
          </nav>
          
          {/* Account Button */}
          <div className="border-l border-charcoal-200 pl-4 ml-2">
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-surface-200 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-white/50 transition-colors"
                >
                  {customer?.avatar_url ? (
                    <img 
                      src={customer.avatar_url} 
                      alt={customer?.name || 'Avatar'} 
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                      {(customer?.name || customer?.email || user?.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-surface-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-surface-100">
                      <p className="text-sm font-bold text-charcoal-700 truncate">
                        {customer?.name || 'Welcome!'}
                      </p>
                      <p className="text-xs text-charcoal-400 truncate">{customer?.email || user?.email || 'Signed in'}</p>
                    </div>
                    
                    <Link
                      href="/account"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Account
                    </Link>
                    
                    <div className="border-t border-surface-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          signOut()
                          setShowDropdown(false)
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal({ feature: 'campaign' })}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/50 transition-colors"
                title="Sign In"
              >
                <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center text-charcoal-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </motion.div>
      </header>

      {/* Main Content */}
      <div className="relative pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 rounded-full text-sm font-bold mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Group Campaign
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
              Campaign Details
            </h1>
            <p className="text-lg text-charcoal-500 max-w-xl mx-auto">
              Set up your campaign so your group can start ordering.
            </p>
          </motion.div>

          {/* Auth required message */}
          {!isAuthenticated && !authLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl p-6 mb-8 text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-charcoal-700 mb-2">Sign in to create your campaign</h3>
              <p className="text-charcoal-500 mb-4">
                You'll need an account to manage your campaign and track orders.
              </p>
              <button
                onClick={() => openAuthModal({ feature: 'campaign' })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all"
              >
                Sign In or Create Account
              </button>
            </motion.div>
          )}

          {/* Campaign Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-8"
          >
            {/* Campaign Name */}
            <div className="mb-8">
              <label className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">
                Campaign Name *
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Spring 2025 Youth Soccer Uniforms"
                className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none"
                required
              />
            </div>

            {/* Deadline */}
            <div className="mb-8">
              <label className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">
                Order Deadline *
              </label>
              <DatePicker
                value={deadline}
                onChange={setDeadline}
                minDate={new Date(Date.now() + 24 * 60 * 60 * 1000)} // Tomorrow
                placeholder="Choose a deadline"
              />
              <p className="text-sm text-charcoal-400 mt-2">
                We'll show a countdown on your campaign page.
              </p>
            </div>

            {/* Payment Style */}
            <div className="mb-8">
              <label className="block text-sm font-black text-charcoal-600 mb-4 uppercase tracking-wide">
                How will this be paid for? *
              </label>
              
              <div className="space-y-3">
                <label
                  className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentStyle === 'organizer_pays'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentStyle"
                      value="organizer_pays"
                      checked={paymentStyle === 'organizer_pays'}
                      onChange={() => setPaymentStyle('organizer_pays')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-bold text-charcoal-700">I'll pay for everyone</div>
                      <p className="text-sm text-charcoal-500">
                        You'll pay one total at the end. Your group only chooses sizes.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentStyle === 'everyone_pays'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentStyle"
                      value="everyone_pays"
                      checked={paymentStyle === 'everyone_pays'}
                      onChange={() => setPaymentStyle('everyone_pays')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-bold text-charcoal-700">Everyone pays for themselves</div>
                      <p className="text-sm text-charcoal-500">
                        Each person pays their share at checkout. No more chasing Venmo.
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Payment Summary Preview */}
            {(Object.keys(campaignPrices).length > 0 || store.quote?.per_shirt_price) && (
              <div className="mb-8 p-6 bg-surface-50 rounded-xl border border-surface-200">
                {isPricingLoading ? (
                  <div className="flex items-center gap-3 text-charcoal-500">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Calculating prices...
                  </div>
                ) : Object.keys(campaignPrices).length > 1 ? (
                  // Multiple garments - show per-garment pricing
                  <>
                    <div className="mb-4">
                      <span className="text-charcoal-600 font-medium">Price per shirt by style</span>
                    </div>
                    <div className="space-y-2 mb-4">
                      {Object.entries(campaignPrices).map(([garmentId, pricing]) => (
                        <div key={garmentId} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                          <span className="text-sm font-medium text-charcoal-600">{pricing.garmentName}</span>
                          <span className="text-lg font-black text-charcoal-700">
                            ${pricing.pricePerShirt.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-charcoal-400 mb-4">
                      Prices include garment cost + print cost (no setup fee)
                    </p>
                  </>
                ) : (
                  // Single garment - show single price
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-charcoal-600 font-medium">Price per shirt</span>
                    <span className="text-2xl font-black text-charcoal-700">
                      ${(Object.values(campaignPrices)[0]?.pricePerShirt || store.quote?.per_shirt_price || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                
                {paymentStyle === 'organizer_pays' ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold mb-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      No payment due now
                    </div>
                    <p className="text-sm text-emerald-600">
                      You'll pay after your deadline when you're ready to place the production order.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                    <p className="text-sm text-teal-700">
                      Each participant pays the price for their selected style at checkout.
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl text-error-700 font-medium">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-200">
              <Link
                href="/custom-shirts/configure/artwork"
                className="w-full sm:w-auto px-6 py-3 border-2 border-surface-300 rounded-xl font-bold text-charcoal-700 hover:bg-surface-50 transition-all text-center"
              >
                Back to Artwork
              </Link>
              
              <button
                type="submit"
                disabled={!isValid || isSubmitting || !isAuthenticated}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Group Campaign'
                )}
              </button>
            </div>

            <p className="text-center text-sm text-charcoal-400 mt-4">
              You're not placing the print order yet. This just creates your campaign link.
            </p>
          </motion.form>
        </div>
      </div>
    </div>
  )
}

