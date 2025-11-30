'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { useOrderStore } from '@/lib/store/orderStore'
import { OrderDraft } from '@/types'

export default function AccountPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, customer, user, signOut, openAuthModal } = useCustomerAuth()
  const { loadDraft } = useOrderStore()
  
  const [drafts, setDrafts] = useState<OrderDraft[]>([])
  const [draftsLoading, setDraftsLoading] = useState(true)
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthModal({
        feature: 'view_orders',
        title: 'Sign in to view your account',
        message: 'Access your saved designs, order history, and account settings.',
      })
      router.push('/')
    }
  }, [isAuthenticated, isLoading, openAuthModal, router])

  // Fetch drafts when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDrafts()
    }
  }, [isAuthenticated])

  async function fetchDrafts() {
    try {
      const response = await fetch('/api/order-drafts')
      if (response.ok) {
        const data = await response.json()
        console.log('[fetchDrafts] Drafts from API:', data)
        setDrafts(data)
      }
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setDraftsLoading(false)
    }
  }

  async function handleDeleteDraft(draftId: string) {
    setDeletingDraftId(draftId)
    try {
      const response = await fetch(`/api/order-drafts/${draftId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setDrafts(drafts.filter(d => d.id !== draftId))
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
    } finally {
      setDeletingDraftId(null)
    }
  }

  function handleContinueDraft(draft: OrderDraft) {
    console.log('[handleContinueDraft] Draft data:', {
      id: draft.id,
      garment_id: draft.garment_id,
      selected_garments: draft.selected_garments,
      selected_colors: draft.selected_colors,
      color_size_quantities: draft.color_size_quantities,
      print_config: draft.print_config,
      artwork_file_records: draft.artwork_file_records,
    })
    
    loadDraft(draft)
    
    // Check if this is a multi-garment draft
    const hasMultiGarmentSelection = draft.selected_garments && 
      Object.keys(draft.selected_garments).length > 0
    
    // Determine where the user left off based on draft state
    if (!draft.garment_id && !hasMultiGarmentSelection) {
      // No garment selected - go to garment selection
      console.log('[handleContinueDraft] No garment selection, redirecting to configure')
      router.push('/custom-shirts/configure')
      return
    }
    
    // Check if user has started filling checkout info (name, email, or shipping address)
    const hasCheckoutInfo = (draft.customer_name && draft.customer_name.trim().length > 0) ||
      (draft.email && draft.email.trim().length > 0) ||
      (draft.shipping_address && draft.shipping_address.line1)
    
    // Check if user has artwork or text description
    const hasArtwork = draft.artwork_file_records && 
      Object.values(draft.artwork_file_records).some(record => record !== null)
    const hasTextDescription = draft.text_description && draft.text_description.trim().length > 0
    
    // For multi-garment orders, use the non-garment-specific routes
    if (hasMultiGarmentSelection) {
      if (hasCheckoutInfo && (hasArtwork || hasTextDescription)) {
        console.log('[handleContinueDraft] Multi-garment: resuming at checkout')
        router.push('/custom-shirts/configure/checkout')
        return
      }
      
      if (hasArtwork || hasTextDescription) {
        console.log('[handleContinueDraft] Multi-garment: resuming at artwork')
        router.push('/custom-shirts/configure/artwork')
        return
      }
      
      // Check if any garment has colors and quantities configured
      const hasGarmentConfig = Object.values(draft.selected_garments!).some(selection => 
        selection.selectedColors && selection.selectedColors.length > 0 &&
        Object.values(selection.colorSizeQuantities).some(sizeQty =>
          Object.values(sizeQty).some(qty => (qty as number) > 0)
        )
      )
      const hasPrintLocations = draft.print_config?.locations && 
        Object.values(draft.print_config.locations).some(loc => loc?.enabled)
      
      if (hasGarmentConfig && hasPrintLocations) {
        console.log('[handleContinueDraft] Multi-garment: configuration complete, going to artwork')
        router.push('/custom-shirts/configure/artwork')
        return
      }
      
      // Has garments selected but not fully configured - go to colors page
      console.log('[handleContinueDraft] Multi-garment: resuming at colors')
      router.push('/custom-shirts/configure/colors')
      return
    }
    
    // Legacy single-garment flow
    if (hasCheckoutInfo && (hasArtwork || hasTextDescription)) {
      // User was on checkout page
      router.push(`/custom-shirts/configure/${draft.garment_id}/checkout`)
      return
    }
    
    if (hasArtwork || hasTextDescription) {
      // User was on artwork page
      router.push(`/custom-shirts/configure/${draft.garment_id}/artwork`)
      return
    }
    
    // Check if user has completed configuration (colors, quantities, print locations)
    const hasColors = draft.selected_colors && draft.selected_colors.length > 0
    const hasQuantities = draft.color_size_quantities && 
      Object.values(draft.color_size_quantities).some(sizeQty => 
        Object.values(sizeQty).some(qty => (qty as number) > 0)
      )
    const hasPrintLocations = draft.print_config?.locations && 
      Object.values(draft.print_config.locations).some(loc => loc?.enabled)
    
    if (hasColors && hasQuantities && hasPrintLocations) {
      // User completed configuration - go to artwork page
      router.push(`/custom-shirts/configure/${draft.garment_id}/artwork`)
      return
    }
    
    // Otherwise go to the configure page
    router.push(`/custom-shirts/configure/${draft.garment_id}`)
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  function getTotalQuantity(draft: OrderDraft): number {
    let total = 0
    
    // Check multi-garment selection first
    if (draft.selected_garments && Object.keys(draft.selected_garments).length > 0) {
      Object.values(draft.selected_garments).forEach(garmentSelection => {
        Object.values(garmentSelection.colorSizeQuantities).forEach(sizeQty => {
          Object.values(sizeQty).forEach(qty => {
            total += (qty as number) || 0
          })
        })
      })
      return total
    }
    
    // Fall back to legacy single-garment quantities
    if (draft.color_size_quantities) {
      Object.values(draft.color_size_quantities).forEach(sizeQty => {
        Object.values(sizeQty).forEach(qty => {
          total += (qty as number) || 0
        })
      })
    }
    return total
  }
  
  function getTotalColors(draft: OrderDraft): number {
    // Check multi-garment selection first
    if (draft.selected_garments && Object.keys(draft.selected_garments).length > 0) {
      const allColors = new Set<string>()
      Object.values(draft.selected_garments).forEach(garmentSelection => {
        garmentSelection.selectedColors?.forEach(color => allColors.add(color))
      })
      return allColors.size
    }
    
    // Fall back to legacy
    return draft.selected_colors?.length || 0
  }
  
  function getGarmentCount(draft: OrderDraft): number {
    if (draft.selected_garments && Object.keys(draft.selected_garments).length > 0) {
      return Object.keys(draft.selected_garments).length
    }
    return draft.garment_id ? 1 : 0
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/custom-shirts/configure" className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="My Swag Co" 
                width={120} 
                height={36}
                className="h-8 w-auto"
              />
            </Link>
            
            <div className="flex items-center gap-4">
              <Link
                href="/custom-shirts"
                className="text-sm font-bold text-charcoal-600 hover:text-primary-600 transition-colors"
              >
                Shop
              </Link>
              <div className="h-4 w-px bg-surface-300" />
              <div className="flex items-center gap-2">
                {customer?.avatar_url ? (
                  <img 
                    src={customer.avatar_url} 
                    alt={customer?.name || 'Avatar'} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {(customer?.name || customer?.email || user?.email)?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-sm font-bold text-charcoal-700 hidden sm:block">
                  {customer?.name || customer?.email || user?.email?.split('@')[0] || 'Account'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-charcoal-700 tracking-tight">My Account</h1>
          <p className="text-charcoal-500 mt-2">Manage your designs, orders, and settings</p>
        </div>

        {/* Continue Your Order Section */}
        {!draftsLoading && drafts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black text-charcoal-700">Continue Your Order</h2>
                <p className="text-sm text-charcoal-500">Pick up where you left off</p>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => {
                const garment = draft.garment
                const totalQty = getTotalQuantity(draft)
                const colorCount = getTotalColors(draft)
                const garmentCount = getGarmentCount(draft)
                
                return (
                  <div
                    key={draft.id}
                    className="bento-card group relative overflow-hidden"
                  >
                    {/* Draft badge */}
                    <div className="absolute top-3 right-3 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                      Draft
                    </div>
                    
                    <div className="flex gap-4">
                      {/* Garment thumbnail */}
                      <div className="w-20 h-20 rounded-xl bg-surface-100 flex-shrink-0 overflow-hidden">
                        {garment?.thumbnail_url ? (
                          <img 
                            src={garment.thumbnail_url} 
                            alt={garment.name || 'Garment'} 
                            className="w-full h-full object-cover"
                          />
                        ) : garment?.color_images && draft.selected_colors?.[0] && garment.color_images[draft.selected_colors[0]] ? (
                          <img 
                            src={garment.color_images[draft.selected_colors[0]]} 
                            alt={garment.name || 'Garment'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Draft info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-charcoal-700 truncate">
                          {draft.name || garment?.name || 'Untitled Order'}
                        </h3>
                        {garment && (
                          <p className="text-sm text-charcoal-400 font-medium">{garment.brand}</p>
                        )}
                        
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {garmentCount > 1 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 rounded-full text-primary-700 font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              {garmentCount} style{garmentCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {colorCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-100 rounded-full text-charcoal-600 font-medium">
                              <span className="w-2 h-2 rounded-full bg-gradient-to-br from-pink-400 to-teal-400"></span>
                              {colorCount} color{colorCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {totalQty > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-100 rounded-full text-charcoal-600 font-medium">
                              {totalQty} item{totalQty > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Last updated */}
                    <p className="text-xs text-charcoal-400 mt-3">
                      Last edited {formatDate(draft.updated_at)}
                    </p>
                    
                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleContinueDraft(draft)}
                        className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-sm"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        disabled={deletingDraftId === draft.id}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-surface-200 hover:border-rose-300 hover:bg-rose-50 text-charcoal-400 hover:text-rose-600 transition-all disabled:opacity-50"
                        title="Delete draft"
                      >
                        {deletingDraftId === draft.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/account/designs" className="bento-card hover:shadow-bento transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-charcoal-700 text-lg">My Designs</h3>
                <p className="text-sm text-charcoal-500">Saved artwork & AI creations</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-primary-600 font-bold text-sm">
              View all
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/account/orders" className="bento-card hover:shadow-bento transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-charcoal-700 text-lg">Order History</h3>
                <p className="text-sm text-charcoal-500">Track and view past orders</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-primary-600 font-bold text-sm">
              View all
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/account/campaigns" className="bento-card hover:shadow-bento transition-all group relative overflow-hidden">
            <span className="absolute top-3 right-3 px-2 py-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-[10px] font-black rounded-full">
              NEW
            </span>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-charcoal-700 text-lg">My Campaigns</h3>
                <p className="text-sm text-charcoal-500">Group orders & shared links</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-teal-600 font-bold text-sm">
              Manage
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/account/settings" className="bento-card hover:shadow-bento transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-charcoal-700 text-lg">Settings</h3>
                <p className="text-sm text-charcoal-500">Profile & shipping info</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-primary-600 font-bold text-sm">
              Manage
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bento-card">
          <h2 className="text-xl font-black text-charcoal-700 mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/custom-shirts"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-surface-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="font-bold text-charcoal-700">Start New Order</span>
            </Link>

            <Link
              href="/account/designs"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-surface-200 hover:border-pink-300 hover:bg-pink-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-bold text-charcoal-700">Upload Artwork</span>
            </Link>

            <Link
              href="/account/orders"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-surface-200 hover:border-teal-300 hover:bg-teal-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="font-bold text-charcoal-700">Track Order</span>
            </Link>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-surface-200 hover:border-rose-300 hover:bg-rose-50 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="font-bold text-charcoal-700">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
