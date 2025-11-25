'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useOrderStore } from '@/lib/store/orderStore'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { Garment } from '@/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

export default function Checkout() {
  const params = useParams()
  const garmentId = params.garmentId as string
  const [garment, setGarment] = useState<Garment | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const store = useOrderStore()

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
            <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full text-sm font-black">4</span>
            <span className="text-sm font-bold text-charcoal-700 whitespace-nowrap">Checkout</span>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <h1 className="text-5xl md:text-6xl font-black text-charcoal-700 mb-12 text-center tracking-tight">
          Review & Checkout
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
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
              <span className="font-bold">Deposit (50%)</span>
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
  const { customer, isAuthenticated } = useCustomerAuth()
  
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
        store.setCustomerInfo({ shippingAddress: customer.default_shipping_address })
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
              <input
                type="text"
                required
                placeholder="Street Address"
                value={store.shippingAddress.line1}
                onChange={(e) => store.setCustomerInfo({ 
                  shippingAddress: { ...store.shippingAddress, line1: e.target.value }
                })}
                className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
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

