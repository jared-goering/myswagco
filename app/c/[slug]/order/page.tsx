'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Campaign, Garment, CampaignGarmentConfig } from '@/types'
import ProductCard from '@/components/campaign/ProductCard'
import CartWidget from '@/components/campaign/CartWidget'
import CheckoutForm from '@/components/campaign/CheckoutForm'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

// Cart item type shared across components
interface CartItem {
  garmentId: string
  garment: Garment
  color: string
  size: string
  quantity: number
  pricePerItem: number
}

type Step = 'shop' | 'checkout' | 'payment' | 'confirmation'

export default function ParticipantOrderPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Shopping cart
  const [cart, setCart] = useState<CartItem[]>([])
  const [expandedGarmentId, setExpandedGarmentId] = useState<string | null>(null)
  
  // Flow state
  const [step, setStep] = useState<Step>('shop')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Order state
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderIds, setOrderIds] = useState<string[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [totalAmountDue, setTotalAmountDue] = useState(0)
  const [confirmedName, setConfirmedName] = useState('')
  
  // Fetch campaign data
  useEffect(() => {
    async function fetchCampaign() {
      try {
        const response = await fetch(`/api/campaigns/${slug}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Campaign not found')
          } else {
            setError('Failed to load campaign')
          }
          return
        }
        const data = await response.json()
        
        // Check if campaign is still accepting orders
        if (data.status !== 'active') {
          setError('This campaign is no longer accepting orders')
          return
        }
        
        setCampaign(data)
      } catch (err) {
        console.error('Error fetching campaign:', err)
        setError('Failed to load campaign')
      } finally {
        setLoading(false)
      }
    }
    
    fetchCampaign()
  }, [slug])

  // Helper functions
  const getGarmentConfig = (garmentId: string): CampaignGarmentConfig => {
    if (campaign?.garment_configs?.[garmentId]) {
      return campaign.garment_configs[garmentId]
    }
    // Fallback for legacy single-garment campaigns
    return {
      price: campaign?.price_per_shirt || 0,
      colors: campaign?.selected_colors || [],
    }
  }

  const addToCart = (item: CartItem) => {
    setCart(prev => [...prev, item])
  }

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const updateCartQuantity = (index: number, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(index)
      return
    }
    setCart(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity } : item
    ))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.pricePerItem * item.quantity, 0)

  // Handle order submission
  async function handleSubmitOrder(name: string, email: string) {
    if (!campaign || cart.length === 0) return
    
    setIsSubmitting(true)
    setError(null)
    setConfirmedName(name)
    
    try {
      // Build order items from cart
      const items = cart.map(item => ({
        garment_id: item.garmentId,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      }))
      
      const response = await fetch(`/api/campaigns/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_name: name,
          participant_email: email,
          items,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to place order')
      }
      
      const orderData = await response.json()
      
      if (orderData.orders) {
        setOrderIds(orderData.orders.map((o: any) => o.id))
        setOrderId(orderData.primary_order_id || orderData.orders[0].id)
      } else {
        setOrderId(orderData.id)
      }
      
      setTotalAmountDue(orderData.amount_due || cartTotal)
      
      // If payment required, get payment intent
      if (orderData.requires_payment && campaign.payment_style === 'everyone_pays') {
        const primaryOrderId = orderData.primary_order_id || orderData.id
        const payResponse = await fetch(`/api/campaigns/${slug}/orders/${primaryOrderId}/pay`, {
          method: 'POST',
        })
        
        if (!payResponse.ok) {
          throw new Error('Failed to initialize payment')
        }
        
        const payData = await payResponse.json()
        setClientSecret(payData.clientSecret)
        setStep('payment')
      } else {
        // No payment needed, go to confirmation
        setStep('confirmation')
      }
    } catch (err: any) {
      console.error('Error placing order:', err)
      setError(err.message || 'Failed to place order')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-charcoal-500 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-charcoal-700 mb-2">{error}</h1>
          <Link href={`/c/${slug}`} className="text-teal-600 font-bold hover:underline">
            Go back to campaign
          </Link>
        </div>
      </div>
    )
  }

  // Campaign data
  const garments = campaign.garments || []
  const isMultiGarment = garments.length > 1
  const singleGarment = garments[0] || campaign.garment as Garment
  const isFree = campaign.payment_style === 'organizer_pays'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-surface-200 py-4 px-6 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link 
            href={`/c/${slug}`} 
            className="flex items-center gap-2 text-charcoal-600 hover:text-charcoal-800 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to campaign
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="My Swag Co" 
              width={120} 
              height={36}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* STEP: SHOP */}
        {step === 'shop' && (
          <motion.div
            key="shop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Hero section */}
            <div className={`py-8 sm:py-12 px-4 sm:px-6 ${isFree ? 'bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-500' : 'bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500'} text-white`}>
              <div className="max-w-6xl mx-auto text-center">
                {isFree && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-bold mb-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Covered by {campaign.organizer_name || 'the organizer'}
                  </div>
                )}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 sm:mb-3 tracking-tight">
                  {campaign.name}
                </h1>
                <p className={`text-base sm:text-lg ${isFree ? 'text-emerald-100' : 'text-teal-100'}`}>
                  {isMultiGarment 
                    ? `Choose from ${garments.length} styles and add to your bag`
                    : 'Select your size and color'
                  }
                  {isFree && ' — it\'s on the house!'}
                </p>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-36 sm:pb-32">
              {/* Single-style: Show product card directly */}
              {!isMultiGarment && singleGarment && (
                <div className="max-w-3xl mx-auto">
                  <ProductCard
                    garment={singleGarment}
                    config={getGarmentConfig(singleGarment.id)}
                    campaign={campaign}
                    onAddToCart={addToCart}
                    isExpanded={true}
                    isSingleStyle={true}
                    isFree={isFree}
                  />
                </div>
              )}

              {/* Multi-style: Show grid or expanded card */}
              {isMultiGarment && (
                <AnimatePresence mode="wait">
                  {expandedGarmentId ? (
                    // Expanded view for selected garment
                    <motion.div
                      key="expanded"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="max-w-4xl mx-auto"
                    >
                      {(() => {
                        const garment = garments.find(g => g.id === expandedGarmentId)
                        if (!garment) return null
                        return (
                          <ProductCard
                            garment={garment}
                            config={getGarmentConfig(garment.id)}
                            campaign={campaign}
                            onAddToCart={addToCart}
                            isExpanded={true}
                            onToggleExpand={() => setExpandedGarmentId(null)}
                            isFree={isFree}
                          />
                        )
                      })()}
                    </motion.div>
                  ) : (
                    // Grid view of all styles
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="text-center mb-8">
                        <p className="text-charcoal-500 font-medium">
                          Click on a style to customize and add to your bag
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {garments.map((garment, index) => (
                          <motion.div
                            key={garment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <ProductCard
                              garment={garment}
                              config={getGarmentConfig(garment.id)}
                              campaign={campaign}
                              onAddToCart={addToCart}
                              isExpanded={false}
                              onToggleExpand={() => setExpandedGarmentId(garment.id)}
                              isFree={isFree}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* Cart widget */}
            <CartWidget
              items={cart}
              onRemoveItem={removeFromCart}
              onUpdateQuantity={updateCartQuantity}
              onCheckout={() => setStep('checkout')}
              isFree={isFree}
            />
          </motion.div>
        )}

        {/* STEP: CHECKOUT */}
        {step === 'checkout' && (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            <CheckoutForm
              items={cart}
              campaign={campaign}
              onSubmit={handleSubmitOrder}
              onBack={() => setStep('shop')}
              onRemoveItem={removeFromCart}
              onUpdateQuantity={updateCartQuantity}
              isSubmitting={isSubmitting}
              error={error}
              isFree={isFree}
            />
          </motion.div>
        )}

        {/* STEP: PAYMENT */}
        {step === 'payment' && clientSecret && orderId && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/30"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </motion.div>
              <h1 className="text-3xl font-black text-charcoal-800 mb-2">Payment</h1>
              <p className="text-charcoal-500">Secure payment via Stripe</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-surface-200/50 p-6 mb-6">
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-charcoal-600 font-medium">Total to pay</span>
                  <span className="text-3xl font-black text-charcoal-800">${totalAmountDue.toFixed(2)}</span>
                </div>
              </div>
              
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm 
                  orderId={orderId} 
                  slug={slug} 
                  onSuccess={() => setStep('confirmation')} 
                />
              </Elements>
            </div>
          </motion.div>
        )}

        {/* STEP: CONFIRMATION */}
        {step === 'confirmation' && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-surface-200/50 p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-3xl font-black text-charcoal-800 mb-3">You're all set!</h2>
                <p className="text-charcoal-500 mb-8">
                  Thanks for your order{confirmedName ? `, ${confirmedName.split(' ')[0]}` : ''}! 
                  You'll receive updates from{' '}
                  <span className="font-bold text-charcoal-700">
                    {campaign.organizer_name || 'the organizer'}
                  </span>{' '}
                  once the campaign closes.
                </p>
              </motion.div>
              
              {/* Order summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-surface-50 rounded-xl p-5 mb-8 text-left"
              >
                <h3 className="font-bold text-charcoal-700 mb-4 text-center">Order Summary</h3>
                <div className="space-y-3">
                  {cart.map((item, index) => {
                    const colorImage = item.garment.color_images?.[item.color] || item.garment.thumbnail_url
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-100 flex-shrink-0 relative">
                          {colorImage && (
                            <Image
                              src={colorImage}
                              alt={item.garment.name}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-charcoal-700 text-sm truncate">
                            {item.garment.name}
                          </p>
                          <p className="text-xs text-charcoal-500">
                            {item.color} / {item.size} × {item.quantity}
                          </p>
                        </div>
                        {isFree ? (
                          <span className="text-charcoal-400 line-through text-sm">
                            ${(item.pricePerItem * item.quantity).toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-bold text-charcoal-700">
                            ${(item.pricePerItem * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                  <div className="pt-3 border-t border-surface-200 flex items-center justify-between">
                    <span className="font-bold text-charcoal-600">Total</span>
                    {isFree ? (
                      <div className="flex items-center gap-2">
                        <span className="text-charcoal-400 line-through">${cartTotal.toFixed(2)}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold text-sm rounded-full">Covered</span>
                      </div>
                    ) : (
                      <span className="text-xl font-black text-charcoal-800">${cartTotal.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Link
                  href={`/c/${slug}`}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-surface-100 text-charcoal-700 font-bold rounded-xl hover:bg-surface-200 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Campaign
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Payment Form Component
function PaymentForm({ orderId, slug, onSuccess }: { orderId: string; slug: string; onSuccess: () => void }) {
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

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setSubmitting(false)
    } else if (paymentIntent?.status === 'succeeded') {
      // Confirm payment on our backend to update order status
      try {
        const response = await fetch(`/api/campaigns/${slug}/orders/${orderId}/pay`, {
          method: 'PATCH',
        })
        
        if (!response.ok) {
          console.error('Failed to confirm payment on backend')
        }
      } catch (err) {
        console.error('Error confirming payment:', err)
      }
      
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <PaymentElement />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-black rounded-xl disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </>
        ) : (
          'Pay Now'
        )}
      </button>
    </form>
  )
}
