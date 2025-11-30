'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { Campaign, CampaignOrder, CampaignStats } from '@/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

// Grouped order type for displaying orders from the same checkout session
interface GroupedOrder {
  id: string
  participant_name: string
  participant_email: string
  items: CampaignOrder[]
  total_quantity: number
  total_amount_paid: number
  status: 'paid' | 'pending' | 'confirmed' | 'cancelled' | 'mixed'
  created_at: string
}

export default function CampaignDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { isAuthenticated, isLoading, customer, user, openAuthModal, signOut } = useCustomerAuth()
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [orders, setOrders] = useState<CampaignOrder[]>([])
  const [campaignLoading, setCampaignLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [showEndCampaignModal, setShowEndCampaignModal] = useState(false)
  const [endingCampaign, setEndingCampaign] = useState(false)
  
  // Payment modal state for organizer_pays campaigns
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<{ amount: number; totalQuantity: number; orderCount: number } | null>(null)
  const [initializingPayment, setInitializingPayment] = useState(false)

  // Group orders by participant email + close timestamps (within 5 seconds)
  const groupedOrders = useMemo<GroupedOrder[]>(() => {
    if (orders.length === 0) return []

    const groups: Record<string, CampaignOrder[]> = {}

    // Sort orders by created_at first to ensure proper grouping
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    sortedOrders.forEach(order => {
      // Create a key based on email + timestamp bucket (5 second window)
      const timestamp = new Date(order.created_at).getTime()
      const bucket = Math.floor(timestamp / 5000) // 5 second buckets
      const key = `${order.participant_email}-${bucket}`

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(order)
    })

    // Convert groups to GroupedOrder array
    return Object.entries(groups).map(([key, items]) => {
      const firstItem = items[0]
      const total_quantity = items.reduce((sum, item) => sum + item.quantity, 0)
      const total_amount_paid = items.reduce((sum, item) => sum + (item.amount_paid || 0), 0)
      
      // Determine overall status
      const statuses = new Set(items.map(item => item.status))
      let status: GroupedOrder['status'] = 'mixed'
      if (statuses.size === 1) {
        status = items[0].status
      } else if (statuses.has('cancelled') && statuses.size === 1) {
        status = 'cancelled'
      }

      return {
        id: key,
        participant_name: firstItem.participant_name,
        participant_email: firstItem.participant_email,
        items,
        total_quantity,
        total_amount_paid,
        status,
        created_at: firstItem.created_at,
      }
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [orders])

  // Toggle expanded state for an order
  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthModal({
        feature: 'campaigns',
        title: 'Sign in to view your campaign',
      })
      router.push('/')
    }
  }, [isAuthenticated, isLoading, openAuthModal, router])

  useEffect(() => {
    if (isAuthenticated && slug) {
      fetchCampaign()
      fetchStats()
      fetchOrders()
    }
  }, [isAuthenticated, slug])

  async function fetchCampaign() {
    try {
      const response = await fetch(`/api/campaigns/${slug}`)
      if (response.ok) {
        const data = await response.json()
        if (!data.is_owner) {
          router.push('/account/campaigns')
          return
        }
        setCampaign(data)
      } else {
        router.push('/account/campaigns')
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
    } finally {
      setCampaignLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch(`/api/campaigns/${slug}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  async function fetchOrders() {
    try {
      const response = await fetch(`/api/campaigns/${slug}/orders`)
      if (response.ok) {
        const data = await response.json()
        // API returns array of orders for owners
        if (Array.isArray(data)) {
          setOrders(data)
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const campaignUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/c/${slug}`
    : `/c/${slug}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(campaignUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  async function endCampaignEarly() {
    // For organizer_pays campaigns with orders, show payment modal
    if (campaign?.payment_style === 'organizer_pays' && (stats?.total_quantity || 0) > 0) {
      setShowEndCampaignModal(false)
      await initializeOrganizerPayment()
      return
    }
    
    // For everyone_pays campaigns or campaigns with no orders, just close
    setEndingCampaign(true)
    try {
      const response = await fetch(`/api/campaigns/${slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'closed' }),
      })
      
      if (response.ok) {
        // Refresh campaign data
        await fetchCampaign()
        setShowEndCampaignModal(false)
      } else {
        const data = await response.json()
        console.error('Failed to end campaign:', data.error)
        alert('Failed to end campaign. Please try again.')
      }
    } catch (error) {
      console.error('Error ending campaign:', error)
      alert('Failed to end campaign. Please try again.')
    } finally {
      setEndingCampaign(false)
    }
  }

  async function initializeOrganizerPayment() {
    setInitializingPayment(true)
    try {
      const response = await fetch(`/api/campaigns/${slug}/pay`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        setPaymentClientSecret(data.clientSecret)
        setPaymentData({
          amount: data.amount,
          totalQuantity: data.totalQuantity,
          orderCount: data.orderCount,
        })
        setShowPaymentModal(true)
      } else {
        const data = await response.json()
        console.error('Failed to initialize payment:', data.error)
        alert(data.error || 'Failed to initialize payment. Please try again.')
      }
    } catch (error) {
      console.error('Error initializing payment:', error)
      alert('Failed to initialize payment. Please try again.')
    } finally {
      setInitializingPayment(false)
    }
  }

  async function handlePaymentSuccess(paymentIntentId: string) {
    try {
      // Confirm payment and close campaign
      const response = await fetch(`/api/campaigns/${slug}/pay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentIntentId }),
      })
      
      if (response.ok) {
        setShowPaymentModal(false)
        setPaymentClientSecret(null)
        setPaymentData(null)
        // Refresh campaign data
        await fetchCampaign()
        await fetchStats()
      } else {
        const data = await response.json()
        console.error('Failed to confirm payment:', data.error)
        alert('Payment succeeded but failed to close campaign. Please contact support.')
      }
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert('Payment succeeded but failed to close campaign. Please contact support.')
    }
  }

  if (isLoading || campaignLoading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-charcoal-700 mb-4">Campaign not found</h1>
          <Link href="/account/campaigns" className="text-teal-600 font-bold hover:underline">
            View all campaigns
          </Link>
        </div>
      </div>
    )
  }

  const deadline = new Date(campaign.deadline)
  const now = new Date()
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isActive = campaign.status === 'active'
  
  const formattedDeadline = deadline.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Format size breakdown for display (from stats API - only paid orders for everyone_pays)
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
  const sortedSizes = stats?.size_breakdown 
    ? Object.entries(stats.size_breakdown).sort((a, b) => {
        return sizeOrder.indexOf(a[0]) - sizeOrder.indexOf(b[0])
      })
    : []

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="bg-white shadow-soft sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
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
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/account/campaigns"
                  className="text-charcoal-500 hover:text-charcoal-700 font-semibold transition-colors"
                >
                  My Campaigns
                </Link>
                <span className="text-charcoal-300">/</span>
                <span className="text-charcoal-700 font-bold truncate max-w-[200px]">{campaign.name}</span>
              </nav>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-2 rounded-full hover:bg-surface-100 transition-colors"
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
                  <Link
                    href="/account"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50 transition-colors"
                  >
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
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-black text-charcoal-700 tracking-tight">{campaign.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              isActive 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-surface-200 text-charcoal-500'
            }`}>
              {isActive ? 'Active' : 'Closed'}
            </span>
          </div>
          <p className="text-charcoal-500">
            {isActive && daysLeft > 0 
              ? `${daysLeft} days left • Deadline: ${formattedDeadline}`
              : `Deadline was ${formattedDeadline}`
            }
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Link Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6"
            >
              <h2 className="text-lg font-black text-charcoal-700 mb-4">Campaign Link</h2>
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="flex-1 bg-surface-100 rounded-xl px-4 py-3 font-mono text-charcoal-700 text-sm overflow-x-auto">
                  {campaignUrl}
                </div>
                <button
                  onClick={copyLink}
                  className={`px-6 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
              </div>
              <div className="mt-4">
                <Link
                  href={`/c/${slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-teal-600 font-bold text-sm hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View campaign page
                </Link>
              </div>
            </motion.div>

            {/* Size Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6"
            >
              <div className="mb-4">
                <h2 className="text-lg font-black text-charcoal-700">Size Breakdown</h2>
                {campaign.payment_style === 'everyone_pays' && (
                  <p className="text-sm text-charcoal-400 mt-0.5">Paid orders only</p>
                )}
              </div>
              
              {sortedSizes.length === 0 ? (
                <p className="text-charcoal-400 text-center py-8">
                  {campaign.payment_style === 'everyone_pays' ? 'No paid orders yet' : 'No orders yet'}
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedSizes.map(([size, count]) => {
                    const total = stats?.total_quantity || 1
                    const percentage = (count / total) * 100
                    
                    return (
                      <div key={size} className="flex items-center gap-4">
                        <div className="w-12 font-bold text-charcoal-700 text-right">{size}</div>
                        <div className="flex-1 h-8 bg-surface-100 rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-12 text-right font-bold text-charcoal-600">{count}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>

            {/* Orders List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6"
            >
              <div className="mb-5">
                <h2 className="text-lg font-black text-charcoal-700">
                  {campaign.payment_style === 'everyone_pays' ? 'Activity' : 'Orders'} {groupedOrders.length > 0 && <span className="text-charcoal-400 font-medium">({groupedOrders.length})</span>}
                </h2>
                {campaign.payment_style === 'everyone_pays' && groupedOrders.length > 0 && (
                  <p className="text-sm text-charcoal-400 mt-1">
                    {(() => {
                      const paidCount = groupedOrders.filter(g => g.status === 'paid').length
                      const pendingCount = groupedOrders.filter(g => g.status === 'pending').length
                      const parts = []
                      if (paidCount > 0) parts.push(`${paidCount} paid`)
                      if (pendingCount > 0) parts.push(`${pendingCount} awaiting payment`)
                      return parts.join(', ')
                    })()}
                  </p>
                )}
                {campaign.payment_style !== 'everyone_pays' && orders.length > 0 && orders.length !== groupedOrders.length && (
                  <p className="text-sm text-charcoal-400 mt-1">
                    {orders.length} items from {groupedOrders.length} participant{groupedOrders.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              
              {groupedOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-charcoal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-charcoal-500 font-medium">No orders yet</p>
                  <p className="text-charcoal-400 text-sm mt-1">Share your campaign link to start collecting orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedOrders.map((group, index) => {
                    const isExpanded = expandedOrders.has(group.id)
                    const hasMultipleItems = group.items.length > 1
                    const showAllItems = isExpanded || group.items.length <= 3
                    const displayItems = showAllItems ? group.items : group.items.slice(0, 2)
                    const hiddenCount = group.items.length - displayItems.length
                    
                    // Format date
                    const orderDate = new Date(group.created_at)
                    const isToday = new Date().toDateString() === orderDate.toDateString()
                    const formattedDate = isToday 
                      ? `Today at ${orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                      : orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

                    return (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group relative bg-surface-50 hover:bg-surface-100/80 rounded-xl p-4 transition-all duration-200 border border-transparent hover:border-surface-200"
                      >
                        {/* Header Row */}
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                            {group.participant_name.charAt(0).toUpperCase()}
                          </div>
                          
                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-charcoal-700 truncate">
                                {group.participant_name}
                              </span>
                              <span className="relative group/status">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 inline-flex items-center gap-1 cursor-help ${
                                  group.status === 'paid' 
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : group.status === 'confirmed'
                                      ? 'bg-blue-100 text-blue-700'
                                      : group.status === 'cancelled'
                                        ? 'bg-rose-100 text-rose-700'
                                        : group.status === 'mixed'
                                          ? 'bg-purple-100 text-purple-700'
                                          : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {group.status === 'paid' ? 'Paid' : 
                                   group.status === 'confirmed' ? 'Confirmed' :
                                   group.status === 'cancelled' ? 'Cancelled' :
                                   group.status === 'mixed' ? 'Mixed' : 'Awaiting Payment'}
                                  {group.status === 'pending' && (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </span>
                                {group.status === 'pending' && (
                                  <div className="absolute left-0 top-full mt-1 z-10 invisible group-hover/status:visible opacity-0 group-hover/status:opacity-100 transition-all duration-150">
                                    <div className="bg-charcoal-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                      Order placed but not yet paid
                                      <div className="absolute -top-1 left-3 w-2 h-2 bg-charcoal-800 rotate-45"></div>
                                    </div>
                                  </div>
                                )}
                              </span>
                            </div>
                            <div className="text-sm text-charcoal-400 truncate">
                              {group.participant_email}
                            </div>
                            
                            {/* Items */}
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {displayItems.map((item, itemIndex) => (
                                <span 
                                  key={item.id} 
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg text-xs font-medium text-charcoal-600 border border-surface-200 shadow-sm"
                                >
                                  <span className="font-bold text-charcoal-700">{item.size}</span>
                                  <span className="text-charcoal-300">·</span>
                                  <span>{item.color}</span>
                                  {item.quantity > 1 && (
                                    <>
                                      <span className="text-charcoal-300">·</span>
                                      <span className="text-teal-600 font-bold">×{item.quantity}</span>
                                    </>
                                  )}
                                </span>
                              ))}
                              {hiddenCount > 0 && !isExpanded && (
                                <button
                                  onClick={() => toggleOrderExpanded(group.id)}
                                  className="inline-flex items-center px-2.5 py-1 bg-teal-50 hover:bg-teal-100 rounded-lg text-xs font-bold text-teal-600 transition-colors"
                                >
                                  +{hiddenCount} more
                                </button>
                              )}
                            </div>
                            
                            {/* Expanded toggle for many items */}
                            {hasMultipleItems && group.items.length > 3 && isExpanded && (
                              <button
                                onClick={() => toggleOrderExpanded(group.id)}
                                className="mt-2 text-xs font-medium text-charcoal-400 hover:text-charcoal-600 transition-colors"
                              >
                                Show less
                              </button>
                            )}
                          </div>
                          
                          {/* Right Side - Stats */}
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-xs font-medium text-charcoal-400">
                                {group.total_quantity} item{group.total_quantity !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {campaign.payment_style === 'everyone_pays' && group.total_amount_paid > 0 && (
                              <div className="text-sm text-emerald-600 font-bold mt-1">
                                ${group.total_amount_paid.toFixed(2)}
                              </div>
                            )}
                            <div className="text-xs text-charcoal-400 mt-1">
                              {formattedDate}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl shadow-xl p-6 text-white"
            >
              <h2 className="text-lg font-bold text-white/90 mb-4">Campaign Stats</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="text-4xl font-black">{stats?.order_count || 0}</div>
                  <div className="text-white/80 font-medium">
                    {campaign.payment_style === 'everyone_pays' ? 'Paid orders' : 'Orders placed'}
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black">{stats?.total_quantity || 0}</div>
                  <div className="text-white/80 font-medium">
                    {campaign.payment_style === 'everyone_pays' ? 'Shirts ordered' : 'Total shirts'}
                  </div>
                </div>
                {campaign.payment_style === 'everyone_pays' && stats?.total_revenue !== undefined && (
                  <div>
                    <div className="text-4xl font-black">${stats.total_revenue.toFixed(2)}</div>
                    <div className="text-white/80 font-medium">Revenue collected</div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Campaign Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6"
            >
              <h2 className="text-lg font-black text-charcoal-700 mb-4">Details</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-charcoal-500">Payment</span>
                  <span className="font-bold text-charcoal-700">
                    {campaign.payment_style === 'organizer_pays' ? 'You pay' : 'Everyone pays'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-500">Price/shirt</span>
                  <span className="font-bold text-charcoal-700">${campaign.price_per_shirt?.toFixed(2)}</span>
                </div>
              </div>
              
              {/* End Campaign Button - only show for active campaigns */}
              {isActive && (
                <button
                  onClick={() => setShowEndCampaignModal(true)}
                  className="mt-6 w-full py-2.5 px-4 text-sm font-semibold text-charcoal-500 hover:text-charcoal-700 bg-surface-100 hover:bg-surface-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  End Campaign Early
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* End Campaign Confirmation Modal */}
      <AnimatePresence>
        {showEndCampaignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !endingCampaign && !initializingPayment && setShowEndCampaignModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-charcoal-700">End Campaign Early?</h3>
                  <p className="text-sm text-charcoal-500">This action cannot be undone</p>
                </div>
              </div>
              
              {campaign?.payment_style === 'organizer_pays' && (stats?.total_quantity || 0) > 0 ? (
                <div className="mb-6">
                  <p className="text-charcoal-600 mb-4">
                    This will close the campaign and prevent new orders. You'll need to pay for the {stats?.total_quantity} shirt{(stats?.total_quantity || 0) !== 1 ? 's' : ''} ordered.
                  </p>
                  <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                    <div className="flex justify-between items-center">
                      <span className="text-charcoal-600 font-medium">Total to pay</span>
                      <span className="text-2xl font-black text-charcoal-800">
                        ${((campaign?.price_per_shirt || 0) * (stats?.total_quantity || 0)).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-500 mt-1">
                      {stats?.total_quantity} shirts × ${campaign?.price_per_shirt?.toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-charcoal-600 mb-6">
                  This will close the campaign and prevent new orders. Existing orders will remain intact.
                </p>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndCampaignModal(false)}
                  disabled={endingCampaign || initializingPayment}
                  className="flex-1 py-3 px-4 font-bold text-charcoal-600 bg-surface-100 hover:bg-surface-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={endCampaignEarly}
                  disabled={endingCampaign || initializingPayment}
                  className={`flex-1 py-3 px-4 font-bold text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    campaign?.payment_style === 'organizer_pays' && (stats?.total_quantity || 0) > 0
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600'
                      : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {endingCampaign || initializingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {initializingPayment ? 'Loading...' : 'Ending...'}
                    </>
                  ) : campaign?.payment_style === 'organizer_pays' && (stats?.total_quantity || 0) > 0 ? (
                    'Continue to Payment'
                  ) : (
                    'End Campaign'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Organizer Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && paymentClientSecret && paymentData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-charcoal-700">Complete Payment</h3>
                <p className="text-charcoal-500 mt-1">Pay for your campaign orders</p>
              </div>
              
              {/* Order Summary */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-charcoal-600 font-medium">Campaign</span>
                  <span className="font-bold text-charcoal-700">{campaign?.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-charcoal-600 font-medium">Orders</span>
                  <span className="font-bold text-charcoal-700">{paymentData.orderCount}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-charcoal-600 font-medium">Total shirts</span>
                  <span className="font-bold text-charcoal-700">{paymentData.totalQuantity}</span>
                </div>
                <div className="border-t border-teal-200 mt-3 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal-700 font-bold">Total</span>
                    <span className="text-3xl font-black text-charcoal-800">${paymentData.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Stripe Payment Form */}
              <Elements stripe={stripePromise} options={{ clientSecret: paymentClientSecret }}>
                <OrganizerPaymentForm
                  slug={slug}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => {
                    setShowPaymentModal(false)
                    setPaymentClientSecret(null)
                    setPaymentData(null)
                  }}
                  amount={paymentData.amount}
                />
              </Elements>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Payment form component for organizer payment
function OrganizerPaymentForm({ 
  slug, 
  onSuccess, 
  onCancel,
  amount 
}: { 
  slug: string
  onSuccess: (paymentIntentId: string) => void
  onCancel: () => void
  amount: number 
}) {
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
      onSuccess(paymentIntent.id)
    } else {
      setError('Payment was not completed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <PaymentElement />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 py-3 px-4 font-bold text-charcoal-600 bg-surface-100 hover:bg-surface-200 rounded-xl transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-1 py-3 px-4 font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            `Pay $${amount.toFixed(2)}`
          )}
        </button>
      </div>

      <p className="text-center text-xs text-charcoal-400 mt-4">
        Your payment is secure and encrypted via Stripe.
      </p>
    </form>
  )
}

