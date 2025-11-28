'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationCircleIcon,
  CreditCardIcon,
  TruckIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'

interface OrderData {
  id: string
  customer_name: string
  email: string
  phone: string
  organization_name?: string
  shipping_address: {
    line1: string
    line2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  status: string
  total_cost: number
  deposit_amount: number
  deposit_paid: boolean
  balance_due: number
  total_quantity: number
  print_config: any
  color_size_quantities?: Record<string, Record<string, number>>
  selected_garments?: Record<string, any>
  garment_color: string
  created_at: string
  updated_at: string
  stripe_customer_id?: string
  invoice_due_date?: string
  invoice_sent_at?: string
  need_by_date?: string
  tracking_number?: string
  carrier?: string
  garment?: {
    id: string
    name: string
    brand: string
    thumbnail_url?: string
    color_images?: Record<string, string>
  }
  artwork_files?: {
    id: string
    location: string
    file_url: string
    file_name: string
  }[]
}

interface SavedPaymentMethod {
  id: string
  card: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
}

// Helper function to generate tracking URLs for different carriers
function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const carrierUrls: Record<string, string> = {
    'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
    'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
  }
  return carrierUrls[carrier] || `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`
}

const STATUS_STEPS = [
  { key: 'pending_art_review', label: 'Art Review', description: 'We\'re reviewing your artwork', icon: DocumentTextIcon },
  { key: 'art_approved', label: 'Approved', description: 'Design approved for production', icon: CheckCircleIcon },
  { key: 'in_production', label: 'In Production', description: 'Your order is being printed', icon: SparklesIcon },
  { key: 'ready_to_ship', label: 'Ready to Ship', description: 'Order ready for shipment', icon: TruckIcon },
  { key: 'completed', label: 'Completed', description: 'Order shipped', icon: CheckCircleSolid },
]

export default function CustomerOrderStatus() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedCard, setSavedCard] = useState<SavedPaymentMethod | null>(null)
  const [processing, setProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Check for payment success from redirect
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setPaymentSuccess(true)
      // Refresh order data
      fetchOrder()
    }
  }, [searchParams])

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  async function fetchOrder() {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Order not found')
        } else {
          setError('Failed to load order')
        }
        return
      }
      const data = await response.json()
      setOrder(data)

      // Fetch saved payment method if customer has one
      if (data.stripe_customer_id && data.balance_due > 0) {
        try {
          const pmResponse = await fetch(`/api/payments/saved-method?customerId=${data.stripe_customer_id}`)
          if (pmResponse.ok) {
            const pmData = await pmResponse.json()
            if (pmData.paymentMethod) {
              setSavedCard(pmData.paymentMethod)
            }
          }
        } catch (err) {
          console.error('Error fetching saved payment method:', err)
        }
      }
    } catch (err) {
      setError('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  async function handleOneClickPayment() {
    if (!order || !savedCard || processing) return

    setProcessing(true)
    setPaymentError(null)

    try {
      const response = await fetch('/api/payments/charge-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.balance_due
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // If saved card fails, redirect to manual payment
        if (data.requiresAction || data.error) {
          router.push(`/custom-shirts/orders/${orderId}/pay`)
          return
        }
        throw new Error(data.error || 'Payment failed')
      }

      setPaymentSuccess(true)
      // Refresh order to show updated status
      fetchOrder()
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  function getStatusIndex(status: string) {
    const specialStatuses = ['art_revision_needed', 'balance_due', 'cancelled']
    if (specialStatuses.includes(status)) {
      if (status === 'art_revision_needed') return 0
      if (status === 'balance_due') return 2
      return -1
    }
    return STATUS_STEPS.findIndex(s => s.key === status)
  }

  function formatDueDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  function getDaysUntilDue(dateStr: string) {
    const dueDate = new Date(dateStr)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-charcoal-500 font-semibold">Loading your order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="w-16 h-16 text-error-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-charcoal-700 mb-2">Order Not Found</h1>
          <p className="text-charcoal-500 mb-6">We couldn't find this order. Please check the link and try again.</p>
          <Link href="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const currentIndex = getStatusIndex(order.status)
  const isSpecialStatus = ['art_revision_needed', 'balance_due', 'cancelled'].includes(order.status)
  const showPaymentSection = order.balance_due > 0 && order.deposit_paid

  // Get garment colors for display
  const orderColors = order.color_size_quantities ? Object.keys(order.color_size_quantities) : [order.garment_color]

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
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
          <div className="text-right">
            <p className="text-sm font-semibold text-charcoal-500">Order</p>
            <p className="font-mono text-sm font-bold text-charcoal-700">{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Payment Success Message */}
        {paymentSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-success-50 border border-success-200 rounded-2xl p-6 mb-8 flex items-center gap-4"
          >
            <CheckCircleSolid className="w-12 h-12 text-success-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-black text-success-700">Payment Successful!</h3>
              <p className="text-success-600 font-semibold">Your balance has been paid. Your order will ship soon!</p>
            </div>
          </motion.div>
        )}

        {/* Special Status Alert */}
        {isSpecialStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-6 mb-8 ${
              order.status === 'cancelled' ? 'bg-charcoal-100 border border-charcoal-200' :
              order.status === 'art_revision_needed' ? 'bg-error-50 border border-error-200' :
              'bg-warning-50 border border-warning-200'
            }`}
          >
            <div className="flex items-center gap-4">
              <ExclamationCircleIcon className={`w-10 h-10 flex-shrink-0 ${
                order.status === 'cancelled' ? 'text-charcoal-400' :
                order.status === 'art_revision_needed' ? 'text-error-500' :
                'text-warning-500'
              }`} />
              <div>
                <h3 className={`text-lg font-black ${
                  order.status === 'cancelled' ? 'text-charcoal-700' :
                  order.status === 'art_revision_needed' ? 'text-error-700' :
                  'text-warning-700'
                }`}>
                  {order.status === 'cancelled' && 'Order Cancelled'}
                  {order.status === 'art_revision_needed' && 'Artwork Revision Needed'}
                  {order.status === 'balance_due' && 'Payment Required'}
                </h3>
                <p className={`font-semibold ${
                  order.status === 'cancelled' ? 'text-charcoal-500' :
                  order.status === 'art_revision_needed' ? 'text-error-600' :
                  'text-warning-600'
                }`}>
                  {order.status === 'cancelled' && 'This order has been cancelled.'}
                  {order.status === 'art_revision_needed' && 'Please check your email for details on what needs to be changed.'}
                  {order.status === 'balance_due' && 'Your order is ready! Please pay the remaining balance to ship.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Status & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Status Timeline */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bento-card"
            >
              <h2 className="text-2xl font-black text-charcoal-700 mb-6">Order Status</h2>
              
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-6 left-6 right-6 h-1 bg-surface-200 rounded-full" />
                <div 
                  className="absolute top-6 left-6 h-1 bg-primary-500 rounded-full transition-all duration-500"
                  style={{ width: `calc(${Math.max(0, currentIndex) / (STATUS_STEPS.length - 1) * 100}% - 24px)` }}
                />

                {/* Steps */}
                <div className="relative flex justify-between">
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index < currentIndex
                    const isCurrent = index === currentIndex
                    const Icon = step.icon

                    return (
                      <div key={step.key} className="flex flex-col items-center" style={{ flex: 1 }}>
                        <div className={`
                          relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all
                          ${isCompleted ? 'bg-primary-500 text-white' : ''}
                          ${isCurrent ? 'bg-primary-500 text-white ring-4 ring-primary-100' : ''}
                          ${!isCompleted && !isCurrent ? 'bg-surface-200 text-charcoal-400' : ''}
                        `}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="mt-3 text-center">
                          <p className={`text-sm font-bold ${
                            isCurrent ? 'text-primary-600' : 
                            isCompleted ? 'text-charcoal-700' : 
                            'text-charcoal-400'
                          }`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-charcoal-400 mt-0.5 max-w-[100px] hidden sm:block">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-surface-200 flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="font-bold text-charcoal-500">Order Placed</p>
                  <p className="font-semibold text-charcoal-700">
                    {new Date(order.created_at).toLocaleDateString('en-US', { 
                      month: 'short', day: 'numeric', year: 'numeric' 
                    })}
                  </p>
                </div>
                {order.need_by_date && (
                  <div>
                    <p className="font-bold text-charcoal-500">Need By</p>
                    <p className="font-semibold text-charcoal-700">
                      {new Date(order.need_by_date).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="font-bold text-charcoal-500">Last Updated</p>
                  <p className="font-semibold text-charcoal-700">
                    {new Date(order.updated_at).toLocaleDateString('en-US', { 
                      month: 'short', day: 'numeric', year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              {/* Tracking Information */}
              {order.status === 'completed' && order.tracking_number && (
                <div className="mt-6 pt-6 border-t border-surface-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TruckIcon className="w-5 h-5 text-primary-500" />
                    <h3 className="font-bold text-charcoal-700">Tracking Information</h3>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-4">
                    <div className="flex flex-wrap gap-4">
                      {order.carrier && (
                        <div>
                          <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wide">Carrier</p>
                          <p className="font-bold text-charcoal-700">{order.carrier}</p>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wide">Tracking Number</p>
                        <p className="font-mono font-bold text-primary-600">{order.tracking_number}</p>
                      </div>
                    </div>
                    {order.carrier && (
                      <a
                        href={getTrackingUrl(order.carrier, order.tracking_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Track Package
                      </a>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Design Preview */}
            {order.artwork_files && order.artwork_files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bento-card"
              >
                <h2 className="text-2xl font-black text-charcoal-700 mb-6">Your Design</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {order.artwork_files.map((artwork) => (
                    <div key={artwork.id} className="relative bg-surface-100 rounded-xl overflow-hidden aspect-square flex items-center justify-center p-4">
                      <img 
                        src={artwork.file_url} 
                        alt={`${artwork.location} design`}
                        className="max-w-full max-h-full object-contain"
                      />
                      <span className="absolute top-2 left-2 px-2 py-1 bg-charcoal-700/80 text-white text-xs font-bold rounded uppercase">
                        {artwork.location.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Order Details */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bento-card"
            >
              <h2 className="text-2xl font-black text-charcoal-700 mb-6">Order Details</h2>
              
              <div className="space-y-6">
                {/* Garment Info */}
                <div className="flex gap-4">
                  {order.garment?.thumbnail_url && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-100 flex-shrink-0">
                      <img 
                        src={order.garment.thumbnail_url} 
                        alt={order.garment.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-black text-lg text-charcoal-700">{order.garment?.name || 'Custom T-Shirt'}</p>
                    <p className="text-charcoal-500 font-semibold">{order.garment?.brand}</p>
                    <p className="text-charcoal-700 font-bold mt-1">{order.total_quantity} pieces</p>
                  </div>
                </div>

                {/* Colors & Quantities */}
                <div className="border-t border-surface-200 pt-6">
                  <p className="font-bold text-charcoal-500 text-sm uppercase tracking-wide mb-3">Colors</p>
                  <div className="flex flex-wrap gap-2">
                    {orderColors.map((color) => {
                      const colorQty = order.color_size_quantities?.[color] 
                        ? Object.values(order.color_size_quantities[color]).reduce((a, b) => a + (b || 0), 0)
                        : order.total_quantity
                      return (
                        <span key={color} className="px-3 py-1.5 bg-surface-100 rounded-lg text-sm font-bold text-charcoal-700">
                          {color} ({colorQty})
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Print Locations */}
                <div className="border-t border-surface-200 pt-6">
                  <p className="font-bold text-charcoal-500 text-sm uppercase tracking-wide mb-3">Print Locations</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(order.print_config?.locations || {}).map(([location, config]: [string, any]) => (
                      config?.enabled && (
                        <span key={location} className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-bold capitalize">
                          {location.replace('_', ' ')} ({config.num_colors} color{config.num_colors > 1 ? 's' : ''})
                        </span>
                      )
                    ))}
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="border-t border-surface-200 pt-6">
                  <p className="font-bold text-charcoal-500 text-sm uppercase tracking-wide mb-3">Shipping To</p>
                  <div className="text-charcoal-700 font-semibold">
                    <p>{order.customer_name}</p>
                    {order.organization_name && <p>{order.organization_name}</p>}
                    <p>{order.shipping_address.line1}</p>
                    {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                    <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Payment */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bento-card sticky top-24 bg-gradient-to-br from-charcoal-700 to-charcoal-800 text-white"
            >
              <h3 className="text-xl font-black mb-6">Payment Summary</h3>

              <div className="space-y-4 pb-6 border-b border-white/20">
                <div className="flex justify-between">
                  <span className="text-white/70 font-semibold">Order Total</span>
                  <span className="font-black text-xl">${order.total_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 font-semibold">Deposit Paid</span>
                  <div className="flex items-center gap-2">
                    <CheckCircleSolid className="w-5 h-5 text-success-400" />
                    <span className="font-black text-success-400">${order.deposit_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Balance Due Section */}
              <div className="pt-6">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-white/90 font-bold">Balance Due</span>
                  <span className={`text-3xl font-black ${order.balance_due > 0 ? 'text-warning-400' : 'text-success-400'}`}>
                    ${order.balance_due.toFixed(2)}
                  </span>
                </div>

                {/* Due Date */}
                {order.invoice_due_date && order.balance_due > 0 && (
                  <div className="bg-white/10 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 font-semibold">Due Date</span>
                      <span className="font-bold text-white">{formatDueDate(order.invoice_due_date)}</span>
                    </div>
                    {(() => {
                      const daysUntil = getDaysUntilDue(order.invoice_due_date)
                      if (daysUntil < 0) {
                        return <p className="text-error-400 text-sm font-bold mt-2">⚠️ Payment overdue</p>
                      } else if (daysUntil <= 7) {
                        return <p className="text-warning-400 text-sm font-bold mt-2">⏰ Due in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</p>
                      }
                      return null
                    })()}
                  </div>
                )}

                {/* Payment Actions */}
                {showPaymentSection && !paymentSuccess && (
                  <div className="space-y-4">
                    {paymentError && (
                      <div className="bg-error-500/20 border border-error-400/50 rounded-lg p-3 text-sm text-error-200">
                        {paymentError}
                      </div>
                    )}

                    {savedCard ? (
                      <>
                        {/* One-Click Payment */}
                        <button
                          onClick={handleOneClickPayment}
                          disabled={processing}
                          className="w-full bg-success-500 hover:bg-success-600 text-white font-black py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                          {processing ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCardIcon className="w-6 h-6" />
                              Pay ${order.balance_due.toFixed(2)} with •••• {savedCard.card.last4}
                            </>
                          )}
                        </button>
                        <Link
                          href={`/custom-shirts/orders/${orderId}/pay`}
                          className="block w-full text-center text-white/70 hover:text-white text-sm font-semibold py-2 transition-colors"
                        >
                          Use a different card
                        </Link>
                      </>
                    ) : (
                      <Link
                        href={`/custom-shirts/orders/${orderId}/pay`}
                        className="block w-full bg-primary-500 hover:bg-primary-600 text-white font-black py-4 px-6 rounded-xl text-center transition-all"
                      >
                        Pay Balance ${order.balance_due.toFixed(2)}
                      </Link>
                    )}
                  </div>
                )}

                {/* Paid Message */}
                {(order.balance_due === 0 || paymentSuccess) && (
                  <div className="bg-success-500/20 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircleSolid className="w-8 h-8 text-success-400" />
                    <div>
                      <p className="font-black text-success-400">Fully Paid</p>
                      <p className="text-sm text-white/70">Thank you for your payment!</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Contact Support */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-6 p-6 bg-white rounded-2xl border border-surface-200"
            >
              <h4 className="font-bold text-charcoal-700 mb-2">Need Help?</h4>
              <p className="text-sm text-charcoal-500 mb-4">
                Questions about your order? We're here to help!
              </p>
              <a 
                href="mailto:support@myswagco.co" 
                className="text-primary-600 font-bold text-sm hover:underline"
              >
                support@myswagco.co
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

