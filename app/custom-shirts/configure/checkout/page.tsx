'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useOrderStore } from '@/lib/store/orderStore'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { Garment, MultiGarmentQuoteResponse } from '@/types'
import { motion } from 'framer-motion'
import SignInPromptCard from '@/components/SignInPromptCard'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { trackBeginCheckout, trackFunnelStep, trackConversion, event } from '@/lib/analytics'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

export default function MultiGarmentCheckout() {
  const router = useRouter()
  const { isAuthenticated, customer, user, openAuthModal, signOut, isLoading: authLoading } = useCustomerAuth()
  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const { 
    selectedGarments,
    getSelectedGarmentIds,
    getTotalQuantity,
    multiGarmentQuote,
    setMultiGarmentQuote,
    printConfig
  } = useOrderStore()

  const selectedIds = getSelectedGarmentIds()

  // Get selected garment data
  const selectedGarmentData = useMemo(() => {
    return garments.filter(g => selectedIds.includes(g.id))
  }, [garments, selectedIds])

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

  // Redirect if no garments selected
  useEffect(() => {
    if (!loading && selectedIds.length === 0) {
      router.replace('/custom-shirts/configure')
    }
  }, [selectedIds.length, loading, router])

  useEffect(() => {
    fetchGarments()
    fetchQuote()
  }, [])

  // Track checkout step when quote is loaded
  useEffect(() => {
    if (multiGarmentQuote && selectedIds.length > 0) {
      const items = selectedIds.map(id => ({
        item_id: id,
        item_name: garments.find(g => g.id === id)?.name || 'Garment',
        quantity: getTotalQuantity()
      }))
      trackBeginCheckout(items, multiGarmentQuote.total)
      trackFunnelStep('custom_order', 4, 'checkout')
    }
  }, [multiGarmentQuote, selectedIds.length])

  async function fetchGarments() {
    try {
      const response = await fetch('/api/garments')
      const data = await response.json()
      setGarments(data)
    } catch (error) {
      console.error('Error fetching garments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchQuote() {
    try {
      const garmentQuantities = selectedIds.map(id => {
        const garment = selectedGarments[id]
        if (!garment) return { garment_id: id, quantity: 0 }
        
        let qty = 0
        Object.values(garment.colorSizeQuantities).forEach(sizeQty => {
          Object.values(sizeQty).forEach(q => { qty += q || 0 })
        })
        return { garment_id: id, quantity: qty }
      }).filter(g => g.quantity > 0)
      
      if (garmentQuantities.length === 0) return
      
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garments: garmentQuantities,
          print_config: printConfig,
          multi_garment: true
        })
      })
      
      if (response.ok) {
        const quoteData = await response.json()
        setMultiGarmentQuote(quoteData)
      }
    } catch (error) {
      console.error('Error fetching quote:', error)
    }
  }

  if (loading || !multiGarmentQuote) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="fixed top-4 left-0 right-0 z-50 transition-all duration-300 flex justify-center px-4">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-lg rounded-full px-8 py-3 flex items-center gap-4"
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
              <Link href="/custom-shirts/configure" className="w-6 h-6 bg-success-500 text-white rounded-full flex items-center justify-center text-xs font-black hover:bg-success-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="w-4 h-0.5 bg-success-300 rounded-full" />
              <Link href="/custom-shirts/configure/colors" className="w-6 h-6 bg-success-500 text-white rounded-full flex items-center justify-center text-xs font-black hover:bg-success-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="w-4 h-0.5 bg-success-300 rounded-full" />
              <Link href="/custom-shirts/configure/artwork" className="w-6 h-6 bg-success-500 text-white rounded-full flex items-center justify-center text-xs font-black hover:bg-success-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="w-4 h-0.5 bg-surface-300 rounded-full" />
              <span className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-black">4</span>
            </div>
            <span className="text-sm font-bold text-charcoal-700 whitespace-nowrap ml-1">Checkout</span>
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
                    <img src={customer.avatar_url} alt={customer?.name || 'Avatar'} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                      {(customer?.name || customer?.email || user?.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-surface-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-surface-100">
                      <p className="text-sm font-bold text-charcoal-700 truncate">{customer?.name || 'Welcome!'}</p>
                      <p className="text-xs text-charcoal-400 truncate">{customer?.email || user?.email}</p>
                    </div>
                    <Link href="/account" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      My Account
                    </Link>
                    <button onClick={() => { signOut(); setShowDropdown(false) }} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => openAuthModal()} className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/50 transition-colors" title="Sign In">
                <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center text-charcoal-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              </button>
            )}
          </div>
        </motion.div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-black text-charcoal-700 mb-12 text-center tracking-tight"
        >
          Review & Checkout
        </motion.h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Sign In Prompt for non-authenticated users */}
            {!isAuthenticated && (
              <SignInPromptCard 
                onOpenAuthModal={(initialMode) => openAuthModal({ feature: 'checkout', initialMode })}
              />
            )}
            <CheckoutForm garments={selectedGarmentData} quote={multiGarmentQuote} />
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary garments={selectedGarmentData} quote={multiGarmentQuote} />
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderSummary({ garments, quote }: { garments: Garment[]; quote: MultiGarmentQuoteResponse }) {
  const { selectedGarments, printConfig, appliedDiscount, discountCodeId, setAppliedDiscount, clearDiscount } = useOrderStore()
  const [discountCode, setDiscountCode] = useState('')
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [applyingDiscount, setApplyingDiscount] = useState(false)
  const [showDiscountInput, setShowDiscountInput] = useState(false)

  // Calculate totals with discount
  // Use the deposit ratio from the quote (deposit_amount / total) to get the actual configured percentage
  const depositRatio = quote.deposit_amount / quote.total
  const depositPercentage = Math.round(depositRatio * 100)
  const discountAmount = appliedDiscount?.discount_amount || 0
  const discountedTotal = Math.max(0, quote.total - discountAmount)
  
  // Calculate deposit with Stripe minimum charge enforcement ($0.50)
  const MINIMUM_CHARGE = 0.50
  let rawDiscountedDeposit = Math.round(discountedTotal * depositRatio * 100) / 100
  const discountedDeposit = rawDiscountedDeposit < MINIMUM_CHARGE && rawDiscountedDeposit > 0
    ? Math.min(MINIMUM_CHARGE, discountedTotal)
    : rawDiscountedDeposit
  const discountedBalance = Math.max(0, discountedTotal - discountedDeposit)

  async function handleApplyDiscount() {
    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code')
      return
    }

    setApplyingDiscount(true)
    setDiscountError(null)

    try {
      const response = await fetch('/api/discount-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCode,
          subtotal: quote.total
        })
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        setDiscountError(data.error || 'Invalid discount code')
        return
      }

      setAppliedDiscount(data.discount, data.discount_code_id)
      setDiscountCode('')
      setShowDiscountInput(false)
    } catch (error) {
      setDiscountError('Failed to apply discount code')
    } finally {
      setApplyingDiscount(false)
    }
  }

  function handleRemoveDiscount() {
    clearDiscount()
    setDiscountCode('')
    setDiscountError(null)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bento-card sticky top-24 bg-gradient-to-br from-charcoal-700 to-charcoal-800 text-white"
    >
      <h3 className="text-2xl font-black mb-6 tracking-tight">Order Summary</h3>
      
      {/* Garments breakdown */}
      <div className="space-y-4 pb-6 border-b border-white/20">
        {garments.map((garment, index) => {
          const selection = selectedGarments[garment.id]
          const colors = selection?.selectedColors || []
          let qty = 0
          Object.values(selection?.colorSizeQuantities || {}).forEach(sizeQty => {
            Object.values(sizeQty).forEach(q => { qty += q || 0 })
          })
          
          return (
            <div key={garment.id} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 relative">
                {garment.thumbnail_url ? (
                  <Image src={garment.thumbnail_url} alt={garment.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white/50 text-xs font-bold">{index + 1}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{garment.name}</p>
                <p className="text-white/60 text-xs">
                  {colors.length} color{colors.length !== 1 ? 's' : ''} • {qty} pcs
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      <div className="space-y-4 py-6 border-b border-white/20">
        <div className="flex justify-between items-baseline">
          <p className="text-white/70 font-semibold">Total Quantity:</p>
          <p className="text-3xl font-black">{quote.total_quantity}</p>
        </div>
        <div>
          <p className="text-white/70 font-semibold mb-2">Print Locations:</p>
          {Object.entries(printConfig.locations).map(([location, config]) => 
            config?.enabled && (
              <p key={location} className="text-sm font-bold capitalize">
                {location}: {config.num_colors} color{config.num_colors > 1 ? 's' : ''}
              </p>
            )
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4 pt-6">
        <div className="flex justify-between">
          <span className="text-white/70 font-semibold">Garments</span>
          <span className="font-black">${quote.garment_cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/70 font-semibold">Print Cost</span>
          <span className="font-black">${quote.print_cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/70 font-semibold">Setup Fees</span>
          <span className="font-black">${quote.setup_fees.toFixed(2)}</span>
        </div>

        {/* Discount Code Section */}
        <div className="border-t border-white/20 pt-4">
          {appliedDiscount ? (
            <div className="bg-data-green/20 border border-data-green/40 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-data-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="font-mono font-bold text-data-green text-sm">{appliedDiscount.code}</span>
                    <span className="text-white/70 text-xs ml-2">
                      ({appliedDiscount.discount_type === 'percentage' ? `${appliedDiscount.discount_value}% off` : `$${appliedDiscount.discount_value} off`})
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleRemoveDiscount}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Remove discount"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-data-green font-semibold">Discount</span>
                <span className="font-black text-data-green">-${discountAmount.toFixed(2)}</span>
              </div>
            </div>
          ) : showDiscountInput ? (
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError(null); }}
                  placeholder="Enter code"
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 font-mono font-bold uppercase text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
                />
                <button
                  onClick={handleApplyDiscount}
                  disabled={applyingDiscount}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {applyingDiscount ? '...' : 'Apply'}
                </button>
              </div>
              {discountError && (
                <p className="text-error-400 text-xs mt-2 font-semibold">{discountError}</p>
              )}
              <button
                onClick={() => { setShowDiscountInput(false); setDiscountCode(''); setDiscountError(null); }}
                className="text-white/50 hover:text-white/70 text-xs mt-2 font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDiscountInput(true)}
              className="flex items-center gap-2 text-primary-400 hover:text-primary-300 font-semibold text-sm transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Have a discount code?
            </button>
          )}

          <div className="flex justify-between items-baseline mb-2">
            <span className="text-white/90 font-black text-lg">Total</span>
            <div className="text-right">
              {discountAmount > 0 && (
                <span className="text-white/50 line-through text-xl mr-2">${quote.total.toFixed(2)}</span>
              )}
              <span className="text-4xl font-black text-primary-400">${discountedTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="bg-white/10 rounded-bento-lg p-4 mt-4">
          <div className="flex justify-between mb-2">
            <span className="font-bold">Deposit ({depositPercentage}%)</span>
            <span className="font-black text-data-green text-xl">${discountedDeposit.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-white/70">
            <span>Balance Due Later</span>
            <span className="font-bold">${discountedBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CheckoutForm({ garments, quote }: { garments: Garment[]; quote: MultiGarmentQuoteResponse }) {
  const router = useRouter()
  const store = useOrderStore()
  const { customer, user, isAuthenticated } = useCustomerAuth()
  
  const [step, setStep] = useState<'info' | 'payment'>('info')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  // Order is now created AFTER payment succeeds (via webhook)
  
  // Pre-fill customer info from logged-in account
  useEffect(() => {
    if (isAuthenticated && customer) {
      if (!store.customerName && customer.name) store.setCustomerInfo({ customerName: customer.name })
      if (!store.email && customer.email) store.setCustomerInfo({ email: customer.email })
      if (!store.phone && customer.phone) store.setCustomerInfo({ phone: customer.phone })
      if (!store.organizationName && customer.organization_name) store.setCustomerInfo({ organizationName: customer.organization_name })
      if (customer.default_shipping_address && !store.shippingAddress.line1) {
        store.setCustomerInfo({ 
          shippingAddress: { ...customer.default_shipping_address, line2: customer.default_shipping_address.line2 || '' }
        })
      }
    }
  }, [isAuthenticated, customer])

  async function handleCustomerInfoSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Prevent double submission
    if (submitting || clientSecret) {
      return
    }
    
    setError(null)
    setSubmitting(true)

    try {
      // For multi-garment orders, we'll create the order with the first garment for now
      const firstGarmentId = garments[0]?.id
      if (!firstGarmentId) throw new Error('No garments selected')
      
      // Combine all color/size quantities from all garments
      const combinedColorSizeQuantities: Record<string, Record<string, number>> = {}
      
      // Add legacy single-garment quantities
      Object.entries(store.colorSizeQuantities).forEach(([color, sizes]) => {
        if (!combinedColorSizeQuantities[color]) {
          combinedColorSizeQuantities[color] = {}
        }
        Object.entries(sizes).forEach(([size, qty]) => {
          combinedColorSizeQuantities[color][size] = (combinedColorSizeQuantities[color][size] || 0) + (qty || 0)
        })
      })
      
      // Add multi-garment quantities
      Object.values(store.selectedGarments).forEach(sel => {
        Object.entries(sel.colorSizeQuantities).forEach(([color, sizes]) => {
          if (!combinedColorSizeQuantities[color]) {
            combinedColorSizeQuantities[color] = {}
          }
          Object.entries(sizes).forEach(([size, qty]) => {
            combinedColorSizeQuantities[color][size] = (combinedColorSizeQuantities[color][size] || 0) + (qty || 0)
          })
        })
      })

      // Include selected_garments if there are multiple garments
      const hasMultipleGarments = Object.keys(store.selectedGarments).length > 1
      
      // Upload artwork files BEFORE creating pending order (File objects can't persist across redirect)
      // Use artworkFileRecords if artworkFiles is empty (after page reload)
      const uploadedArtwork: { location: string; file_url: string; file_name: string; transform?: any; file_size?: number; cropped_file_url?: string | null }[] = []
      
      // First, check if we have File objects (normal case)
      const hasFileObjects = Object.values(store.artworkFiles).some(f => f !== null)
      
      if (hasFileObjects) {
        // Normal flow: upload File objects
        for (const [location, file] of Object.entries(store.artworkFiles)) {
          if (file) {
            try {
              const formData = new FormData()
              formData.append('file', file)
              formData.append('location', location)
              // Upload to temporary storage (will be linked to order after payment)
              if (user) {
                formData.append('user_id', user.id)
              }
              
              const transform = store.artworkTransforms[location]
              if (transform) {
                formData.append('transform', JSON.stringify(transform))
              }
              
              const uploadResponse = await fetch('/api/artwork/upload-temp', {
                method: 'POST',
                body: formData
              })
              
              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json()
                // Get cropped_file_url from the record if it exists
                const record = store.artworkFileRecords[location]
                uploadedArtwork.push({
                  location,
                  file_url: uploadResult.file_url,
                  file_name: file.name,
                  file_size: file.size,
                  transform: transform,
                  cropped_file_url: record?.cropped_file_url || null
                })
              }
            } catch (err) {
              console.error(`Error uploading artwork for ${location}:`, err)
            }
          }
        }
      } else {
        // Page reload case: use artworkFileRecords (already uploaded files)
        console.log('[CHECKOUT] Using artworkFileRecords (page was reloaded, File objects lost)')
        for (const [location, record] of Object.entries(store.artworkFileRecords)) {
          if (record && record.file_url) {
            uploadedArtwork.push({
              location,
              file_url: record.file_url,
              file_name: record.file_name,
              file_size: record.file_size,
              transform: store.artworkTransforms[location] || record.transform || null,
              cropped_file_url: record.cropped_file_url || null
            })
          }
        }
      }
      
      // Also upload vectorized SVGs (only if we have File objects, otherwise they're already in records)
      if (hasFileObjects) {
        for (const [location, svgData] of Object.entries(store.vectorizedSvgData)) {
          if (svgData && svgData.startsWith('data:')) {
            try {
              const base64Data = svgData.split(',')[1]
              const binaryData = atob(base64Data)
              const bytes = new Uint8Array(binaryData.length)
              for (let i = 0; i < binaryData.length; i++) bytes[i] = binaryData.charCodeAt(i)
              const svgBlob = new Blob([bytes], { type: 'image/svg+xml' })
              
              const originalFile = store.artworkFiles[location]
              const fileName = originalFile ? `${originalFile.name.replace(/\.[^/.]+$/, '')}_vectorized.svg` : `${location}_vectorized.svg`
              
              const formData = new FormData()
              formData.append('file', svgBlob, fileName)
              formData.append('location', location)
              formData.append('is_vectorized', 'true')
              
              const uploadResponse = await fetch('/api/artwork/upload-temp', {
                method: 'POST',
                body: formData
              })
              
              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json()
                uploadedArtwork.push({
                  location,
                  file_url: uploadResult.file_url,
                  file_name: fileName,
                  transform: store.artworkTransforms[location]
                })
              }
            } catch (err) {
              console.error(`Error uploading vectorized SVG for ${location}:`, err)
            }
          }
        }
      } else {
        // After page reload: check for vectorized files in records
        for (const [location, record] of Object.entries(store.artworkFileRecords)) {
          if (record && record.vectorized_file_url) {
            // Use vectorized version if available
            const existingIndex = uploadedArtwork.findIndex(a => a.location === location)
            if (existingIndex >= 0) {
              uploadedArtwork[existingIndex].file_url = record.vectorized_file_url
            } else {
              uploadedArtwork.push({
                location,
                file_url: record.vectorized_file_url,
                file_name: record.file_name.replace(/\.[^/.]+$/, '') + '_vectorized.svg',
                file_size: record.file_size,
                transform: store.artworkTransforms[location] || record.transform || null
              })
            }
          }
        }
      }
      
      console.log(`[CHECKOUT] Prepared ${uploadedArtwork.length} artwork files for pending order`)
      
      // Create a PENDING order (actual order created after payment succeeds)
      const pendingOrderData = {
        customer_id: user?.id || null,
        garment_id: firstGarmentId,
        color_size_quantities: combinedColorSizeQuantities,
        selected_garments: hasMultipleGarments ? store.selectedGarments : null,
        print_config: store.printConfig,
        customer_name: store.customerName,
        email: store.email,
        phone: store.phone,
        shipping_address: store.shippingAddress,
        organization_name: store.organizationName,
        need_by_date: store.needByDate,
        // Include discount if applied
        discount_code_id: store.discountCodeId || undefined,
        discount_amount: store.appliedDiscount?.discount_amount || undefined,
        // Store uploaded artwork URLs (already uploaded to temp storage)
        artwork_data: uploadedArtwork
      }

      const pendingResponse = await fetch('/api/pending-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingOrderData)
      })

      if (!pendingResponse.ok) throw new Error('Failed to prepare order')

      const pendingOrder = await pendingResponse.json()

      // Calculate discounted deposit if a discount is applied
      // Use the same deposit ratio from the quote (deposit_amount / total)
      const discountAmount = store.appliedDiscount?.discount_amount || 0
      const discountedTotal = Math.max(0, quote.total - discountAmount)
      const depositRatio = quote.deposit_amount / quote.total
      let discountedDeposit = Math.round(discountedTotal * depositRatio * 100) / 100
      
      // Stripe requires minimum charge of $0.50
      // If deposit is less than $0.50, charge at least $0.50 or the full amount (whichever is smaller)
      const MINIMUM_CHARGE = 0.50
      if (discountedDeposit < MINIMUM_CHARGE && discountedDeposit > 0) {
        discountedDeposit = Math.min(MINIMUM_CHARGE, discountedTotal)
      }

      // Create payment intent with pending order reference
      const paymentResponse = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: discountedDeposit,
          pendingOrderId: pendingOrder.id,
          customerEmail: store.email,
          customerName: store.customerName,
          paymentType: 'deposit'
        })
      })

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        throw new Error(errorData.error || 'Failed to create payment intent')
      }

      const { clientSecret: secret, paymentIntentId } = await paymentResponse.json()
      setClientSecret(secret)
      
      // Store pending order ID for confirmation page
      sessionStorage.setItem('pendingOrderId', pendingOrder.id)
      sessionStorage.setItem('paymentIntentId', paymentIntentId)
      
      // Track payment step
      event('checkout_payment_step', { deposit_amount: discountedDeposit })
      
      setStep('payment')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'info') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bento-card"
      >
        <h3 className="text-3xl font-black text-charcoal-700 mb-8 tracking-tight">Customer Information</h3>
        <form onSubmit={handleCustomerInfoSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">Full Name *</label>
            <input
              type="text"
              required
              value={store.customerName}
              onChange={(e) => store.setCustomerInfo({ customerName: e.target.value })}
              className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">Email *</label>
            <input
              type="email"
              required
              value={store.email}
              onChange={(e) => store.setCustomerInfo({ email: e.target.value })}
              className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">Phone *</label>
            <input
              type="tel"
              required
              value={store.phone}
              onChange={(e) => store.setCustomerInfo({ phone: e.target.value })}
              className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
            />
          </div>

          <div>
            <h4 className="text-xl font-black text-charcoal-700 mb-4">Shipping Address</h4>
            <div className="space-y-4">
              <AddressAutocomplete
                value={store.shippingAddress}
                onChange={(address) => store.setCustomerInfo({ shippingAddress: address })}
                className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 pr-28 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
              />
              <input
                type="text"
                placeholder="Apt, Suite, etc. (optional)"
                value={store.shippingAddress.line2}
                onChange={(e) => store.setCustomerInfo({ shippingAddress: { ...store.shippingAddress, line2: e.target.value } })}
                className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={store.shippingAddress.city}
                  onChange={(e) => store.setCustomerInfo({ shippingAddress: { ...store.shippingAddress, city: e.target.value } })}
                  className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={store.shippingAddress.state}
                  onChange={(e) => store.setCustomerInfo({ shippingAddress: { ...store.shippingAddress, state: e.target.value } })}
                  className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
              </div>
              <input
                type="text"
                required
                placeholder="ZIP Code"
                value={store.shippingAddress.postal_code}
                onChange={(e) => store.setCustomerInfo({ shippingAddress: { ...store.shippingAddress, postal_code: e.target.value } })}
                className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="bento-card bg-error-50 border-2 border-error-200 text-error-700">{error}</div>
          )}

          <div className="flex justify-between pt-6">
            <Link
              href="/custom-shirts/configure/artwork"
              className="px-8 py-4 border-2 border-surface-300 rounded-bento-lg font-black text-charcoal-700 hover:bg-surface-50 hover:shadow-soft transition-all inline-block"
            >
              Back
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-bento-lg font-black shadow-soft hover:shadow-bento transition-all disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>
        </form>
      </motion.div>
    )
  }

  if (step === 'payment' && clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm />
      </Elements>
    )
  }

  return null
}

function PaymentForm() {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements || submitting) return

    setSubmitting(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Use a generic confirmation page that will look up the order from the payment intent
        return_url: `${window.location.origin}/custom-shirts/orders/confirmation`,
      },
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setSubmitting(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bento-card"
    >
      <h3 className="text-3xl font-black text-charcoal-700 mb-8 tracking-tight">Payment Information</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-8">
          <PaymentElement />
        </div>

        {error && (
          <div className="bento-card bg-error-50 border-2 border-error-200 text-error-700 mb-6">{error}</div>
        )}

        <button
          type="submit"
          disabled={!stripe || submitting}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-black py-5 rounded-bento-lg disabled:opacity-50 shadow-soft hover:shadow-bento transition-all text-lg"
        >
          {submitting ? 'Processing...' : 'Pay Deposit'}
        </button>

        <p className="text-sm text-charcoal-500 text-center mt-6 font-semibold">
          Your order will be submitted and artwork reviewed within 1-2 business days
        </p>
      </form>
    </motion.div>
  )
}

