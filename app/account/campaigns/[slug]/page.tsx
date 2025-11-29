'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { Campaign, CampaignOrder, CampaignStats } from '@/types'

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

  if (isLoading || campaignLoading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-charcoal-700 mb-4">Campaign not found</h1>
          <Link href="/account/campaigns" className="text-violet-600 font-bold hover:underline">
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

  // Format size breakdown for display
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm">
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
                      : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600'
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
                  className="inline-flex items-center gap-2 text-violet-600 font-bold text-sm hover:underline"
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
              <h2 className="text-lg font-black text-charcoal-700 mb-4">Size Breakdown</h2>
              
              {sortedSizes.length === 0 ? (
                <p className="text-charcoal-400 text-center py-8">No orders yet</p>
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
                            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-lg transition-all duration-500"
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
              <h2 className="text-lg font-black text-charcoal-700 mb-4">
                Orders {orders.length > 0 && <span className="text-charcoal-400 font-medium">({orders.length})</span>}
              </h2>
              
              {orders.length === 0 ? (
                <p className="text-charcoal-400 text-center py-8">No orders yet</p>
              ) : (
                <div className="divide-y divide-surface-200">
                  {orders.map((order) => (
                    <div key={order.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-charcoal-700">{order.participant_name}</div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              order.status === 'paid' 
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.status === 'confirmed'
                                  ? 'bg-blue-100 text-blue-700'
                                  : order.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                            }`}>
                              {order.status === 'paid' ? 'Paid' : 
                               order.status === 'confirmed' ? 'Confirmed' :
                               order.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                            </span>
                          </div>
                          <div className="text-sm text-charcoal-500 mt-1">
                            {order.participant_email}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-surface-100 rounded-lg font-bold text-charcoal-700">
                              {order.size}
                            </span>
                            {order.color && (
                              <span className="px-3 py-1 bg-surface-100 rounded-lg font-medium text-charcoal-600 text-sm">
                                {order.color}
                              </span>
                            )}
                            {order.quantity > 1 && (
                              <span className="text-charcoal-500 text-sm">×{order.quantity}</span>
                            )}
                          </div>
                          {campaign.payment_style === 'everyone_pays' && order.amount_paid > 0 && (
                            <div className="text-sm text-emerald-600 font-medium mt-1">
                              ${order.amount_paid.toFixed(2)} paid
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
              className="bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl shadow-xl p-6 text-white"
            >
              <h2 className="text-lg font-bold text-white/90 mb-4">Campaign Stats</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="text-4xl font-black">{stats?.order_count || 0}</div>
                  <div className="text-white/80 font-medium">Orders placed</div>
                </div>
                <div>
                  <div className="text-4xl font-black">{stats?.total_quantity || 0}</div>
                  <div className="text-white/80 font-medium">Total shirts</div>
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
                <div className="flex justify-between">
                  <span className="text-charcoal-500">Colors</span>
                  <span className="font-bold text-charcoal-700">{campaign.selected_colors?.length || 0}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

