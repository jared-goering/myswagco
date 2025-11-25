'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Order, Garment } from '@/types'

export default function OrderConfirmation() {
  const params = useParams()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<Order & { garments: Garment } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  async function fetchOrder() {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-black text-charcoal-700 mb-4">Order Not Found</h1>
          <Link href="/custom-shirts/configure" className="text-primary-600 hover:text-primary-700 font-bold">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  // Calculate total quantity from either multi-color or legacy structure
  const totalQty = order.color_size_quantities 
    ? Object.values(order.color_size_quantities).reduce((total: number, sizeQty) => {
        return total + Object.values(sizeQty).reduce((sum: number, qty) => sum + (qty as number || 0), 0)
      }, 0)
    : Object.values(order.size_quantities).reduce((sum: number, qty) => sum + (qty as number || 0), 0)

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="border-b border-surface-300 bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-2xl font-black text-primary-600 hover:text-primary-700 transition-colors">
            My Swag Co
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Message */}
        <div className="bento-card bg-gradient-to-br from-data-green/10 to-data-green/20 border-2 border-data-green/40 text-center mb-8">
          <div className="w-20 h-20 bg-data-green text-white rounded-bento-lg flex items-center justify-center mx-auto mb-6 shadow-bento">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
            Order Confirmed!
          </h1>
          <p className="text-xl text-charcoal-600 font-semibold">
            Thank you for your order. We've received your deposit payment.
          </p>
        </div>

        {/* Order Details */}
        <div className="bento-card mb-8">
          <h2 className="text-3xl font-black text-charcoal-700 mb-8 tracking-tight">Order Details</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm text-charcoal-500 font-bold uppercase tracking-wide mb-2">Order ID</p>
              <p className="font-mono text-sm font-bold text-charcoal-700 bg-surface-100 px-3 py-2 rounded-bento inline-block">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-charcoal-500 font-bold uppercase tracking-wide mb-2">Email</p>
              <p className="font-bold text-charcoal-700">{order.email}</p>
            </div>
          </div>

          <div className="border-t-2 border-surface-300 pt-6">
            <h3 className="text-xl font-black text-charcoal-700 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-charcoal-500 font-semibold">Garment:</span>
                <span className="font-black text-charcoal-700">{order.garments.name}</span>
              </div>
              {order.color_size_quantities ? (
                <div>
                  <span className="text-charcoal-500 font-semibold block mb-2">Colors:</span>
                  {Object.entries(order.color_size_quantities).map(([color, sizeQty]) => {
                    const colorQty = Object.values(sizeQty).reduce((sum: number, qty) => sum + (qty as number || 0), 0)
                    return (
                      <div key={color} className="flex justify-between items-baseline ml-4 text-sm">
                        <span className="text-charcoal-600 font-semibold">{color}:</span>
                        <span className="font-bold text-charcoal-700">{colorQty} pieces</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex justify-between items-baseline">
                  <span className="text-charcoal-500 font-semibold">Color:</span>
                  <span className="font-black text-charcoal-700">{order.garment_color}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-charcoal-500 font-semibold">Total Quantity:</span>
                <span className="font-black text-charcoal-700">{totalQty} pieces</span>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-surface-300 pt-6 mt-6">
            <h3 className="text-xl font-black text-charcoal-700 mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-charcoal-500 font-semibold">Total Order Cost:</span>
                <span className="font-black text-charcoal-700 text-lg">${order.total_cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-data-green font-bold">Deposit Paid:</span>
                <span className="font-black text-data-green text-xl">${order.deposit_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-charcoal-500 font-semibold">Balance Due (before shipping):</span>
                <span className="font-black text-charcoal-700 text-lg">${order.balance_due.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bento-card bg-gradient-to-br from-data-blue/10 to-data-blue/20 border-2 border-data-blue/30 mb-8">
          <h3 className="text-2xl font-black text-charcoal-700 mb-6 tracking-tight">What Happens Next?</h3>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-data-blue text-white rounded-bento font-black text-sm flex-shrink-0">1</span>
              <span className="font-semibold text-charcoal-700">Our team will review your artwork within 1-2 business days</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-data-blue text-white rounded-bento font-black text-sm flex-shrink-0">2</span>
              <span className="font-semibold text-charcoal-700">If everything looks good, your order will be automatically approved and move into production</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-data-blue text-white rounded-bento font-black text-sm flex-shrink-0">3</span>
              <span className="font-semibold text-charcoal-700">We'll email you if we need any clarification or changes to your artwork</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-data-blue text-white rounded-bento font-black text-sm flex-shrink-0">4</span>
              <span className="font-semibold text-charcoal-700">Before shipping, we'll contact you to collect the remaining balance</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-data-blue text-white rounded-bento font-black text-sm flex-shrink-0">5</span>
              <span className="font-semibold text-charcoal-700">Most orders ship in ~14 business days after art approval</span>
            </li>
          </ol>
        </div>

        {/* Confirmation Email Notice */}
        <div className="bento-card text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-bento-lg flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-charcoal-700 font-semibold text-lg mb-3">
            We've sent a confirmation email to <span className="font-black text-primary-600">{order.email}</span>
          </p>
          <p className="text-charcoal-500 font-semibold">
            If you have any questions, just reply to that email.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          <Link
            href="/custom-shirts"
            className="inline-block btn-primary"
          >
            Start Another Order
          </Link>
        </div>
      </div>
    </div>
  )
}

