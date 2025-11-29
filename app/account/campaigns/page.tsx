'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { Campaign } from '@/types'

type TabType = 'active' | 'past' | 'deleted'

export default function CampaignsListPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, customer, user, openAuthModal, signOut } = useCustomerAuth()
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('active')
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    campaign: Campaign | null
    refundOrders: boolean
    isDeleting: boolean
  }>({
    isOpen: false,
    campaign: null,
    refundOrders: false,
    isDeleting: false,
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthModal({
        feature: 'campaigns',
        title: 'Sign in to view your campaigns',
        message: 'Manage your group campaigns and track orders.',
      })
      router.push('/')
    }
  }, [isAuthenticated, isLoading, openAuthModal, router])

  const fetchCampaigns = useCallback(async () => {
    try {
      // Fetch all campaigns including deleted ones
      const response = await fetch('/api/campaigns')
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data)
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setCampaignsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchCampaigns()
    }
  }, [isAuthenticated, fetchCampaigns])

  const handleDeleteClick = (campaign: Campaign, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteModal({
      isOpen: true,
      campaign,
      refundOrders: false,
      isDeleting: false,
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.campaign) return
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true }))
    
    try {
      const params = new URLSearchParams()
      if (deleteModal.refundOrders) {
        params.set('refund_orders', 'true')
      }
      
      const response = await fetch(
        `/api/campaigns/${deleteModal.campaign.slug}?${params.toString()}`,
        { method: 'DELETE' }
      )
      
      if (response.ok) {
        // Refresh campaigns list
        await fetchCampaigns()
        setDeleteModal({
          isOpen: false,
          campaign: null,
          refundOrders: false,
          isDeleting: false,
        })
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete campaign')
        setDeleteModal(prev => ({ ...prev, isDeleting: false }))
      }
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('An error occurred while deleting the campaign')
      setDeleteModal(prev => ({ ...prev, isDeleting: false }))
    }
  }

  const handleRestoreCampaign = async (campaign: Campaign, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      const response = await fetch(`/api/campaigns/${campaign.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })
      
      if (response.ok) {
        await fetchCampaigns()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to restore campaign')
      }
    } catch (error) {
      console.error('Error restoring campaign:', error)
      alert('An error occurred while restoring the campaign')
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  // Filter campaigns by tab
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const pastCampaigns = campaigns.filter(c => c.status === 'closed' || c.status === 'completed')
  const deletedCampaigns = campaigns.filter(c => c.status === 'deleted')

  const getTabCampaigns = () => {
    switch (activeTab) {
      case 'active':
        return activeCampaigns
      case 'past':
        return pastCampaigns
      case 'deleted':
        return deletedCampaigns
    }
  }

  const tabCampaigns = getTabCampaigns()

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
                  href="/account"
                  className="text-charcoal-500 hover:text-charcoal-700 font-semibold transition-colors"
                >
                  Account
                </Link>
                <span className="text-charcoal-300">/</span>
                <span className="text-charcoal-700 font-bold">My Campaigns</span>
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
                  <div className="px-4 py-2 border-b border-surface-100">
                    <p className="text-sm font-bold text-charcoal-700 truncate">
                      {customer?.name || 'Welcome!'}
                    </p>
                    <p className="text-xs text-charcoal-400 truncate">{customer?.email || user?.email}</p>
                  </div>
                  
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-charcoal-700 tracking-tight">My Campaigns</h1>
            <p className="text-charcoal-500 mt-1">Manage your group campaigns and track orders</p>
          </div>
          <Link
            href="/custom-shirts/configure?mode=campaign"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-fuchsia-600 shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Campaign
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-100 rounded-xl mb-6 w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'active'
                ? 'bg-white text-charcoal-700 shadow-sm'
                : 'text-charcoal-500 hover:text-charcoal-700'
            }`}
          >
            Active
            {activeCampaigns.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">
                {activeCampaigns.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'past'
                ? 'bg-white text-charcoal-700 shadow-sm'
                : 'text-charcoal-500 hover:text-charcoal-700'
            }`}
          >
            Past
            {pastCampaigns.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-surface-200 text-charcoal-500 rounded-full">
                {pastCampaigns.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'deleted'
                ? 'bg-white text-charcoal-700 shadow-sm'
                : 'text-charcoal-500 hover:text-charcoal-700'
            }`}
          >
            Deleted
            {deletedCampaigns.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-rose-100 text-rose-600 rounded-full">
                {deletedCampaigns.length}
              </span>
            )}
          </button>
        </div>

        {campaignsLoading ? (
          <div className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto mb-4"></div>
            <p className="text-charcoal-500">Loading campaigns...</p>
          </div>
        ) : tabCampaigns.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'deleted' ? (
                <svg className="w-8 h-8 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
            <h3 className="text-xl font-black text-charcoal-700 mb-2">
              {activeTab === 'active' && 'No active campaigns'}
              {activeTab === 'past' && 'No past campaigns'}
              {activeTab === 'deleted' && 'No deleted campaigns'}
            </h3>
            <p className="text-charcoal-500 mb-6">
              {activeTab === 'active' && 'Create your first group campaign to let everyone pick their own size.'}
              {activeTab === 'past' && 'Your completed campaigns will appear here.'}
              {activeTab === 'deleted' && 'Deleted campaigns will appear here for 30 days.'}
            </p>
            {activeTab === 'active' && (
              <Link
                href="/custom-shirts/configure?mode=campaign"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-fuchsia-600 transition-all"
              >
                Start a Group Campaign
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {tabCampaigns.map((campaign, index) => (
                <CampaignCard 
                  key={campaign.id} 
                  campaign={campaign} 
                  index={index}
                  isDeleted={activeTab === 'deleted'}
                  onDelete={handleDeleteClick}
                  onRestore={handleRestoreCampaign}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && deleteModal.campaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => !deleteModal.isDeleting && setDeleteModal(prev => ({ ...prev, isOpen: false }))}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-charcoal-700">Delete Campaign</h3>
                  <p className="text-sm text-charcoal-500">This action can be undone later</p>
                </div>
              </div>

              <div className="bg-surface-50 rounded-xl p-4 mb-4">
                <p className="font-bold text-charcoal-700 mb-1">{deleteModal.campaign.name}</p>
                <p className="text-sm text-charcoal-500">
                  {deleteModal.campaign.order_count || 0} order{(deleteModal.campaign.order_count || 0) !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Show refund option if there are paid orders */}
              {deleteModal.campaign.payment_style === 'everyone_pays' && 
               (deleteModal.campaign.paid_order_count || 0) > 0 && (
                <div className="mb-4">
                  <label className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteModal.refundOrders}
                      onChange={e => setDeleteModal(prev => ({ ...prev, refundOrders: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                    />
                    <div>
                      <p className="font-bold text-amber-800">Refund paid orders</p>
                      <p className="text-sm text-amber-700">
                        {deleteModal.campaign.paid_order_count} paid order{(deleteModal.campaign.paid_order_count || 0) !== 1 ? 's' : ''} totaling ${(deleteModal.campaign.total_paid || 0).toFixed(2)} will be refunded via Stripe.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <p className="text-sm text-charcoal-500 mb-6">
                The campaign will be moved to the Deleted tab. You can restore it later if needed.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={deleteModal.isDeleting}
                  className="flex-1 px-4 py-2.5 border border-surface-300 text-charcoal-600 font-semibold rounded-xl hover:bg-surface-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteModal.isDeleting}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteModal.isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Campaign'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface CampaignCardProps {
  campaign: Campaign
  index: number
  isDeleted: boolean
  onDelete: (campaign: Campaign, e: React.MouseEvent) => void
  onRestore: (campaign: Campaign, e: React.MouseEvent) => void
}

function CampaignCard({ campaign, index, isDeleted, onDelete, onRestore }: CampaignCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const deadline = new Date(campaign.deadline)
  const now = new Date()
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isActive = campaign.status === 'active'
  
  const formattedDeadline = deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const getStatusBadge = () => {
    if (isDeleted) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-600">
          Deleted
        </span>
      )
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
        isActive 
          ? 'bg-emerald-100 text-emerald-700' 
          : 'bg-surface-100 text-charcoal-500'
      }`}>
        {isActive ? 'Active' : 'Closed'}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className="relative group"
    >
      <Link
        href={isDeleted ? '#' : `/account/campaigns/${campaign.slug}`}
        className={`block bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6 transition-all ${
          isDeleted 
            ? 'opacity-75 cursor-default' 
            : 'hover:shadow-lg hover:border-violet-200'
        }`}
        onClick={isDeleted ? (e) => e.preventDefault() : undefined}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Campaign Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-lg font-black ${isDeleted ? 'text-charcoal-500' : 'text-charcoal-700'}`}>
                {campaign.name}
              </h3>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-4 text-sm text-charcoal-500">
              <span>Deadline: {formattedDeadline}</span>
              {isActive && daysLeft > 0 && (
                <span className="font-bold text-violet-600">{daysLeft} days left</span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-2xl font-black ${isDeleted ? 'text-charcoal-500' : 'text-charcoal-700'}`}>
                {campaign.order_count || 0}
              </div>
              <div className="text-xs text-charcoal-400 font-medium">Orders</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-black ${isDeleted ? 'text-charcoal-500' : 'text-charcoal-700'}`}>
                {campaign.payment_style === 'organizer_pays' ? '👤' : '👥'}
              </div>
              <div className="text-xs text-charcoal-400 font-medium">
                {campaign.payment_style === 'organizer_pays' ? 'You pay' : 'Split'}
              </div>
            </div>
            
            {/* Action Buttons */}
            {isDeleted ? (
              <button
                onClick={(e) => onRestore(campaign, e)}
                className="px-4 py-2 text-sm font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                Restore
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowMenu(!showMenu)
                  }}
                  className="p-2 text-charcoal-400 hover:text-charcoal-600 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowMenu(false)
                      }}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-surface-200 py-1 z-20">
                      <Link
                        href={`/account/campaigns/${campaign.slug}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-charcoal-600 hover:bg-surface-50 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </Link>
                      <button
                        onClick={(e) => {
                          setShowMenu(false)
                          onDelete(campaign, e)
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {!isDeleted && (
              <svg className="w-5 h-5 text-charcoal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
