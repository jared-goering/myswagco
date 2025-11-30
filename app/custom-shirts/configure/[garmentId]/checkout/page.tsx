'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useOrderStore } from '@/lib/store/orderStore'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { Garment } from '@/types'
import SignInPromptCard from '@/components/SignInPromptCard'
import AddressAutocomplete from '@/components/AddressAutocomplete'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

export default function Checkout() {
  const params = useParams()
  const garmentId = params.garmentId as string
  const { isAuthenticated, customer, user, openAuthModal, signOut, isLoading: authLoading } = useCustomerAuth()
  const [garment, setGarment] = useState<Garment | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitialized = useRef(false)
  const store = useOrderStore()

  // Ensure garmentId is set in store (for draft saving)
  useEffect(() => {
    if (garmentId && garmentId !== store.garmentId) {
      store.setGarmentId(garmentId)
    }
  }, [garmentId, store.garmentId, store])

  // Debounced save draft function
  const debouncedSaveDraft = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(async () => {
      if (isAuthenticated && garmentId) {
        setSaveStatus('saving')
        await store.saveDraft()
        setSaveStatus('saved')
        
        // Auto-hide after 2 seconds
        if (saveStatusTimeoutRef.current) {
          clearTimeout(saveStatusTimeoutRef.current)
        }
        saveStatusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      }
    }, 2000)
  }, [isAuthenticated, garmentId, store])

  // Auto-save draft when authenticated user makes changes to customer info
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      return
    }
    
    if (isAuthenticated && garmentId) {
      debouncedSaveDraft()
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [store.customerName, store.email, store.phone, store.shippingAddress, store.organizationName, store.needByDate, isAuthenticated, garmentId, debouncedSaveDraft])

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

  useEffect(() => {
    fetchGarment()
    prepareCheckout()
  }, [])

  async function fetchGarment() {
    try {
      const response = await fetch('/api/garments')
      const garments = await response.json()
      const found = garments.find((g: Garment) => g.id === garmentId)
      setGarment(found)
    } catch (error) {
      console.error('Error fetching garment:', error)
    }
  }

  async function prepareCheckout() {
    // We'll create the payment intent after collecting customer info
    // For now, just validate we have everything we need
    if (!store.quote) {
      console.error('No quote available')
    }
  }

  if (!garment || !store.quote) {
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
        <div className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-lg rounded-full px-8 py-3 flex items-center gap-4">
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
          <nav className="flex items-center gap-2">
            <div className="relative">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full text-sm font-black">4</span>
              {/* Subtle save indicator overlaid on step number */}
              {isAuthenticated && saveStatus !== 'idle' && (
                <span className={`absolute -top-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                  saveStatus === 'saving' ? 'bg-white shadow-sm' : 'bg-emerald-500'
                }`}>
                  {saveStatus === 'saving' ? (
                    <span className="w-2 h-2 border-[1.5px] border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-charcoal-700 whitespace-nowrap">Checkout</span>
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                      {(customer?.name || customer?.email || user?.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
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
                    
                    <Link
                      href="/account/orders"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Order History
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
                onClick={() => openAuthModal()}
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
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <h1 className="text-5xl md:text-6xl font-black text-charcoal-700 mb-12 text-center tracking-tight">
          Review & Checkout
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Sign In Prompt for non-authenticated users */}
            {!isAuthenticated && (
              <SignInPromptCard 
                onOpenAuthModal={(initialMode) => openAuthModal({ feature: 'checkout', initialMode })}
              />
            )}
            <CheckoutForm garment={garment} />
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary garment={garment} />
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderSummary({ garment }: { garment: Garment }) {
  const store = useOrderStore()
  const totalQty = store.getTotalQuantity()

  return (
    <div className="bento-card sticky top-24 bg-gradient-to-br from-charcoal-700 to-charcoal-800 text-white">
      <h3 className="text-2xl font-black mb-6 tracking-tight">Order Summary</h3>
      
      <div className="space-y-4 pb-6 border-b border-white/20">
        <div>
          <p className="font-black text-lg">{garment.name}</p>
          {store.selectedColors.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-white/50 font-semibold uppercase tracking-wide">Colors:</p>
              {store.selectedColors.map((color) => {
                const colorQty = Object.values(store.colorSizeQuantities[color] || {}).reduce((sum, qty) => sum + (qty || 0), 0)
                return (
                  <p key={color} className="text-sm text-white/70 font-semibold">
                    {color} ({colorQty} pcs)
                  </p>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-white/70 font-semibold">No colors selected</p>
          )}
        </div>
        <div className="flex items-baseline gap-3">
          <p className="text-white/70 font-semibold">Total Quantity:</p>
          <p className="text-3xl font-black">{totalQty}</p>
        </div>
        <div>
          <p className="text-white/70 font-semibold mb-2">Print Locations:</p>
          {Object.entries(store.printConfig.locations).map(([location, config]) => 
            config?.enabled && (
              <p key={location} className="text-sm font-bold capitalize">
                {location}: {config.num_colors} color{config.num_colors > 1 ? 's' : ''}
              </p>
            )
          )}
        </div>
      </div>

      {store.quote && (
        <div className="space-y-4 pt-6">
          <div className="flex justify-between">
            <span className="text-white/70 font-semibold">Garments</span>
            <span className="font-black">${store.quote.garment_cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70 font-semibold">Print Cost</span>
            <span className="font-black">${store.quote.print_cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70 font-semibold">Setup Fees</span>
            <span className="font-black">${store.quote.setup_fees.toFixed(2)}</span>
          </div>
          <div className="border-t border-white/20 pt-4">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-white/90 font-black text-lg">Total</span>
              <span className="text-4xl font-black text-primary-400">${store.quote.total.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-white/10 rounded-bento-lg p-4 mt-4">
            <div className="flex justify-between mb-2">
              <span className="font-bold">Deposit ({Math.round((store.quote.deposit_amount / store.quote.total) * 100)}%)</span>
              <span className="font-black text-data-green text-xl">${store.quote.deposit_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-white/70">
              <span>Balance Due Later</span>
              <span className="font-bold">${store.quote.balance_due.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckoutForm({ garment }: { garment: Garment }) {
  const router = useRouter()
  const params = useParams()
  const garmentId = params.garmentId as string
  const store = useOrderStore()
  const { customer, user, isAuthenticated } = useCustomerAuth()
  
  const [step, setStep] = useState<'info' | 'payment'>('info')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  
  // Pre-fill customer info from logged-in account
  useEffect(() => {
    if (isAuthenticated && customer) {
      // Only pre-fill if the store fields are empty
      if (!store.customerName && customer.name) {
        store.setCustomerInfo({ customerName: customer.name })
      }
      if (!store.email && customer.email) {
        store.setCustomerInfo({ email: customer.email })
      }
      if (!store.phone && customer.phone) {
        store.setCustomerInfo({ phone: customer.phone })
      }
      if (!store.organizationName && customer.organization_name) {
        store.setCustomerInfo({ organizationName: customer.organization_name })
      }
      if (customer.default_shipping_address && !store.shippingAddress.line1) {
        store.setCustomerInfo({ 
          shippingAddress: {
            ...customer.default_shipping_address,
            line2: customer.default_shipping_address.line2 || '' // Ensure line2 is always a string
          }
        })
      }
    }
  }, [isAuthenticated, customer])

  async function handleCustomerInfoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Create order with multi-color support
      const orderData = {
        garment_id: garmentId,
        color_size_quantities: store.colorSizeQuantities,
        print_config: store.printConfig,
        customer_name: store.customerName,
        email: store.email,
        phone: store.phone,
        shipping_address: store.shippingAddress,
        organization_name: store.organizationName,
        need_by_date: store.needByDate
      }

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (!orderResponse.ok) {
        throw new Error('Failed to create order')
      }

      const order = await orderResponse.json()
      setOrderId(order.id)

      // Upload artwork files with transform data
      for (const [location, file] of Object.entries(store.artworkFiles)) {
        if (file) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('order_id', order.id)
          formData.append('location', location)
          
          // Include user info for auto-saving to their account
          if (user) {
            formData.append('user_id', user.id)
            if (user.email) formData.append('user_email', user.email)
            if (user.user_metadata?.full_name) formData.append('user_name', user.user_metadata.full_name)
          }
          
          // Include transform data (position, scale, rotation) if available
          const transform = store.artworkTransforms[location]
          if (transform) {
            formData.append('transform', JSON.stringify(transform))
          }

          await fetch('/api/artwork/upload', {
            method: 'POST',
            body: formData
          })
          
          // If file was vectorized, also upload the SVG version
          const svgData = store.vectorizedSvgData[location]
          if (svgData && svgData.startsWith('data:')) {
            // Convert data URL to blob
            const base64Data = svgData.split(',')[1]
            const binaryData = atob(base64Data)
            const bytes = new Uint8Array(binaryData.length)
            for (let i = 0; i < binaryData.length; i++) {
              bytes[i] = binaryData.charCodeAt(i)
            }
            const svgBlob = new Blob([bytes], { type: 'image/svg+xml' })
            
            const vectorFormData = new FormData()
            vectorFormData.append('file', svgBlob, `${file.name.replace(/\.[^/.]+$/, '')}_vectorized.svg`)
            vectorFormData.append('order_id', order.id)
            vectorFormData.append('location', location)
            
            // Include user info for vectorized file too
            if (user) {
              vectorFormData.append('user_id', user.id)
              if (user.email) vectorFormData.append('user_email', user.email)
            }
            
            await fetch('/api/artwork/upload', {
              method: 'POST',
              body: vectorFormData
            })
          }
        }
      }

      // Create payment intent
      const paymentResponse = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: store.quote!.deposit_amount,
          orderId: order.id,
          customerEmail: store.email
        })
      })

      if (!paymentResponse.ok) {
        throw new Error('Failed to create payment intent')
      }

      const { clientSecret: secret } = await paymentResponse.json()
      setClientSecret(secret)
      setStep('payment')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'info') {
    return (
      <div className="bento-card">
        <h3 className="text-3xl font-black text-charcoal-700 mb-8 tracking-tight">Customer Information</h3>
        <form onSubmit={handleCustomerInfoSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={store.customerName}
              onChange={(e) => store.setCustomerInfo({ customerName: e.target.value })}
              className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">
              Email *
            </label>
            <input
              type="email"
              required
              value={store.email}
              onChange={(e) => store.setCustomerInfo({ email: e.target.value })}
              className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">
              Phone *
            </label>
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
                onChange={(e) => store.setCustomerInfo({ 
                  shippingAddress: { ...store.shippingAddress, line2: e.target.value }
                })}
                className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={store.shippingAddress.city}
                  onChange={(e) => store.setCustomerInfo({ 
                    shippingAddress: { ...store.shippingAddress, city: e.target.value }
                  })}
                  className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={store.shippingAddress.state}
                  onChange={(e) => store.setCustomerInfo({ 
                    shippingAddress: { ...store.shippingAddress, state: e.target.value }
                  })}
                  className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
              </div>
              <input
                type="text"
                required
                placeholder="ZIP Code"
                value={store.shippingAddress.postal_code}
                onChange={(e) => store.setCustomerInfo({ 
                  shippingAddress: { ...store.shippingAddress, postal_code: e.target.value }
                })}
                className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="bento-card bg-error-50 border-2 border-error-200 text-error-700">
              {error}
            </div>
          )}

          <div className="flex justify-between pt-6">
            <Link
              href={`/custom-shirts/configure/${garmentId}/artwork`}
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
      </div>
    )
  }

  if (step === 'payment' && clientSecret && orderId) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm orderId={orderId} />
      </Elements>
    )
  }

  return null
}

function PaymentForm({ orderId }: { orderId: string }) {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/custom-shirts/orders/${orderId}/confirmation`,
      },
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setSubmitting(false)
    }
  }

  return (
    <div className="bento-card">
      <h3 className="text-3xl font-black text-charcoal-700 mb-8 tracking-tight">Payment Information</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-8">
          <PaymentElement />
        </div>

        {error && (
          <div className="bento-card bg-error-50 border-2 border-error-200 text-error-700 mb-6">
            {error}
          </div>
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
    </div>
  )
}

