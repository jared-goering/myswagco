'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Campaign, Garment, ArtworkTransform, CampaignGarmentConfig, PrintLocation } from '@/types'
import dynamic from 'next/dynamic'

// Dynamically import the Konva-based renderer (no SSR since Konva needs window)
const CampaignMockupRenderer = dynamic(
  () => import('@/components/CampaignMockupRenderer'),
  { 
    ssr: false, 
    loading: () => <div className="w-full aspect-[500/550] bg-surface-100 animate-pulse rounded-t-3xl" /> 
  }
)

export default function PublicCampaignPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedGarmentId, setSelectedGarmentId] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'front' | 'back'>('front')
  
  // Fetch campaign data
  useEffect(() => {
    async function fetchCampaign() {
      try {
        const response = await fetch(`/api/campaigns/${slug}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Campaign not found')
          } else {
            setError('Failed to load campaign')
          }
          return
        }
        const data = await response.json()
        setCampaign(data)
        
        // Set initial selected garment (first one)
        if (data.garments && data.garments.length > 0) {
          setSelectedGarmentId(data.garments[0].id)
        }
      } catch (err) {
        console.error('Error fetching campaign:', err)
        setError('Failed to load campaign')
      } finally {
        setLoading(false)
      }
    }
    
    fetchCampaign()
  }, [slug])
  
  // Reset color when garment changes if current color isn't available
  // This must be placed before early returns to satisfy React hooks rules
  useEffect(() => {
    if (!campaign) return
    
    const garmentConfigs = campaign.garment_configs || {}
    const garments = campaign.garments || []
    const selectedGarmentConfig = selectedGarmentId 
      ? garmentConfigs[selectedGarmentId] 
      : (garmentConfigs[garments[0]?.id] || { price: campaign.price_per_shirt, colors: campaign.selected_colors })
    const availableColors = selectedGarmentConfig?.colors || campaign.selected_colors || []
    
    if (selectedGarmentId && selectedColor && !availableColors.includes(selectedColor)) {
      setSelectedColor(null)
    }
  }, [selectedGarmentId, selectedColor, campaign])
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-charcoal-500 font-medium">Loading campaign...</p>
        </div>
      </div>
    )
  }
  
  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-charcoal-700 mb-2">{error || 'Campaign not found'}</h1>
          <p className="text-charcoal-500 mb-6">This campaign may have been removed or the link is incorrect.</p>
          <Link href="/" className="text-teal-600 font-bold hover:underline">
            Go to homepage
          </Link>
        </div>
      </div>
    )
  }
  
  // Calculate deadline info
  const deadline = new Date(campaign.deadline)
  const now = new Date()
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysLeft <= 0 || campaign.status === 'closed'
  
  const formattedDeadline = deadline.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
  
  // Multi-garment support
  const garments = campaign.garments || []
  const isMultiGarment = garments.length > 1
  const garmentConfigs = campaign.garment_configs || {}
  
  // Get the currently selected garment (or fall back to legacy single garment)
  const selectedGarment = selectedGarmentId 
    ? garments.find(g => g.id === selectedGarmentId) 
    : (garments[0] || campaign.garment as Garment | undefined)
  
  // Get config for selected garment
  const selectedGarmentConfig = selectedGarmentId 
    ? garmentConfigs[selectedGarmentId] 
    : (garmentConfigs[garments[0]?.id] || { price: campaign.price_per_shirt, colors: campaign.selected_colors })
  
  // Get colors available for the selected garment
  // For multi-garment campaigns, only show colors from the selected garment's config
  // For single-garment campaigns, show all selected colors
  const selectedGarmentColorImages = selectedGarment?.color_images || {}
  const configColors = selectedGarmentConfig?.colors || campaign.selected_colors || []
  // Filter to colors that have images in the selected garment
  const availableColors = configColors.filter(color => selectedGarmentColorImages[color])
  const firstColor = availableColors[0]
  const activeColor = selectedColor && availableColors.includes(selectedColor) ? selectedColor : firstColor
  
  // Determine available artwork views (front/back)
  const artworkUrls = campaign.artwork_urls || {}
  const hasFrontArtwork = !!artworkUrls['front']
  const hasBackArtwork = !!artworkUrls['back']
  const hasMultipleViews = hasFrontArtwork && hasBackArtwork
  
  // Get artwork for the selected view
  // If selectedView doesn't have artwork, fall back to the other view
  const artworkLocation = selectedView === 'back' && hasBackArtwork ? 'back' 
    : hasFrontArtwork ? 'front' 
    : hasBackArtwork ? 'back' 
    : 'front'
  const artworkUrl = artworkUrls[artworkLocation] || null
  
  // Get the transform for this artwork
  const artworkTransform = campaign.artwork_transforms?.[artworkLocation] as ArtworkTransform | undefined
  
  // Generate a unique key for the mockup to force re-render when garment/color/view changes
  const imageKey = `${selectedGarmentId || 'default'}-${activeColor || 'default'}-${artworkLocation}`
  
  // Calculate price range for multi-garment campaigns
  const priceRange = isMultiGarment 
    ? {
        min: Math.min(...Object.values(garmentConfigs).map((c: CampaignGarmentConfig) => c.price)),
        max: Math.max(...Object.values(garmentConfigs).map((c: CampaignGarmentConfig) => c.price)),
      }
    : null
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-surface-200 py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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
          <div className="text-sm text-charcoal-500">
            <span className="font-medium">Powered by </span>
            <span className="font-bold text-charcoal-700">My Swag Co</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="sticky top-24"
          >
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              {/* Front/Back Toggle - only show if campaign has both */}
              {hasMultipleViews && (
                <div className="flex justify-center gap-2 p-3 bg-surface-50 border-b border-surface-200">
                  <button
                    onClick={() => setSelectedView('front')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedView === 'front'
                        ? 'bg-white text-charcoal-700 shadow-md ring-2 ring-teal-200'
                        : 'text-charcoal-500 hover:bg-white/50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l3 2h8l3-2 2 2-1 3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V8L3 5l2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5a3 3 0 006 0" />
                    </svg>
                    Front
                  </button>
                  <button
                    onClick={() => setSelectedView('back')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedView === 'back'
                        ? 'bg-white text-charcoal-700 shadow-md ring-2 ring-teal-200'
                        : 'text-charcoal-500 hover:bg-white/50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l3 2h8l3-2 2 2-1 3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V8L3 5l2-2z" />
                      <rect x="9" y="5" width="6" height="2" rx="0.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                    Back
                  </button>
                </div>
              )}
              
              {/* Mockup rendered using same Konva approach as design editor */}
              <div key={imageKey} className="w-full overflow-hidden">
                <CampaignMockupRenderer
                  garment={selectedGarment || null}
                  activeColor={activeColor || ''}
                  artworkUrl={artworkUrl}
                  transform={artworkTransform || null}
                  location={(artworkLocation as PrintLocation) || 'front'}
                />
              </div>
              
              {/* Style selector for multi-garment campaigns */}
              {isMultiGarment && (
                <div className="p-4 border-t border-surface-200">
                  <p className="text-sm font-bold text-charcoal-600 mb-3">Available Styles</p>
                  <div className="grid grid-cols-2 gap-2">
                    {garments.map(garment => {
                      const isSelected = garment.id === selectedGarmentId
                      const config = garmentConfigs[garment.id]
                      return (
                        <button
                          key={garment.id}
                          onClick={() => setSelectedGarmentId(garment.id)}
                          className={`p-3 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-400 ring-2 ring-teal-200'
                              : 'bg-surface-50 border-2 border-transparent hover:border-surface-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {garment.thumbnail_url && (
                              <div className="w-12 h-12 relative rounded-lg overflow-hidden flex-shrink-0 bg-surface-100">
                                <Image
                                  src={garment.thumbnail_url}
                                  alt={garment.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className={`font-bold text-sm truncate ${isSelected ? 'text-teal-700' : 'text-charcoal-700'}`}>
                                {garment.name}
                              </p>
                              <p className={`text-xs ${isSelected ? 'text-teal-600' : 'text-charcoal-500'}`}>
                                ${config?.price?.toFixed(2) || campaign.price_per_shirt?.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Color options display */}
              {availableColors.length > 1 && (
                <div className={`p-4 ${isMultiGarment ? '' : 'border-t border-surface-200'}`}>
                  <p className="text-sm font-bold text-charcoal-600 mb-2">
                    {isMultiGarment ? `Colors for ${selectedGarment?.name || 'this style'}` : 'Available Colors'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map(color => {
                      const isActive = color === activeColor
                      return (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white ring-2 ring-teal-300 ring-offset-2'
                              : 'bg-surface-100 text-charcoal-700 hover:bg-surface-200'
                          }`}
                        >
                          {color}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right: Campaign Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Campaign Title */}
            <h1 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
              {campaign.name}
            </h1>
            
            {/* Deadline */}
            <p className="text-xl text-charcoal-500 mb-6">
              Order your shirt by <span className="font-bold text-charcoal-700">{formattedDeadline}</span>
            </p>
            
            {/* Countdown / Status */}
            {isExpired ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-rose-700">This campaign has ended</p>
                    <p className="text-sm text-rose-600">Orders are no longer being accepted</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white">
                      <span className="text-lg">⏱</span>
                    </div>
                    <div>
                      <p className="font-black text-teal-700 text-lg">{daysLeft} days left to order</p>
                      <p className="text-sm text-teal-600">Deadline: {formattedDeadline}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Order count */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                    {i}
                  </div>
                ))}
              </div>
              <span className="text-charcoal-600 font-medium">
                <span className="font-bold text-charcoal-700">{campaign.order_count || 0}</span> orders placed so far
              </span>
            </div>
            
            {/* Price */}
            <div className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6 mb-8">
              {isMultiGarment ? (
                <>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-charcoal-500 font-medium">Starting at</span>
                    <span className="text-3xl font-black text-charcoal-700">
                      ${priceRange?.min.toFixed(2)}
                      {priceRange && priceRange.min !== priceRange.max && (
                        <span className="text-lg text-charcoal-400 font-bold"> – ${priceRange.max.toFixed(2)}</span>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal-500 mb-4">{garments.length} styles available</p>
                  <div className="space-y-2">
                    {garments.map(g => {
                      const config = garmentConfigs[g.id]
                      return (
                        <div key={g.id} className="flex items-center justify-between text-sm">
                          <span className="text-charcoal-600">{g.brand} {g.name}</span>
                          <span className="font-bold text-charcoal-700">${config?.price?.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-charcoal-500 font-medium">Price per shirt</span>
                    <span className="text-3xl font-black text-charcoal-700">
                      ${campaign.price_per_shirt?.toFixed(2)}
                    </span>
                  </div>
                  {selectedGarment && (
                    <p className="text-sm text-charcoal-400">
                      {selectedGarment.brand} {selectedGarment.name}
                    </p>
                  )}
                </>
              )}
            </div>
            
            {/* CTA Button */}
            {!isExpired && (
              <Link
                href={`/c/${slug}/order`}
                className="block w-full py-5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-xl font-black rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all"
              >
                {isMultiGarment 
                  ? 'Choose Your Style' 
                  : (campaign.payment_style === 'everyone_pays' ? 'Order My Shirt' : 'Choose My Size')}
              </Link>
            )}
            
            {/* Explanation text */}
            <p className="text-center text-sm text-charcoal-400 mt-4">
              {isMultiGarment ? (
                <>Select one or more styles, pick your sizes, and {campaign.payment_style === 'everyone_pays' ? 'pay your share securely' : 'submit your order'}.</>
              ) : campaign.payment_style === 'everyone_pays' ? (
                <>You'll pick your size and pay your share securely. Your shirt will be printed and shipped with the group order.</>
              ) : (
                <>You'll pick your size. Your organizer is covering the cost—no payment needed.</>
              )}
            </p>
            
            {/* Organizer info */}
            {campaign.organizer_name && (
              <div className="mt-8 pt-6 border-t border-surface-200">
                <p className="text-sm text-charcoal-400">
                  Campaign by <span className="font-bold text-charcoal-600">{campaign.organizer_name}</span>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-surface-200 bg-white/50 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-charcoal-400">
            Powered by{' '}
            <Link href="/" className="font-bold text-charcoal-600 hover:text-teal-600 transition-colors">
              My Swag Co
            </Link>
            {' '}— Custom screen printing made easy
          </p>
        </div>
      </footer>
    </div>
  )
}
