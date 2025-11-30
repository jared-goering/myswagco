'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Campaign, Garment, CampaignGarmentConfig } from '@/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

// Cart item for multi-style orders
interface CartItem {
  garmentId: string
  garment: Garment
  color: string
  size: string
  quantity: number
  pricePerItem: number
}

type Step = 'styles' | 'details' | 'info' | 'payment' | 'confirmation'

export default function ParticipantOrderPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Multi-style support
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedGarmentIds, setSelectedGarmentIds] = useState<string[]>([])
  
  // Current garment being configured (for multi-garment details step)
  const [currentGarmentIndex, setCurrentGarmentIndex] = useState(0)
  
  // Current item config (used during item configuration)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  
  // Common state
  const [step, setStep] = useState<Step>('styles')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderIds, setOrderIds] = useState<string[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [totalAmountDue, setTotalAmountDue] = useState(0)
  
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
        
        // Check if campaign is still accepting orders
        if (data.status !== 'active') {
          setError('This campaign is no longer accepting orders')
          return
        }
        
        setCampaign(data)
        
        // Determine if single or multi-style
        const garments = data.garments || []
        const isMultiGarment = garments.length > 1
        
        if (!isMultiGarment) {
          // Single style: skip to details step
          setStep('details')
          const garment = garments[0] || data.garment
          if (garment) {
            setSelectedGarmentIds([garment.id])
          }
          // Pre-select first color if only one
          const colors = data.garment_configs?.[garment?.id]?.colors || data.selected_colors || []
          if (colors.length === 1) {
            setSelectedColor(colors[0])
          }
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
  
  // Get garment configs helper
  const getGarmentConfig = (garmentId: string): CampaignGarmentConfig | null => {
    if (!campaign?.garment_configs) return null
    return campaign.garment_configs[garmentId] || null
  }
  
  // Get available colors for a garment
  const getGarmentColors = (garmentId: string): string[] => {
    const config = getGarmentConfig(garmentId)
    if (config?.colors) return config.colors
    return campaign?.selected_colors || []
  }
  
  // Get price for a garment
  const getGarmentPrice = (garmentId: string): number => {
    const config = getGarmentConfig(garmentId)
    if (config?.price) return config.price
    return campaign?.price_per_shirt || 0
  }
  
  // Multi-style helpers
  const garments = campaign?.garments || []
  const isMultiGarment = garments.length > 1
  
  // Toggle garment selection
  const toggleGarmentSelection = (garmentId: string) => {
    setSelectedGarmentIds(prev => 
      prev.includes(garmentId)
        ? prev.filter(id => id !== garmentId)
        : [...prev, garmentId]
    )
  }
  
  // Initialize cart for multi-garment - start fresh, don't pre-create items
  const initializeCart = () => {
    // Clear cart and start with first garment
    setCart([])
    setCurrentGarmentIndex(0)
    // Reset current selection
    setSelectedSize('')
    setSelectedColor('')
    setQuantity(1)
  }
  
  // Get current garment being configured
  const currentGarment = selectedGarmentIds.length > 0 
    ? garments.find(g => g.id === selectedGarmentIds[currentGarmentIndex]) 
    : null
  
  // Get items in cart for current garment
  const currentGarmentCartItems = currentGarment 
    ? cart.filter(item => item.garmentId === currentGarment.id) 
    : []
  
  // Update cart item
  const updateCartItem = (index: number, updates: Partial<CartItem>) => {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }
  
  // Calculate totals
  const cartTotal = cart.reduce((sum, item) => sum + (item.pricePerItem * item.quantity), 0)
  const legacyTotal = (campaign?.price_per_shirt || 0) * quantity
  const totalPrice = cart.length > 0 ? cartTotal : legacyTotal
  
  // Get available sizes for current garment
  const getCurrentGarmentSizes = (): string[] => {
    if (isMultiGarment && cart[currentItemIndex]) {
      return cart[currentItemIndex].garment.size_range || ['S', 'M', 'L', 'XL', '2XL']
    }
    const garment = campaign?.garment || garments[0]
    return garment?.size_range || ['S', 'M', 'L', 'XL', '2XL']
  }
  
  // Check if current selection is complete (size + color selected)
  const isCurrentSelectionComplete = (): boolean => {
    return !!selectedSize && !!selectedColor
  }
  
  // Check if we can proceed (at least one item per selected garment)
  const canProceedToInfo = (): boolean => {
    if (isMultiGarment) {
      // Each selected garment must have at least one item in cart
      return selectedGarmentIds.every(garmentId => 
        cart.some(item => item.garmentId === garmentId)
      )
    }
    return cart.length > 0 || (!!selectedSize && (campaign?.selected_colors?.length === 1 || !!selectedColor))
  }
  
  // Check if current garment has items
  const currentGarmentHasItems = (): boolean => {
    return currentGarmentCartItems.length > 0
  }
  
  // Handle style selection continue
  const handleStylesContinue = () => {
    if (selectedGarmentIds.length === 0) return
    initializeCart()
    setStep('details')
  }
  
  // Add current selection to cart (for multi-garment)
  const addCurrentSelectionToCart = () => {
    if (!currentGarment || !selectedSize || !selectedColor) return
    
    const newItem: CartItem = {
      garmentId: currentGarment.id,
      garment: currentGarment,
      color: selectedColor,
      size: selectedSize,
      quantity,
      pricePerItem: getGarmentPrice(currentGarment.id),
    }
    setCart([...cart, newItem])
    // Reset selection for next item
    setSelectedSize('')
    setQuantity(1)
    // Keep color selected for convenience
  }
  
  // Move to next garment
  const handleNextGarment = () => {
    if (currentGarmentIndex < selectedGarmentIds.length - 1) {
      setCurrentGarmentIndex(currentGarmentIndex + 1)
      setSelectedSize('')
      setSelectedColor('')
      setQuantity(1)
    } else if (canProceedToInfo()) {
      setStep('info')
    }
  }
  
  // Handle going back in details
  const handleDetailsBack = () => {
    if (isMultiGarment && currentGarmentIndex > 0) {
      setCurrentGarmentIndex(currentGarmentIndex - 1)
      setSelectedSize('')
      setSelectedColor('')
      setQuantity(1)
    } else if (isMultiGarment) {
      setStep('styles')
    }
  }
  
  async function handleSubmitOrder() {
    if (!campaign) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      let orderData: any
      
      if (cart.length > 0) {
        // Cart-based order (supports both single and multi-item)
        const items = cart.map(item => ({
          garment_id: item.garmentId,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        }))
        
        const response = await fetch(`/api/campaigns/${slug}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_name: name,
            participant_email: email,
            items,
          }),
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to place order')
        }
        
        orderData = await response.json()
        
        if (orderData.orders) {
          setOrderIds(orderData.orders.map((o: any) => o.id))
          setOrderId(orderData.primary_order_id || orderData.orders[0].id)
        } else {
          setOrderId(orderData.id)
        }
        
        setTotalAmountDue(orderData.amount_due || cartTotal)
      } else {
        // Legacy single item order (backwards compatibility)
        const response = await fetch(`/api/campaigns/${slug}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_name: name,
            participant_email: email,
            garment_id: selectedGarmentIds[0] || campaign.garment_id,
            size: selectedSize,
            color: selectedColor || campaign.selected_colors?.[0],
            quantity,
          }),
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to place order')
        }
        
        orderData = await response.json()
        setOrderId(orderData.id)
        setTotalAmountDue(orderData.amount_due || legacyTotal)
      }
      
      // If payment required, get payment intent
      if (orderData.requires_payment && campaign.payment_style === 'everyone_pays') {
        const primaryOrderId = orderData.primary_order_id || orderData.id
        const payResponse = await fetch(`/api/campaigns/${slug}/orders/${primaryOrderId}/pay`, {
          method: 'POST',
        })
        
        if (!payResponse.ok) {
          throw new Error('Failed to initialize payment')
        }
        
        const payData = await payResponse.json()
        setClientSecret(payData.clientSecret)
        setStep('payment')
      } else {
        // No payment needed, go to confirmation
        setStep('confirmation')
      }
    } catch (err: any) {
      console.error('Error placing order:', err)
      setError(err.message || 'Failed to place order')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
          <p className="text-charcoal-500 font-medium">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-charcoal-700 mb-2">{error}</h1>
          <Link href={`/c/${slug}`} className="text-violet-600 font-bold hover:underline">
            Go back to campaign
          </Link>
        </div>
      </div>
    )
  }
  
  // Build progress steps
  const progressSteps = isMultiGarment 
    ? ['styles', 'details', 'info', campaign.payment_style === 'everyone_pays' ? 'payment' : null, 'confirmation'].filter(Boolean)
    : ['details', 'info', campaign.payment_style === 'everyone_pays' ? 'payment' : null, 'confirmation'].filter(Boolean)
  
  const currentStepIndex = progressSteps.indexOf(step)
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-surface-200 py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href={`/c/${slug}`} className="flex items-center gap-2 text-charcoal-600 hover:text-charcoal-800 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to campaign
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="My Swag Co" 
              width={120} 
              height={36}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Campaign Name */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-charcoal-700 mb-2">{campaign.name}</h1>
          <p className="text-charcoal-500">
            {isMultiGarment ? 'Order Your Shirt' : (campaign.payment_style === 'everyone_pays' ? 'Order Your Shirt' : 'Choose Your Size')}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {progressSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-0.5 bg-surface-300" />}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStepIndex === i 
                  ? 'bg-violet-500 text-white' 
                  : currentStepIndex > i
                    ? 'bg-violet-100 text-violet-600'
                    : 'bg-surface-200 text-charcoal-400'
              }`}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step: Style Selection (multi-garment only) */}
          {step === 'styles' && isMultiGarment && (
            <motion.div
              key="styles"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6"
            >
              <h2 className="text-xl font-black text-charcoal-700 mb-2">Choose Your Style(s)</h2>
              <p className="text-charcoal-500 text-sm mb-6">Select one or more styles to order</p>
              
              <div className="space-y-3 mb-6">
                {garments.map(garment => {
                  const isSelected = selectedGarmentIds.includes(garment.id)
                  const price = getGarmentPrice(garment.id)
                  const colors = getGarmentColors(garment.id)
                  
                  return (
                    <button
                      key={garment.id}
                      onClick={() => toggleGarmentSelection(garment.id)}
                      className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${
                        isSelected
                          ? 'bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-400 ring-2 ring-violet-200'
                          : 'bg-surface-50 border-2 border-transparent hover:border-surface-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-violet-500 border-violet-500' : 'border-surface-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Garment Image */}
                      {garment.thumbnail_url && (
                        <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0 bg-surface-100">
                          <Image
                            src={garment.thumbnail_url}
                            alt={garment.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Garment Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-base ${isSelected ? 'text-violet-700' : 'text-charcoal-700'}`}>
                          {garment.name}
                        </p>
                        <p className="text-sm text-charcoal-500">{garment.brand}</p>
                        <p className="text-xs text-charcoal-400 mt-1">
                          {colors.length} color{colors.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                      
                      {/* Price */}
                      <div className="text-right">
                        <p className={`font-black text-lg ${isSelected ? 'text-violet-600' : 'text-charcoal-700'}`}>
                          ${price.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              
              {/* Selected count */}
              {selectedGarmentIds.length > 0 && (
                <div className="bg-violet-50 rounded-xl p-3 mb-6 text-center">
                  <p className="text-violet-700 font-bold">
                    {selectedGarmentIds.length} style{selectedGarmentIds.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
              
              <button
                onClick={handleStylesContinue}
                disabled={selectedGarmentIds.length === 0}
                className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-600 hover:to-fuchsia-600 transition-all"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* Step: Details (size, color, quantity) */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6"
            >
              {isMultiGarment && currentGarment ? (
                <>
                  {/* Header with garment info */}
                  <div className="flex items-center gap-4 mb-6 pb-4 border-b border-surface-200">
                    {currentGarment.thumbnail_url && (
                      <div className="w-16 h-16 relative rounded-xl overflow-hidden bg-surface-100 flex-shrink-0">
                        <Image
                          src={selectedColor ? (currentGarment.color_images?.[selectedColor] || currentGarment.thumbnail_url) : currentGarment.thumbnail_url}
                          alt={currentGarment.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-lg font-black text-charcoal-700">{currentGarment.name}</h2>
                      <p className="text-sm text-charcoal-500">{currentGarment.brand}</p>
                      <p className="text-sm font-bold text-violet-600">${getGarmentPrice(currentGarment.id).toFixed(2)} each</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">
                        Style {currentGarmentIndex + 1} of {selectedGarmentIds.length}
                      </span>
                    </div>
                  </div>
                  
                  {/* Color Selection */}
                  <div className="mb-5">
                    <label className="block text-sm font-bold text-charcoal-600 mb-2">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {getGarmentColors(currentGarment.id).map(color => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            selectedColor === color
                              ? 'bg-violet-500 text-white shadow-md'
                              : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Size Selection */}
                  <div className="mb-5">
                    <label className="block text-sm font-bold text-charcoal-600 mb-2">Size</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {currentGarment.size_range?.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                            selectedSize === size
                              ? 'bg-violet-500 text-white shadow-md'
                              : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Quantity */}
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-charcoal-600 mb-2">Quantity</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-xl bg-surface-100 text-charcoal-600 font-bold hover:bg-surface-200 transition-colors"
                      >
                        −
                      </button>
                      <span className="w-12 text-center text-xl font-black text-charcoal-700">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 rounded-xl bg-surface-100 text-charcoal-600 font-bold hover:bg-surface-200 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {/* Items already added for this style */}
                  {currentGarmentCartItems.length > 0 && (
                    <div className="mb-5 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <p className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Added to order
                      </p>
                      <div className="space-y-2">
                        {currentGarmentCartItems.map((item, index) => {
                          const cartIndex = cart.findIndex(c => c === item)
                          return (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="text-emerald-800">
                                {item.color}, {item.size} × {item.quantity}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-700">${(item.pricePerItem * item.quantity).toFixed(2)}</span>
                                <button
                                  onClick={() => setCart(cart.filter((_, i) => i !== cartIndex))}
                                  className="p-1 text-emerald-600 hover:text-rose-500 rounded transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Subtotal for current selection */}
                  {isCurrentSelectionComplete() && (
                    <div className="bg-surface-50 rounded-xl p-4 mb-5">
                      <div className="flex items-center justify-between">
                        <span className="text-charcoal-500 text-sm">
                          {selectedColor}, {selectedSize} × {quantity}
                        </span>
                        <span className="text-lg font-black text-charcoal-700">
                          ${(getGarmentPrice(currentGarment.id) * quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="space-y-3">
                    {/* Add another color button - only show if valid selection */}
                    {isCurrentSelectionComplete() && (
                      <button
                        onClick={() => {
                          addCurrentSelectionToCart()
                          // Pre-select a different color if available
                          const colors = getGarmentColors(currentGarment.id)
                          const otherColor = colors.find(c => c !== selectedColor)
                          if (otherColor) setSelectedColor(otherColor)
                        }}
                        className="w-full py-3 border-2 border-surface-300 text-charcoal-600 font-bold rounded-xl hover:bg-surface-50 hover:border-surface-400 transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Another Color/Size
                      </button>
                    )}
                    
                    {/* Main navigation */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleDetailsBack}
                        className="px-5 py-3 border-2 border-surface-300 rounded-xl font-bold text-charcoal-700 hover:bg-surface-50 transition-all"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          // Add current selection if complete
                          if (isCurrentSelectionComplete()) {
                            addCurrentSelectionToCart()
                          }
                          // Move to next garment or checkout
                          if (currentGarmentIndex < selectedGarmentIds.length - 1) {
                            setCurrentGarmentIndex(currentGarmentIndex + 1)
                            setSelectedSize('')
                            setSelectedColor('')
                            setQuantity(1)
                          } else {
                            setStep('info')
                          }
                        }}
                        disabled={!isCurrentSelectionComplete() && !currentGarmentHasItems()}
                        className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-600 hover:to-fuchsia-600 transition-all"
                      >
                        {currentGarmentIndex < selectedGarmentIds.length - 1 ? 'Next Style →' : 'Continue to Checkout →'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Single-style configuration with cart support */}
                  <h2 className="text-xl font-black text-charcoal-700 mb-6">
                    {cart.length > 0 ? 'Add Another Item' : 'Select Your Size'}
                  </h2>
                  
                  {/* Show existing cart items */}
                  {cart.length > 0 && (
                    <div className="mb-6 space-y-2">
                      <p className="text-sm font-bold text-charcoal-600 mb-2">Your Items ({cart.length})</p>
                      {cart.map((item, index) => {
                        const itemColorImage = item.garment.color_images?.[item.color] || item.garment.thumbnail_url
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              {itemColorImage && (
                                <div className="w-10 h-10 relative rounded-lg overflow-hidden bg-surface-100">
                                  <Image
                                    src={itemColorImage}
                                    alt={item.garment.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-sm text-charcoal-700">
                                  {item.color} / {item.size} <span className="text-charcoal-400">×{item.quantity}</span>
                                </p>
                                <p className="text-xs text-charcoal-500">${(item.pricePerItem * item.quantity).toFixed(2)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setCart(cart.filter((_, i) => i !== index))
                              }}
                              className="p-1.5 text-charcoal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )
                      })}
                      <div className="flex justify-between pt-2 border-t border-surface-200 mt-3">
                        <span className="font-bold text-charcoal-600">Cart Total</span>
                        <span className="font-black text-charcoal-700">
                          ${cart.reduce((sum, item) => sum + (item.pricePerItem * item.quantity), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Color Selection (if multiple) */}
                  {campaign.selected_colors && campaign.selected_colors.length > 1 && (
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-charcoal-600 mb-3">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {campaign.selected_colors.map(color => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                              selectedColor === color
                                ? 'bg-violet-500 text-white shadow-sm'
                                : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Size Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-charcoal-600 mb-3">Size</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {getCurrentGarmentSizes().map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`py-3 rounded-xl font-bold text-sm transition-all ${
                            selectedSize === size
                              ? 'bg-violet-500 text-white shadow-sm'
                              : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Quantity */}
                  <div className="mb-8">
                    <label className="block text-sm font-bold text-charcoal-600 mb-3">Quantity</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-lg bg-surface-100 text-charcoal-600 font-bold hover:bg-surface-200 transition-colors"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-xl font-black text-charcoal-700">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 rounded-lg bg-surface-100 text-charcoal-600 font-bold hover:bg-surface-200 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {/* Price Display */}
                  <div className="bg-surface-50 rounded-xl p-4 mb-6">
                    <div className="flex items-baseline justify-between">
                      <span className="text-charcoal-500">Item Total</span>
                      <span className="text-2xl font-black text-charcoal-700">${legacyTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {/* Add to Cart / Add Another */}
                    <button
                      onClick={() => {
                        const garment = garments[0] || campaign.garment as Garment
                        const newItem: CartItem = {
                          garmentId: garment?.id || campaign.garment_id,
                          garment: garment,
                          color: selectedColor || campaign.selected_colors?.[0] || '',
                          size: selectedSize,
                          quantity,
                          pricePerItem: campaign.price_per_shirt,
                        }
                        setCart([...cart, newItem])
                        // Reset selection for next item
                        setSelectedSize('')
                        setQuantity(1)
                        // Keep color selected for convenience
                      }}
                      disabled={!selectedSize || (campaign.selected_colors && campaign.selected_colors.length > 1 && !selectedColor)}
                      className="w-full py-3 border-2 border-violet-500 text-violet-600 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-50 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {cart.length > 0 ? 'Add Another Item' : 'Add to Order'}
                    </button>
                    
                    {/* Continue to Checkout */}
                    {(cart.length > 0 || (selectedSize && (campaign.selected_colors?.length === 1 || selectedColor))) && (
                      <button
                        onClick={() => {
                          // If there's a current selection not added to cart yet, add it
                          if (selectedSize && (campaign.selected_colors?.length === 1 || selectedColor)) {
                            const garment = garments[0] || campaign.garment as Garment
                            const newItem: CartItem = {
                              garmentId: garment?.id || campaign.garment_id,
                              garment: garment,
                              color: selectedColor || campaign.selected_colors?.[0] || '',
                              size: selectedSize,
                              quantity,
                              pricePerItem: campaign.price_per_shirt,
                            }
                            setCart([...cart, newItem])
                          }
                          setStep('info')
                        }}
                        className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-fuchsia-600 transition-all"
                      >
                        Continue to Checkout
                        {cart.length > 0 && (
                          <span className="ml-2 opacity-80">
                            ({cart.length + (selectedSize ? 1 : 0)} item{cart.length + (selectedSize ? 1 : 0) !== 1 ? 's' : ''})
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Step: Contact Info */}
          {step === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6"
            >
              <h2 className="text-xl font-black text-charcoal-700 mb-6">Your Information</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-medium text-charcoal-700 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-medium text-charcoal-700 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all outline-none"
                    required
                  />
                  <p className="text-sm text-charcoal-400 mt-1">
                    We'll send order updates to this email
                  </p>
                </div>
              </div>
              
              {/* Order Summary */}
              <div className="bg-surface-50 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-charcoal-700 mb-3">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  {cart.length > 0 ? (
                    <>
                      {cart.map((item, index) => (
                        <div key={index} className="pb-3 border-b border-surface-200 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-charcoal-700">
                              {isMultiGarment ? item.garment.name : `${item.color} / ${item.size}`}
                            </span>
                            <span className="font-bold text-charcoal-700">
                              ${(item.pricePerItem * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-charcoal-500 text-xs">
                            {isMultiGarment ? `${item.color} / ${item.size}` : ''} × {item.quantity}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-surface-200">
                        <span className="font-bold text-charcoal-600">Total ({cart.reduce((sum, i) => sum + i.quantity, 0)} items)</span>
                        <span className="font-black text-lg text-charcoal-700">${cartTotal.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-charcoal-500">Size</span>
                        <span className="font-bold text-charcoal-700">{selectedSize}</span>
                      </div>
                      {selectedColor && (
                        <div className="flex justify-between">
                          <span className="text-charcoal-500">Color</span>
                          <span className="font-bold text-charcoal-700">{selectedColor}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-charcoal-500">Quantity</span>
                        <span className="font-bold text-charcoal-700">{quantity}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-surface-200">
                        <span className="font-bold text-charcoal-600">Total</span>
                        <span className="font-black text-lg text-charcoal-700">${legacyTotal.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('details')}
                  className="px-6 py-3 border-2 border-surface-300 rounded-xl font-bold text-charcoal-700 hover:bg-surface-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitOrder}
                  disabled={!name || !email || isSubmitting}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-600 hover:to-fuchsia-600 transition-all"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : campaign.payment_style === 'everyone_pays' ? (
                    'Continue to Payment'
                  ) : (
                    'Submit Order'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && clientSecret && orderId && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6"
            >
              <h2 className="text-xl font-black text-charcoal-700 mb-6">Payment</h2>
              
              <div className="bg-surface-50 rounded-xl p-4 mb-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-charcoal-500">Amount to pay</span>
                  <span className="text-2xl font-black text-charcoal-700">${totalAmountDue.toFixed(2)}</span>
                </div>
              </div>
              
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm 
                  orderId={orderId} 
                  slug={slug} 
                  onSuccess={() => setStep('confirmation')} 
                />
              </Elements>
            </motion.div>
          )}

          {/* Step: Confirmation */}
          {step === 'confirmation' && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center"
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              
              <h2 className="text-2xl font-black text-charcoal-700 mb-3">Thanks! Your order is in.</h2>
              <p className="text-charcoal-500 mb-6">
                You'll receive updates from{' '}
                <span className="font-bold">{campaign.organizer_name || 'the organizer'}</span>{' '}
                once the campaign closes.
              </p>
              
              <div className="bg-surface-50 rounded-xl p-4 mb-6 text-left">
                <h3 className="font-bold text-charcoal-700 mb-3">Your Order</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Name</span>
                    <span className="font-bold text-charcoal-700">{name}</span>
                  </div>
                  {cart.length > 0 ? (
                    <>
                      {cart.map((item, index) => (
                        <div key={index} className="pt-2 border-t border-surface-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-charcoal-700">
                                {item.color} / {item.size}
                              </span>
                              {isMultiGarment && (
                                <p className="text-xs text-charcoal-400">{item.garment.name}</p>
                              )}
                            </div>
                            <span className="text-charcoal-600">×{item.quantity}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-surface-200 mt-2">
                        <span className="font-bold text-charcoal-600">Total</span>
                        <span className="font-black text-charcoal-700">
                          ${cart.reduce((sum, item) => sum + (item.pricePerItem * item.quantity), 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-charcoal-500">Size</span>
                        <span className="font-bold text-charcoal-700">{selectedSize}</span>
                      </div>
                      {selectedColor && (
                        <div className="flex justify-between">
                          <span className="text-charcoal-500">Color</span>
                          <span className="font-bold text-charcoal-700">{selectedColor}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-charcoal-500">Quantity</span>
                        <span className="font-bold text-charcoal-700">{quantity}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <Link
                href={`/c/${slug}`}
                className="inline-block px-8 py-3 bg-surface-100 text-charcoal-700 font-bold rounded-xl hover:bg-surface-200 transition-all"
              >
                Back to Campaign
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Payment Form Component
function PaymentForm({ orderId, slug, onSuccess }: { orderId: string; slug: string; onSuccess: () => void }) {
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
      // Confirm payment on our backend to update order status
      try {
        const response = await fetch(`/api/campaigns/${slug}/orders/${orderId}/pay`, {
          method: 'PATCH',
        })
        
        if (!response.ok) {
          console.error('Failed to confirm payment on backend')
        }
      } catch (err) {
        console.error('Error confirming payment:', err)
      }
      
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <PaymentElement />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl disabled:opacity-50 hover:from-violet-600 hover:to-fuchsia-600 transition-all"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : (
          'Pay Now'
        )}
      </button>
    </form>
  )
}
