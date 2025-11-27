'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { Order, OrderStatus } from '@/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending_art_review: { label: 'Pending Review', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  art_approved: { label: 'Art Approved', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  art_revision_needed: { label: 'Revision Needed', color: 'text-rose-700', bgColor: 'bg-rose-50' },
  in_production: { label: 'In Production', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  balance_due: { label: 'Balance Due', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  ready_to_ship: { label: 'Ready to Ship', color: 'text-violet-700', bgColor: 'bg-violet-50' },
  completed: { label: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  cancelled: { label: 'Cancelled', color: 'text-charcoal-500', bgColor: 'bg-charcoal-50' },
}

export default function OrdersPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, customer, user, openAuthModal } = useCustomerAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthModal({
        feature: 'view_orders',
        title: 'Sign in to view your orders',
        message: 'Track your orders and view order history.',
      })
      router.push('/')
    }
  }, [isAuthenticated, isLoading, openAuthModal, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated])

  async function fetchOrders() {
    try {
      const response = await fetch('/api/orders/customer')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/account" className="text-charcoal-400 hover:text-charcoal-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <Link href="/custom-shirts/configure" className="flex items-center">
                <Image 
                  src="/logo.png" 
                  alt="My Swag Co" 
                  width={120} 
                  height={36}
                  className="h-8 w-auto"
                />
              </Link>
            </div>
            
            <div className="flex items-center gap-2">
              {customer?.avatar_url ? (
                <img 
                  src={customer.avatar_url} 
                  alt={customer?.name || 'Avatar'} 
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  {(customer?.name || customer?.email || user?.email)?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm mb-6">
          <ol className="flex items-center gap-2 text-charcoal-500">
            <li><Link href="/account" className="hover:text-primary-600 transition-colors">Account</Link></li>
            <li><span className="text-charcoal-300">/</span></li>
            <li className="font-bold text-charcoal-700">Order History</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-charcoal-700 tracking-tight">Order History</h1>
            <p className="text-charcoal-500 mt-1">Track and view your past orders</p>
          </div>
          <Link
            href="/custom-shirts"
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-bento font-bold transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Order
          </Link>
        </div>

        {/* Orders List */}
        {loadingOrders ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bento-card animate-pulse">
                <div className="h-6 w-32 bg-surface-200 rounded mb-4" />
                <div className="h-4 w-64 bg-surface-200 rounded mb-2" />
                <div className="h-4 w-48 bg-surface-200 rounded" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bento-card text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-charcoal-700 mb-2">No orders yet</h3>
            <p className="text-charcoal-500 mb-6 max-w-md mx-auto">
              Ready to create some awesome custom apparel? Start your first order today.
            </p>
            <Link
              href="/custom-shirts"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-violet-500 text-white rounded-bento-lg font-black hover:shadow-lg transition-all"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status]
              return (
                <div key={order.id} className="bento-card hover:shadow-bento transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.color} ${statusConfig.bgColor}`}>
                          {statusConfig.label}
                        </span>
                        <span className="text-sm text-charcoal-400">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-charcoal-700 mb-1">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-sm text-charcoal-500">
                        {order.total_quantity} items • {Object.keys(order.color_size_quantities || { [order.garment_color]: order.size_quantities }).join(', ')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-black text-charcoal-700">${order.total_cost.toFixed(2)}</p>
                        {!order.deposit_paid && (
                          <p className="text-xs text-amber-600 font-semibold">Deposit pending</p>
                        )}
                      </div>
                      <Link
                        href={`/custom-shirts/orders/${order.id}/confirmation`}
                        className="px-4 py-2 border-2 border-surface-300 hover:border-primary-300 rounded-bento font-bold text-charcoal-600 hover:text-primary-600 transition-all"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

