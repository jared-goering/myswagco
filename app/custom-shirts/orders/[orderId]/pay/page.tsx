'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, ShieldCheckIcon, LockClosedIcon } from '@heroicons/react/24/outline'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

interface OrderData {
  id: string
  customer_name: string
  email: string
  total_cost: number
  deposit_amount: number
  balance_due: number
  total_quantity: number
  garment?: {
    name: string
    brand: string
    thumbnail_url?: string
  }
}

export default function BalancePaymentPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrderAndCreateIntent() {
      try {
        // Fetch order
        const orderResponse = await fetch(`/api/orders/${orderId}`)
        if (!orderResponse.ok) {
          setError('Order not found')
          return
        }
        const orderData = await orderResponse.json()
        
        if (orderData.balance_due <= 0) {
          // Already paid - redirect to order status
          router.replace(`/custom-shirts/orders/${orderId}?payment=success`)
          return
        }
        
        setOrder(orderData)

        // Create payment intent for balance
        const intentResponse = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: orderData.balance_due,
            orderId: orderId,
            customerEmail: orderData.email,
            paymentType: 'balance'
          })
        })

        if (!intentResponse.ok) {
          setError('Failed to initialize payment')
          return
        }

        const { clientSecret: secret } = await intentResponse.json()
        setClientSecret(secret)
      } catch (err) {
        setError('Failed to load payment information')
      } finally {
        setLoading(false)
      }
    }

    fetchOrderAndCreateIntent()
  }, [orderId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-charcoal-500 font-semibold">Loading payment...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-error-500 font-bold mb-4">{error || 'Order not found'}</p>
          <Link href="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="bg-white border-b border-surface-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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
          <div className="flex items-center gap-2 text-charcoal-500">
            <LockClosedIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">Secure Payment</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link 
          href={`/custom-shirts/orders/${orderId}`}
          className="inline-flex items-center gap-2 text-charcoal-500 hover:text-charcoal-700 font-semibold mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Order
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bento-card"
          >
            <h2 className="text-2xl font-black text-charcoal-700 mb-6">Payment Summary</h2>
            
            {/* Order Info */}
            <div className="flex gap-4 mb-6 pb-6 border-b border-surface-200">
              {order.garment?.thumbnail_url && (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-100 flex-shrink-0">
                  <img 
                    src={order.garment.thumbnail_url} 
                    alt={order.garment.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <p className="font-bold text-charcoal-700">{order.garment?.name || 'Custom Order'}</p>
                <p className="text-sm text-charcoal-500">{order.total_quantity} pieces</p>
                <p className="text-xs text-charcoal-400 mt-1">Order #{orderId.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between text-charcoal-600">
                <span className="font-semibold">Order Total</span>
                <span className="font-bold">${order.total_cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-success-600">
                <span className="font-semibold">Deposit Paid</span>
                <span className="font-bold">-${order.deposit_amount.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-surface-200">
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-black text-charcoal-700">Balance Due</span>
                  <span className="text-3xl font-black text-primary-500">${order.balance_due.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 pt-6 border-t border-surface-200">
              <div className="flex items-center gap-3 text-charcoal-500">
                <ShieldCheckIcon className="w-5 h-5" />
                <span className="text-sm font-semibold">Your payment is secure and encrypted</span>
              </div>
            </div>
          </motion.div>

          {/* Payment Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bento-card"
          >
            <h2 className="text-2xl font-black text-charcoal-700 mb-6">Payment Method</h2>
            
            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm orderId={orderId} amount={order.balance_due} />
              </Elements>
            ) : (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-charcoal-500 text-sm">Initializing secure payment...</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function PaymentForm({ orderId, amount }: { orderId: string; amount: number }) {
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
        return_url: `${window.location.origin}/custom-shirts/orders/${orderId}?payment=success`,
      },
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <PaymentElement />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl text-error-600 text-sm font-semibold">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-black py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Processing...
          </span>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </button>

      <p className="text-center text-xs text-charcoal-400 mt-4">
        By completing this payment, you agree to our terms of service.
      </p>
    </form>
  )
}

