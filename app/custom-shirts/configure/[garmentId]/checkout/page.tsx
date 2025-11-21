'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useOrderStore } from '@/lib/store/orderStore'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/custom-shirts" className="text-2xl font-bold text-primary-600">
            My Swag Co
          </Link>
          <nav className="text-sm text-gray-600">
            <span className="font-semibold text-primary-600">Step 4</span> / Checkout
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
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
  const totalQty = Object.values(store.sizeQuantities).reduce((sum, qty) => sum + (qty || 0), 0)

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
      <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
      
      <div className="space-y-3 pb-4 border-b">
        <div>
          <p className="font-medium">{garment.name}</p>
          <p className="text-sm text-gray-600">{store.garmentColor}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Quantity:</p>
          <p className="font-medium">{totalQty} pieces</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Print Locations:</p>
          {Object.entries(store.printConfig.locations).map(([location, config]) => 
            config?.enabled && (
              <p key={location} className="text-sm">
                {location}: {config.num_colors} color{config.num_colors > 1 ? 's' : ''}
              </p>
            )
          )}
        </div>
      </div>

      {store.quote && (
        <div className="space-y-2 pt-4">
          <div className="flex justify-between text-sm">
            <span>Garments</span>
            <span>${store.quote.garment_cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Print Cost</span>
            <span>${store.quote.print_cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Setup Fees</span>
            <span>${store.quote.setup_fees.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${store.quote.total.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-primary-50 rounded p-3 mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Deposit (50%)</span>
              <span className="font-semibold">${store.quote.deposit_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Balance Due Later</span>
              <span>${store.quote.balance_due.toFixed(2)}</span>
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
  
  const [step, setStep] = useState<'info' | 'payment'>('info')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  async function handleCustomerInfoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Create order
      const totalQty = Object.values(store.sizeQuantities).reduce((sum, qty) => sum + (qty || 0), 0)
      
      const orderData = {
        garment_id: garmentId,
        garment_color: store.garmentColor,
        size_quantities: store.sizeQuantities,
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

      // Upload artwork files
      for (const [location, file] of Object.entries(store.artworkFiles)) {
        if (file) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('order_id', order.id)
          formData.append('location', location)

          await fetch('/api/artwork/upload', {
            method: 'POST',
            body: formData
          })
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold mb-6">Customer Information</h3>
        <form onSubmit={handleCustomerInfoSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={store.customerName}
              onChange={(e) => store.setCustomerInfo({ customerName: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={store.email}
              onChange={(e) => store.setCustomerInfo({ email: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone *
            </label>
            <input
              type="tel"
              required
              value={store.phone}
              onChange={(e) => store.setCustomerInfo({ phone: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <h4 className="font-medium mb-3">Shipping Address</h4>
            <div className="space-y-4">
              <input
                type="text"
                required
                placeholder="Street Address"
                value={store.shippingAddress.line1}
                onChange={(e) => store.setCustomerInfo({ 
                  shippingAddress: { ...store.shippingAddress, line1: e.target.value }
                })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Apt, Suite, etc. (optional)"
                value={store.shippingAddress.line2}
                onChange={(e) => store.setCustomerInfo({ 
                  shippingAddress: { ...store.shippingAddress, line2: e.target.value }
                })}
                className="w-full border border-gray-300 rounded px-3 py-2"
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
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={store.shippingAddress.state}
                  onChange={(e) => store.setCustomerInfo({ 
                    shippingAddress: { ...store.shippingAddress, state: e.target.value }
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
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
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Link
              href={`/custom-shirts/configure/${garmentId}/artwork`}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              Back
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold disabled:opacity-50"
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold mb-6">Payment Information</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <PaymentElement />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || submitting}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
        >
          {submitting ? 'Processing...' : 'Pay Deposit'}
        </button>

        <p className="text-sm text-gray-600 text-center mt-4">
          Your order will be submitted and artwork reviewed within 1-2 business days
        </p>
      </form>
    </div>
  )
}

