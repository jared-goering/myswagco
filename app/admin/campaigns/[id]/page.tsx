'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import AdminLayout from '@/components/AdminLayout'
import { Campaign, Garment, ArtworkTransform, CampaignGarmentConfig, PrintLocation } from '@/types'

// Dynamically import the Konva-based renderer (no SSR since Konva needs window)
const CampaignMockupRenderer = dynamic(
  () => import('@/components/CampaignMockupRenderer'),
  { 
    ssr: false, 
    loading: () => <div className="w-full aspect-[500/550] bg-surface-100 animate-pulse rounded-xl" /> 
  }
)

interface AdminCampaign extends Campaign {
  order_count: number
  total_quantity: number
  total_revenue: number
  pending_count: number
  garment?: Garment
  garments?: Garment[]
}

// Local editable garment config state
interface EditableGarmentConfig {
  price: string
  colors: string[]
}

export default function AdminCampaignEdit() {
  const params = useParams()
  const id = params.id as string
  
  const [campaign, setCampaign] = useState<AdminCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Mockup preview state
  const [selectedGarmentId, setSelectedGarmentId] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'front' | 'back'>('front')
  
  // Form state - basic campaign info
  const [name, setName] = useState('')
  const [deadline, setDeadline] = useState('')
  const [status, setStatus] = useState<string>('active')
  const [organizerName, setOrganizerName] = useState('')
  const [organizerEmail, setOrganizerEmail] = useState('')
  const [paymentStyle, setPaymentStyle] = useState<string>('everyone_pays')
  
  // Single-garment form state (used when only one style)
  const [pricePerShirt, setPricePerShirt] = useState<string>('')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  
  // Multi-garment form state (used when multiple styles)
  const [editableGarmentConfigs, setEditableGarmentConfigs] = useState<Record<string, EditableGarmentConfig>>({})

  useEffect(() => {
    fetchCampaign()
  }, [id])

  async function fetchCampaign() {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/campaigns/${id}`)
      if (response.ok) {
        const data: AdminCampaign = await response.json()
        setCampaign(data)
        
        // Populate basic form fields
        setName(data.name || '')
        setDeadline(data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : '')
        setStatus(data.status || 'active')
        setOrganizerName(data.organizer_name || '')
        setOrganizerEmail(data.organizer_email || '')
        setPaymentStyle(data.payment_style || 'everyone_pays')
        
        // Single-garment fields (backwards compat)
        setPricePerShirt(data.price_per_shirt?.toString() || '')
        setSelectedColors(data.selected_colors || [])
        
        // Multi-garment configs - convert to editable format
        if (data.garment_configs) {
          const editable: Record<string, EditableGarmentConfig> = {}
          Object.entries(data.garment_configs).forEach(([garmentId, config]) => {
            editable[garmentId] = {
              price: config.price?.toString() || '',
              colors: config.colors || []
            }
          })
          setEditableGarmentConfigs(editable)
        }
        
        // Set initial selected garment
        if (data.garments && data.garments.length > 0) {
          setSelectedGarmentId(data.garments[0].id)
        } else if (data.garment) {
          setSelectedGarmentId(data.garment.id)
        }
      } else {
        setError('Campaign not found')
      }
    } catch (err) {
      console.error('Error fetching campaign:', err)
      setError('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  // Reset color when garment changes if current color isn't available
  useEffect(() => {
    if (!campaign || !selectedGarmentId) return
    
    const config = editableGarmentConfigs[selectedGarmentId] || { colors: selectedColors }
    const availableColorsForGarment = config.colors || []
    
    if (selectedColor && !availableColorsForGarment.includes(selectedColor)) {
      setSelectedColor(null)
    }
  }, [selectedGarmentId, selectedColor, editableGarmentConfigs, selectedColors])

  async function handleSave() {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)
      
      const updates: Record<string, any> = {
        name,
        deadline: new Date(deadline).toISOString(),
        status,
        organizer_name: organizerName,
        organizer_email: organizerEmail,
        payment_style: paymentStyle,
      }
      
      // For multi-garment campaigns, send the full garment_configs
      if (isMultiGarment) {
        const configs: Record<string, { price: number; colors: string[] }> = {}
        Object.entries(editableGarmentConfigs).forEach(([garmentId, config]) => {
          configs[garmentId] = {
            price: parseFloat(config.price) || 0,
            colors: config.colors
          }
        })
        updates.garment_configs = configs
        
        // Also update selected_colors to be the union of all colors
        updates.selected_colors = [...new Set(Object.values(editableGarmentConfigs).flatMap(c => c.colors))]
        
        // Update price_per_shirt to first garment's price for backwards compat
        const firstGarmentId = Object.keys(configs)[0]
        if (firstGarmentId) {
          updates.price_per_shirt = configs[firstGarmentId].price
        }
      } else {
        // Single garment - use the simple fields
        updates.price_per_shirt = parseFloat(pricePerShirt)
        updates.selected_colors = selectedColors
        
        // Also update garment_configs for consistency
        if (campaign?.garment_id) {
          updates.garment_configs = {
            [campaign.garment_id]: {
              price: parseFloat(pricePerShirt) || 0,
              colors: selectedColors
            }
          }
        }
      }
      
      const response = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      
      if (response.ok) {
        setSuccess(true)
        // Refetch to get updated data
        await fetchCampaign()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save changes')
      }
    } catch (err) {
      console.error('Error saving campaign:', err)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // Toggle color for single-garment campaigns
  function toggleColor(color: string) {
    setSelectedColors(prev => 
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    )
  }
  
  // Toggle color for a specific garment in multi-garment campaigns
  function toggleGarmentColor(garmentId: string, color: string) {
    setEditableGarmentConfigs(prev => {
      const config = prev[garmentId] || { price: '', colors: [] }
      const newColors = config.colors.includes(color)
        ? config.colors.filter(c => c !== color)
        : [...config.colors, color]
      return {
        ...prev,
        [garmentId]: { ...config, colors: newColors }
      }
    })
  }
  
  // Update price for a specific garment
  function updateGarmentPrice(garmentId: string, price: string) {
    setEditableGarmentConfigs(prev => ({
      ...prev,
      [garmentId]: { ...prev[garmentId], price }
    }))
  }

  // Get garments list
  const garments = campaign?.garments || (campaign?.garment ? [campaign.garment] : [])
  const isMultiGarment = garments.length > 1
  
  // Get currently selected garment for mockup preview
  const selectedGarment = selectedGarmentId 
    ? garments.find(g => g.id === selectedGarmentId) 
    : garments[0]
  
  // Get config for selected garment for preview
  const selectedGarmentConfig = selectedGarmentId 
    ? editableGarmentConfigs[selectedGarmentId] 
    : (editableGarmentConfigs[garments[0]?.id] || { price: pricePerShirt, colors: selectedColors })
  
  // Get colors available for the selected garment (for mockup preview)
  const selectedGarmentColorImages = selectedGarment?.color_images || {}
  const configColors = selectedGarmentConfig?.colors || selectedColors || []
  const previewAvailableColors = configColors.filter((color: string) => selectedGarmentColorImages[color])
  const firstColor = previewAvailableColors[0]
  const activeColor = selectedColor && previewAvailableColors.includes(selectedColor) ? selectedColor : firstColor
  
  // Artwork info for mockup
  const artworkUrls = campaign?.artwork_urls || {}
  const hasFrontArtwork = !!artworkUrls['front']
  const hasBackArtwork = !!artworkUrls['back']
  const hasMultipleViews = hasFrontArtwork && hasBackArtwork
  
  const artworkLocation = selectedView === 'back' && hasBackArtwork ? 'back' 
    : hasFrontArtwork ? 'front' 
    : hasBackArtwork ? 'back' 
    : 'front'
  const artworkUrl = artworkUrls[artworkLocation] || null
  const artworkTransform = campaign?.artwork_transforms?.[artworkLocation] as ArtworkTransform | undefined
  
  // Mockup key for re-render
  const imageKey = `${selectedGarmentId || 'default'}-${activeColor || 'default'}-${artworkLocation}`
  
  // Check if any garment has no colors selected
  const hasEmptyColors = isMultiGarment 
    ? Object.values(editableGarmentConfigs).some(c => c.colors.length === 0)
    : selectedColors.length === 0

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error && !campaign) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-charcoal-700">{error}</p>
          <Link href="/admin/campaigns" className="text-primary-600 font-bold hover:underline mt-4 inline-block">
            Back to Campaigns
          </Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              href="/admin/campaigns" 
              className="text-charcoal-500 hover:text-charcoal-700 font-bold text-sm mb-2 inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Campaigns
            </Link>
            <h1 className="text-4xl font-black text-charcoal-700 tracking-tight">Edit Campaign</h1>
          </div>
          <Link
            href={`/c/${campaign?.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 rounded-xl font-bold text-charcoal-700 transition-colors"
          >
            View Public Page
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-data-green/20 border border-data-green/40 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-data-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-bold text-charcoal-700">Changes saved successfully!</span>
          </div>
        )}

        {error && campaign && (
          <div className="mb-6 p-4 bg-error-100 border border-error-200 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-bold text-error-700">{error}</span>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bento-card">
            <div className="text-2xl font-black text-charcoal-700">{campaign?.order_count || 0}</div>
            <div className="text-sm font-bold text-charcoal-500">Orders</div>
          </div>
          <div className="bento-card">
            <div className="text-2xl font-black text-charcoal-700">{campaign?.total_quantity || 0}</div>
            <div className="text-sm font-bold text-charcoal-500">Shirts</div>
          </div>
          <div className="bento-card">
            <div className="text-2xl font-black text-emerald-600">${(campaign?.total_revenue || 0).toFixed(2)}</div>
            <div className="text-sm font-bold text-charcoal-500">Revenue</div>
          </div>
          <div className="bento-card">
            <div className="text-2xl font-black text-data-yellow">{campaign?.pending_count || 0}</div>
            <div className="text-sm font-bold text-charcoal-500">Pending</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Mockup Preview */}
          <div>
            <div className="bento-card overflow-hidden">
              <h2 className="text-xl font-black text-charcoal-700 mb-4">Mockup Preview</h2>
              
              {/* Front/Back Toggle */}
              {hasMultipleViews && (
                <div className="flex justify-center gap-2 p-3 bg-surface-50 rounded-xl mb-4">
                  <button
                    onClick={() => setSelectedView('front')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedView === 'front'
                        ? 'bg-white text-charcoal-700 shadow-md ring-2 ring-primary-200'
                        : 'text-charcoal-500 hover:bg-white/50'
                    }`}
                  >
                    Front
                  </button>
                  <button
                    onClick={() => setSelectedView('back')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedView === 'back'
                        ? 'bg-white text-charcoal-700 shadow-md ring-2 ring-primary-200'
                        : 'text-charcoal-500 hover:bg-white/50'
                    }`}
                  >
                    Back
                  </button>
                </div>
              )}
              
              {/* Mockup Renderer */}
              <div key={imageKey} className="w-full overflow-hidden rounded-xl bg-surface-50">
                <CampaignMockupRenderer
                  garment={selectedGarment || null}
                  activeColor={activeColor || ''}
                  artworkUrl={artworkUrl}
                  transform={artworkTransform || null}
                  location={(artworkLocation as PrintLocation) || 'front'}
                />
              </div>
              
              {/* Style Selector for Multi-Garment (preview only) */}
              {isMultiGarment && (
                <div className="mt-4 pt-4 border-t border-surface-200">
                  <p className="text-sm font-black text-charcoal-600 uppercase tracking-wide mb-3">
                    Preview Style
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {garments.map(garment => {
                      const isSelected = garment.id === selectedGarmentId
                      return (
                        <button
                          key={garment.id}
                          onClick={() => setSelectedGarmentId(garment.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                            isSelected
                              ? 'bg-primary-500 text-white'
                              : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                          }`}
                        >
                          {garment.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Color Preview Selector */}
              {previewAvailableColors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-200">
                  <p className="text-sm font-black text-charcoal-600 uppercase tracking-wide mb-2">
                    Preview Color
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {previewAvailableColors.map((color: string) => {
                      const isActive = color === activeColor
                      return (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-primary-500 text-white ring-2 ring-primary-300 ring-offset-2'
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
          </div>

          {/* Right Column: Edit Form */}
          <div className="space-y-6">
            {/* Campaign Details */}
            <div className="bento-card">
              <h2 className="text-xl font-black text-charcoal-700 mb-6">Campaign Details</h2>
              
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-black text-charcoal-600 uppercase tracking-wide mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 text-charcoal-700 font-semibold focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                    placeholder="Campaign name"
                  />
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-sm font-black text-charcoal-600 uppercase tracking-wide mb-2">
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 text-charcoal-700 font-semibold focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                  />
                </div>

                {/* Status & Payment Style */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-charcoal-600 uppercase tracking-wide mb-2">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 text-charcoal-700 font-semibold focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-black text-charcoal-600 uppercase tracking-wide mb-2">
                      Payment
                    </label>
                    <select
                      value={paymentStyle}
                      onChange={(e) => setPaymentStyle(e.target.value)}
                      className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 text-charcoal-700 font-semibold focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                    >
                      <option value="everyone_pays">Everyone Pays</option>
                      <option value="organizer_pays">Organizer Pays</option>
                    </select>
                  </div>
                </div>

                {/* Organizer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-charcoal-600 uppercase tracking-wide mb-2">
                      Organizer Name
                    </label>
                    <input
                      type="text"
                      value={organizerName}
                      onChange={(e) => setOrganizerName(e.target.value)}
                      className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 text-charcoal-700 font-semibold focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                      placeholder="Contact name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-black text-charcoal-600 uppercase tracking-wide mb-2">
                      Organizer Email
                    </label>
                    <input
                      type="email"
                      value={organizerEmail}
                      onChange={(e) => setOrganizerEmail(e.target.value)}
                      className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 text-charcoal-700 font-semibold focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Garment Styles Section */}
            <div className="bento-card">
              <h2 className="text-xl font-black text-charcoal-700 mb-6">
                {isMultiGarment ? `Garment Styles (${garments.length})` : 'Garment Style'}
              </h2>
              
              {isMultiGarment ? (
                // Multi-garment: show per-style editor
                <div className="space-y-6">
                  {garments.map((garment, index) => {
                    const config = editableGarmentConfigs[garment.id] || { price: '', colors: [] }
                    const garmentAvailableColors = garment.available_colors || []
                    
                    return (
                      <div 
                        key={garment.id} 
                        className={`p-4 rounded-xl border-2 ${
                          garment.id === selectedGarmentId 
                            ? 'border-primary-300 bg-primary-50/50' 
                            : 'border-surface-200 bg-surface-50'
                        }`}
                      >
                        {/* Garment Header */}
                        <div className="flex items-center gap-3 mb-4">
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
                          <div className="flex-1">
                            <p className="font-bold text-charcoal-700">{garment.name}</p>
                            <p className="text-sm text-charcoal-500">{garment.brand}</p>
                          </div>
                          <button
                            onClick={() => setSelectedGarmentId(garment.id)}
                            className="text-sm font-bold text-primary-600 hover:text-primary-700"
                          >
                            Preview
                          </button>
                        </div>
                        
                        {/* Price for this style */}
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wide mb-1.5">
                            Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500 font-bold text-sm">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={config.price}
                              onChange={(e) => updateGarmentPrice(garment.id, e.target.value)}
                              className="w-full border-2 border-surface-300 rounded-lg pl-7 pr-3 py-2 text-sm text-charcoal-700 font-semibold focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        
                        {/* Colors for this style */}
                        <div>
                          <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wide mb-1.5">
                            Available Colors ({config.colors.length} selected)
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {garmentAvailableColors.map((color: string) => {
                              const isSelected = config.colors.includes(color)
                              return (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => toggleGarmentColor(garment.id, color)}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                                    isSelected
                                      ? 'bg-primary-500 text-white'
                                      : 'bg-white text-charcoal-600 hover:bg-surface-100 border border-surface-200'
                                  }`}
                                >
                                  {color}
                                </button>
                              )
                            })}
                          </div>
                          {config.colors.length === 0 && (
                            <p className="text-xs text-error-600 mt-1.5 font-semibold">
                              Select at least one color
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Single garment: show simple price and colors
                <>
                  {/* Garment Info */}
                  {selectedGarment && (
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-surface-200">
                      {selectedGarment.thumbnail_url && (
                        <img 
                          src={selectedGarment.thumbnail_url} 
                          alt={selectedGarment.name}
                          className="w-16 h-16 object-cover rounded-xl"
                        />
                      )}
                      <div>
                        <div className="font-bold text-charcoal-700">{selectedGarment.name}</div>
                        <div className="text-sm text-charcoal-500">{selectedGarment.brand}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Price Per Shirt */}
                  <div className="mb-6">
                    <label className="block text-sm font-black text-charcoal-600 uppercase tracking-wide mb-2">
                      Price Per Shirt
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-500 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricePerShirt}
                        onChange={(e) => setPricePerShirt(e.target.value)}
                        className="w-full border-2 border-surface-300 rounded-xl pl-8 pr-4 py-3 text-charcoal-700 font-semibold focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Available Colors */}
                  {selectedGarment?.available_colors && selectedGarment.available_colors.length > 0 && (
                    <div>
                      <label className="block text-sm font-black text-charcoal-600 uppercase tracking-wide mb-2">
                        Available Colors ({selectedColors.length} selected)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedGarment.available_colors.map((color: string) => {
                          const isSelected = selectedColors.includes(color)
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => toggleColor(color)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-all ${
                                isSelected
                                  ? 'bg-primary-500 text-white'
                                  : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                              }`}
                            >
                              {color}
                            </button>
                          )
                        })}
                      </div>
                      {selectedColors.length === 0 && (
                        <p className="text-sm text-error-600 mt-2 font-semibold">
                          At least one color must be selected
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving || hasEmptyColors}
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
              <Link
                href="/admin/campaigns"
                className="px-6 py-3 bg-surface-100 hover:bg-surface-200 text-charcoal-700 font-bold rounded-xl transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
