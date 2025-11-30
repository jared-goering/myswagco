'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Garment, PrintLocation } from '@/types'
import { useOrderStore } from '@/lib/store/orderStore'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
const PRINT_LOCATIONS: { value: PrintLocation; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
]

// Debounce helper
function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay]) as T
}

export default function ConfigurationWizard() {
  const router = useRouter()
  const params = useParams()
  const garmentId = params.garmentId as string
  const { isAuthenticated, customer, user, openAuthModal, signOut, isLoading: authLoading } = useCustomerAuth()

  const {
    setGarmentId,
    selectedColors,
    addColor,
    removeColor,
    colorSizeQuantities,
    setColorSizeQuantity,
    getTotalQuantity,
    printConfig,
    setPrintConfig,
    organizationName,
    needByDate,
    setCustomerInfo,
    setQuote,
    quote,
    saveDraft,
    draftId
  } = useOrderStore()

  const [garment, setGarment] = useState<Garment | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [showDropdown, setShowDropdown] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced save draft function
  const debouncedSaveDraft = useDebouncedCallback(
    useCallback(async () => {
      if (isAuthenticated && garmentId) {
        setSaveStatus('saving')
        await saveDraft()
        setSaveStatus('saved')
        
        // Auto-hide the saved indicator after 2 seconds
        if (saveStatusTimeoutRef.current) {
          clearTimeout(saveStatusTimeoutRef.current)
        }
        saveStatusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      }
    }, [isAuthenticated, garmentId, saveDraft]),
    2000 // Save 2 seconds after last change
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setGarmentId(garmentId)
    fetchGarment()
  }, [garmentId])

  useEffect(() => {
    // Fetch quote when configuration changes
    if (garment && getTotalQuantity() >= 24) {
      fetchQuote()
    }
  }, [colorSizeQuantities, printConfig, garment])

  // Auto-save draft when authenticated user makes changes
  useEffect(() => {
    // Skip initial render to avoid saving on page load
    if (!hasInitialized.current) {
      hasInitialized.current = true
      return
    }
    
    // Only save if user is authenticated and has made meaningful selections
    if (isAuthenticated && garmentId && (selectedColors.length > 0 || Object.keys(colorSizeQuantities).length > 0)) {
      debouncedSaveDraft()
    }
  }, [selectedColors, colorSizeQuantities, printConfig, organizationName, needByDate, isAuthenticated, garmentId, debouncedSaveDraft])

  async function fetchGarment() {
    try {
      const response = await fetch('/api/garments')
      const garments = await response.json()
      const foundGarment = garments.find((g: Garment) => g.id === garmentId)
      
      if (!foundGarment) {
        router.push('/custom-shirts/configure')
        return
      }
      
      setGarment(foundGarment)
    } catch (error) {
      console.error('Error fetching garment:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchQuote() {
    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garment_id: garmentId,
          quantity: getTotalQuantity(),
          print_config: printConfig
        })
      })
      
      if (response.ok) {
        const quoteData = await response.json()
        setQuote(quoteData)
      }
    } catch (error) {
      console.error('Error fetching quote:', error)
    }
  }

  function handleColorToggle(color: string) {
    if (selectedColors.includes(color)) {
      removeColor(color)
    } else {
      addColor(color)
    }
  }

  function handleColorSizeQuantityChange(color: string, size: string, value: string) {
    const qty = parseInt(value) || 0
    setColorSizeQuantity(color, size, qty)
  }

  function getColorTotal(color: string): number {
    const colorQty = colorSizeQuantities[color] || {}
    return Object.values(colorQty).reduce((sum, qty) => sum + (qty || 0), 0)
  }

  function togglePrintLocation(location: PrintLocation, enabled: boolean) {
    const newConfig = { ...printConfig }
    if (enabled) {
      newConfig.locations[location] = { enabled: true, num_colors: 1 }
    } else {
      delete newConfig.locations[location]
    }
    setPrintConfig(newConfig)
  }

  function setLocationColors(location: PrintLocation, colors: number) {
    const newConfig = { ...printConfig }
    if (newConfig.locations[location]) {
      newConfig.locations[location]!.num_colors = colors
    }
    setPrintConfig(newConfig)
  }

  function isStepValid(stepNum: number): boolean {
    switch (stepNum) {
      case 1:
        return selectedColors.length > 0
      case 2:
        return getTotalQuantity() >= 24
      case 3:
        return Object.values(printConfig.locations).some(loc => loc?.enabled)
      default:
        return true
    }
  }

  async function handleContinueToArtwork() {
    if (isStepValid(1) && isStepValid(2) && isStepValid(3)) {
      // Save draft immediately before navigating (don't wait for debounce)
      if (isAuthenticated) {
        // Clear any pending debounced save
        if (saveStatusTimeoutRef.current) {
          clearTimeout(saveStatusTimeoutRef.current)
        }
        await saveDraft()
      }
      router.push(`/custom-shirts/configure/${garmentId}/artwork`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!garment) {
    return null
  }

  const totalQty = getTotalQuantity()
  const meetsMinimum = totalQty >= 24

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="fixed top-4 left-0 right-0 z-50 transition-all duration-300 flex justify-center px-4">
        <div className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-lg rounded-full px-8 py-3 flex items-center gap-4">
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
          <nav className="flex items-center gap-2">
            <div className="relative">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full text-sm font-black">2</span>
              {/* Subtle save indicator overlaid on step number */}
              {isAuthenticated && saveStatus !== 'idle' && (
                <span className={`absolute -top-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                  saveStatus === 'saving' ? 'bg-white shadow-sm' : 'bg-emerald-500'
                }`}>
                  {saveStatus === 'saving' ? (
                    <span className="w-2 h-2 border-[1.5px] border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-charcoal-700 whitespace-nowrap">Configure Order</span>
          </nav>
          
          {/* Account Button */}
          <div className="border-l border-charcoal-200 pl-4 ml-2">
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-surface-200 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-white/50 transition-colors"
                >
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
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-surface-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-surface-100">
                      <p className="text-sm font-bold text-charcoal-700 truncate">
                        {customer?.name || 'Welcome!'}
                      </p>
                      <p className="text-xs text-charcoal-400 truncate">{customer?.email || user?.email || 'Signed in'}</p>
                    </div>
                    
                    <Link
                      href="/account"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Account
                    </Link>
                    
                    <Link
                      href="/account/orders"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Order History
                    </Link>
                    
                    <div className="border-t border-surface-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          signOut()
                          setShowDropdown(false)
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal()}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/50 transition-colors"
                title="Sign In"
              >
                <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center text-charcoal-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Garment Info */}
            <div className="bento-card mb-6 bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200">
              <h2 className="text-3xl font-black text-charcoal-700 mb-2">{garment.name}</h2>
              <p className="text-charcoal-500 font-semibold">{garment.brand}</p>
            </div>

            {/* Step Indicators */}
            <div className="bento-card mb-6">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((stepNum) => (
                  <button
                    key={stepNum}
                    onClick={() => setStep(stepNum)}
                    className={`flex items-center gap-3 transition-all ${step === stepNum ? 'scale-105' : 'opacity-50 hover:opacity-75'}`}
                  >
                    <div className={`w-12 h-12 rounded-bento flex items-center justify-center font-black text-lg transition-all ${
                      step === stepNum ? 'bg-primary-500 text-white shadow-bento' : 'bg-surface-100 text-charcoal-400'
                    }`}>
                      {stepNum}
                    </div>
                    <span className="hidden sm:block font-bold text-charcoal-700">
                      {stepNum === 1 && 'Colors'}
                      {stepNum === 2 && 'Sizes'}
                      {stepNum === 3 && 'Print'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1: Color Selection */}
            {step === 1 && (
              <div className="bento-card mb-6">
                <h3 className="text-3xl font-black text-charcoal-700 mb-3 tracking-tight">Choose Colors</h3>
                <p className="text-charcoal-500 mb-8 text-lg">
                  Select one or more colors for your order. You can mix sizes across colors.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {garment.available_colors.map((color) => {
                    const isSelected = selectedColors.includes(color)
                    const imageUrl = garment.color_images?.[color] || garment.thumbnail_url
                    
                    return (
                      <button
                        key={color}
                        onClick={() => handleColorToggle(color)}
                        className={`relative border-4 rounded-bento-lg overflow-hidden transition-all hover:shadow-bento ${
                          isSelected 
                            ? 'border-primary-500 shadow-bento ring-4 ring-primary-200' 
                            : 'border-surface-300 hover:border-primary-300'
                        }`}
                      >
                        <div className="aspect-square bg-surface-100 relative">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={color}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full p-1.5 shadow-bento">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className={`p-3 text-center font-bold transition-colors ${
                          isSelected ? 'bg-primary-500 text-white' : 'bg-white text-charcoal-700'
                        }`}>
                          {color}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {selectedColors.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-br from-success-50 to-success-100 rounded-bento-lg border border-success-200">
                    <div className="flex items-center gap-2 text-success-700">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-bold">
                        {selectedColors.length} color{selectedColors.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Sizes & Quantities */}
            {step === 2 && (
              <div className="space-y-6 mb-6">
                <div className="bento-card">
                  <h3 className="text-3xl font-black text-charcoal-700 mb-3 tracking-tight">Sizes & Quantities</h3>
                  <p className="text-charcoal-500 mb-8 text-lg">
                    Enter quantities for each size per color. Minimum order: 24 pieces total across all colors.
                  </p>
                </div>

                {selectedColors.map((color) => {
                  const imageUrl = garment.color_images?.[color] || garment.thumbnail_url
                  const colorTotal = getColorTotal(color)
                  
                  return (
                    <div key={color} className="bento-card border-2 border-surface-300">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-20 h-20 rounded-bento overflow-hidden border-2 border-surface-300 flex-shrink-0">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={color}
                              width={80}
                              height={80}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-surface-100"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-2xl font-black text-charcoal-700">{color}</h4>
                          <p className="text-sm font-bold text-charcoal-500">
                            Subtotal: <span className="text-primary-500">{colorTotal}</span> pieces
                          </p>
                        </div>
                        <button
                          onClick={() => removeColor(color)}
                          className="text-error-500 hover:text-error-600 font-bold text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {SIZES.map((size) => (
                          <div key={size}>
                            <label className="block text-sm font-bold text-charcoal-600 mb-2 uppercase tracking-wide">
                              {size}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={colorSizeQuantities[color]?.[size as keyof typeof colorSizeQuantities[string]] || ''}
                              onChange={(e) => handleColorSizeQuantityChange(color, size, e.target.value)}
                              className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                <div className="bento-card bg-gradient-to-br from-surface-50 to-surface-100 border-2 border-surface-300">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-charcoal-600 text-lg">Total Quantity:</span>
                    <span className={`text-5xl font-black tracking-tight ${meetsMinimum ? 'text-primary-500' : 'text-error-500'}`}>
                      {totalQty}
                    </span>
                  </div>
                  {!meetsMinimum && totalQty > 0 && (
                    <div className="mt-4 p-3 bg-error-50 rounded-xl border border-error-200">
                      <p className="text-error-700 font-bold text-sm">
                        Need {24 - totalQty} more to meet minimum
                      </p>
                    </div>
                  )}
                  {meetsMinimum && (
                    <div className="mt-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-success-700 font-bold text-sm">Minimum met!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Print Details */}
            {step === 3 && (
              <div className="space-y-6 mb-6">
                <div className="bento-card">
                  <h3 className="text-3xl font-black text-charcoal-700 mb-3 tracking-tight">Print Locations</h3>
                  <p className="text-charcoal-500 mb-8 text-lg">
                    Choose where you want your design printed and how many ink colors for each location.
                  </p>
                  <div className="space-y-4">
                    {PRINT_LOCATIONS.map(({ value, label }) => (
                      <div key={value} className="border-2 border-surface-300 rounded-bento-lg p-6 hover:border-primary-300 transition-all">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={printConfig.locations[value]?.enabled || false}
                              onChange={(e) => togglePrintLocation(value, e.target.checked)}
                              className="w-6 h-6 text-primary-500 rounded-lg"
                            />
                            <span className="ml-4 font-black text-xl text-charcoal-700">{label}</span>
                          </label>
                          {printConfig.locations[value]?.enabled && (
                            <select
                              value={printConfig.locations[value]?.num_colors || 1}
                              onChange={(e) => setLocationColors(value, parseInt(e.target.value))}
                              className="border-2 border-surface-300 rounded-xl px-4 py-2 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                            >
                              <option value={1}>1 color</option>
                              <option value={2}>2 colors</option>
                              <option value={3}>3 colors</option>
                              <option value={4}>4 colors</option>
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bento-card">
                  <h3 className="text-2xl font-black text-charcoal-700 mb-6 tracking-tight">Additional Details</h3>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-black text-charcoal-600 mb-3 uppercase tracking-wide">
                      Organization/Event Name (optional)
                    </label>
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setCustomerInfo({ organizationName: e.target.value })}
                      className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                      placeholder="e.g., Smith Family Reunion 2025"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-black text-charcoal-600 mb-3 uppercase tracking-wide">
                      Need-by Date (optional)
                    </label>
                    <input
                      type="date"
                      value={needByDate}
                      onChange={(e) => setCustomerInfo({ needByDate: e.target.value })}
                      className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                    />
                    <p className="text-sm text-charcoal-400 mt-2 font-semibold">
                      Most orders ship in ~14 business days after art approval
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-8 py-4 border-2 border-surface-300 rounded-bento-lg font-black text-charcoal-700 hover:bg-surface-50 hover:shadow-soft transition-all"
                >
                  Back
                </button>
              ) : (
                <Link
                  href="/custom-shirts/configure"
                  className="px-8 py-4 border-2 border-surface-300 rounded-bento-lg font-black text-charcoal-700 hover:bg-surface-50 hover:shadow-soft transition-all inline-block"
                >
                  Back
                </Link>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!isStepValid(step)}
                  className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-bento-lg font-black shadow-soft hover:shadow-bento transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleContinueToArtwork}
                  disabled={!isStepValid(1) || !isStepValid(2) || !isStepValid(3)}
                  className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-bento-lg font-black shadow-soft hover:shadow-bento transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Artwork
                </button>
              )}
            </div>
          </div>

          {/* Quote Panel */}
          <div className="lg:col-span-1">
            <div className="bento-card sticky top-24 bg-gradient-to-br from-charcoal-700 to-charcoal-800 text-white">
              <h3 className="text-2xl font-black mb-6 tracking-tight">Live Quote</h3>
              
              {quote && meetsMinimum ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-white/70 font-semibold">Garments ({totalQty})</span>
                    <span className="font-black">${quote.garment_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 font-semibold">Print Cost</span>
                    <span className="font-black">${quote.print_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 font-semibold">Setup ({quote.total_screens} screens)</span>
                    <span className="font-black">${quote.setup_fees.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-white/90 font-black text-lg">Total</span>
                      <span className="text-4xl font-black text-primary-400">${quote.total.toFixed(2)}</span>
                    </div>
                    <div className="inline-block px-3 py-1 bg-white/10 rounded-full">
                      <p className="text-sm text-white/80 font-bold">
                        ${quote.per_shirt_price.toFixed(2)} per shirt
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-white/20 pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/70 font-semibold">Deposit ({Math.round((quote.deposit_amount / quote.total) * 100)}%)</span>
                      <span className="font-black text-data-green">${quote.deposit_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70 font-semibold">Balance Due</span>
                      <span className="font-black">${quote.balance_due.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  {totalQty < 24 ? (
                    <div>
                      <div className="text-6xl font-black text-white/20 mb-2">24</div>
                      <p className="text-white/70 font-semibold">Add at least 24 pieces to see pricing</p>
                    </div>
                  ) : (
                    <div className="animate-pulse">
                      <div className="text-white/50 font-bold">Loading quote...</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
