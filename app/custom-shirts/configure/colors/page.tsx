'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Garment, PrintLocation, MultiGarmentQuoteResponse } from '@/types'
import { useOrderStore } from '@/lib/store/orderStore'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
const PRINT_LOCATIONS: { value: PrintLocation; label: string; icon: 'front' | 'back' }[] = [
  { value: 'front', label: 'Front', icon: 'front' },
  { value: 'back', label: 'Back', icon: 'back' },
]

// Shirt icon component for print locations
function ShirtIcon({ side, className = '' }: { side: 'front' | 'back'; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      {side === 'front' ? (
        <>
          <path d="M6.5 3L2 7l2 2v11a1 1 0 001 1h14a1 1 0 001-1V9l2-2-4.5-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 3C6.5 3 8 5 12 5s5.5-2 5.5-2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" strokeDasharray="2 2" opacity="0.5" />
        </>
      ) : (
        <>
          <path d="M6.5 3L2 7l2 2v11a1 1 0 001 1h14a1 1 0 001-1V9l2-2-4.5-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 3C6.5 3 8 5 12 5s5.5-2 5.5-2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 10h8M8 14h8" strokeLinecap="round" opacity="0.3" />
        </>
      )}
    </svg>
  )
}

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

export default function ColorsQuantitiesPage() {
  const router = useRouter()
  const { isAuthenticated, customer, user, openAuthModal, signOut, isLoading: authLoading } = useCustomerAuth()
  
  const {
    selectedGarments,
    getSelectedGarmentIds,
    addGarmentColor,
    removeGarmentColor,
    setGarmentSizeQuantity,
    getGarmentColors,
    getGarmentQuantity,
    getTotalQuantity,
    printConfig,
    setPrintConfig,
    organizationName,
    needByDate,
    setCustomerInfo,
    multiGarmentQuote,
    setMultiGarmentQuote,
    saveDraft,
    draftId
  } = useOrderStore()

  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGarment, setExpandedGarment] = useState<string | null>(null)
  const [collapsedColorSections, setCollapsedColorSections] = useState<Set<string>>(new Set())
  const [showDropdown, setShowDropdown] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [justSelectedColor, setJustSelectedColor] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const selectedIds = getSelectedGarmentIds()

  // Redirect if no garments selected
  useEffect(() => {
    if (!loading && selectedIds.length === 0) {
      router.replace('/custom-shirts/configure')
    }
  }, [selectedIds.length, loading, router])

  // Set first garment as expanded by default (only on initial load)
  const hasSetInitialExpand = useRef(false)
  useEffect(() => {
    if (selectedIds.length > 0 && !hasSetInitialExpand.current) {
      setExpandedGarment(selectedIds[0])
      hasSetInitialExpand.current = true
    }
  }, [selectedIds])

  // Debounced save draft function
  const debouncedSaveDraft = useDebouncedCallback(
    useCallback(async () => {
      if (isAuthenticated && selectedIds.length > 0) {
        setSaveStatus('saving')
        await saveDraft()
        setSaveStatus('saved')
        
        if (saveStatusTimeoutRef.current) {
          clearTimeout(saveStatusTimeoutRef.current)
        }
        saveStatusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      }
    }, [isAuthenticated, selectedIds.length, saveDraft]),
    2000
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

  // Fetch garments
  useEffect(() => {
    fetchGarments()
  }, [])

  // Auto-save draft when changes are made
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      return
    }
    
    if (isAuthenticated && selectedIds.length > 0) {
      debouncedSaveDraft()
    }
  }, [selectedGarments, printConfig, organizationName, needByDate, isAuthenticated, selectedIds.length, debouncedSaveDraft])

  // Fetch quote when configuration changes
  useEffect(() => {
    const totalQty = getTotalQuantity()
    if (totalQty >= 24 && selectedIds.length > 0) {
      fetchMultiGarmentQuote()
    }
  }, [selectedGarments, printConfig])

  async function fetchGarments() {
    try {
      const response = await fetch('/api/garments')
      const data = await response.json()
      setGarments(data)
    } catch (error) {
      console.error('Error fetching garments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMultiGarmentQuote() {
    try {
      // Build request with per-garment quantities
      const garmentQuantities = selectedIds.map(id => ({
        garment_id: id,
        quantity: getGarmentQuantity(id)
      })).filter(g => g.quantity > 0)
      
      if (garmentQuantities.length === 0) return
      
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garments: garmentQuantities,
          print_config: printConfig,
          multi_garment: true
        })
      })
      
      if (response.ok) {
        const quoteData = await response.json()
        setMultiGarmentQuote(quoteData)
      }
    } catch (error) {
      console.error('Error fetching quote:', error)
    }
  }

  function handleColorToggle(garmentId: string, color: string) {
    const colors = getGarmentColors(garmentId)
    if (colors.includes(color)) {
      removeGarmentColor(garmentId, color)
    } else {
      addGarmentColor(garmentId, color)
      // Trigger pulse animation
      setJustSelectedColor(`${garmentId}-${color}`)
      setTimeout(() => setJustSelectedColor(null), 600)
    }
  }

  function handleSizeQuantityChange(garmentId: string, color: string, size: string, value: string) {
    const qty = parseInt(value) || 0
    setGarmentSizeQuantity(garmentId, color, size, qty)
  }

  function getColorTotal(garmentId: string, color: string): number {
    const colorQty = selectedGarments[garmentId]?.colorSizeQuantities[color] || {}
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

  // Validation
  const totalQty = getTotalQuantity()
  const meetsMinimum = totalQty >= 24
  const hasColors = selectedIds.some(id => getGarmentColors(id).length > 0)
  const hasPrintLocations = Object.values(printConfig.locations).some(loc => loc?.enabled)
  const canContinue = meetsMinimum && hasColors && hasPrintLocations

  // Get garment data for selected IDs
  const selectedGarmentData = useMemo(() => {
    return garments.filter(g => selectedIds.includes(g.id))
  }, [garments, selectedIds])

  async function handleContinue() {
    if (canContinue) {
      // Save draft immediately before navigating (don't wait for debounce)
      if (isAuthenticated) {
        await saveDraft()
      }
      router.push('/custom-shirts/configure/artwork')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-charcoal-500 font-medium">Loading your selection...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4] relative">
      {/* Subtle dot pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #d1d5db 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px'
        }}
      />
      
      {/* Header */}
      <header className="fixed top-4 left-0 right-0 z-50 transition-all duration-300 flex justify-center px-4">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-lg rounded-full px-8 py-3 flex items-center gap-4"
        >
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
          <nav className="flex items-center gap-3">
            {/* Step indicators */}
            <div className="flex items-center gap-1.5">
              <Link href="/custom-shirts/configure" className="w-6 h-6 bg-success-500 text-white rounded-full flex items-center justify-center text-xs font-black hover:bg-success-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="w-4 h-0.5 bg-surface-300 rounded-full" />
              <div className="relative">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full text-sm font-black">2</span>
                {/* Save indicator */}
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
              <div className="w-4 h-0.5 bg-surface-300 rounded-full" />
              <span className="w-6 h-6 bg-surface-300 text-charcoal-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div className="w-4 h-0.5 bg-surface-300 rounded-full" />
              <span className="w-6 h-6 bg-surface-300 text-charcoal-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            </div>
            <span className="text-sm font-bold text-charcoal-700 whitespace-nowrap ml-1">Colors & Quantities</span>
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
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
        </motion.div>
      </header>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-7 lg:px-9 py-8 pt-24 overflow-visible">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-5xl md:text-6xl font-black text-charcoal-700 mb-4 tracking-tight">
            Colors & Quantities
          </h1>
          <p className="text-xl text-charcoal-400 max-w-2xl mx-auto">
            Choose colors and enter quantities for each of your {selectedIds.length} selected {selectedIds.length === 1 ? 'style' : 'styles'}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Garment Accordion */}
            <AnimatePresence mode="popLayout">
              {selectedGarmentData.map((garment, index) => {
                const isExpanded = expandedGarment === garment.id
                const garmentColors = getGarmentColors(garment.id)
                const garmentQty = getGarmentQuantity(garment.id)
                const hasColorsSelected = garmentColors.length > 0
                
                return (
                  <motion.div
                    key={garment.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white rounded-2xl p-6 shadow-soft border transition-all duration-300 ${
                      isExpanded 
                        ? 'border-primary-200 shadow-lg' 
                        : 'border-surface-200/60 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Garment Header */}
                    <button
                      onClick={() => setExpandedGarment(isExpanded ? null : garment.id)}
                      className="w-full flex items-center gap-4 group"
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#f5f5f5] flex-shrink-0 relative">
                        {garment.thumbnail_url ? (
                          <Image
                            src={garment.thumbnail_url}
                            alt={garment.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5 w-6 h-6 bg-charcoal-700 text-white rounded-full flex items-center justify-center text-xs font-black shadow-sm">
                          {index + 1}
                        </div>
                      </div>
                      
                      <div className="flex-1 text-left">
                        <h3 className="text-xl font-black text-charcoal-700">{garment.name}</h3>
                        <p className="text-sm text-charcoal-400 font-semibold">{garment.brand}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {hasColorsSelected ? (
                            <>
                              <span className="text-sm font-bold text-primary-600">
                                {garmentColors.length} color{garmentColors.length !== 1 ? 's' : ''}
                              </span>
                              <span className="text-charcoal-300">•</span>
                              <span className="text-sm font-bold text-charcoal-600">
                                {garmentQty} pieces
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-primary-400 group-hover:text-primary-500 transition-colors">
                              Click to select colors →
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <AnimatePresence>
                          {hasColorsSelected && garmentQty > 0 && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              className="w-8 h-8 bg-success-100 text-success-600 rounded-full flex items-center justify-center"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center group-hover:bg-surface-200 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-charcoal-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </motion.div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-6 mt-4 border-t border-surface-200">
                            {/* Color Selection */}
                            <div className="mb-6 overflow-visible">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-black text-charcoal-700">Select colors</h4>
                                <button
                                  onClick={() => {
                                    const newCollapsed = new Set(collapsedColorSections)
                                    if (newCollapsed.has(garment.id)) {
                                      newCollapsed.delete(garment.id)
                                    } else {
                                      newCollapsed.add(garment.id)
                                    }
                                    setCollapsedColorSections(newCollapsed)
                                  }}
                                  className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
                                >
                                  {collapsedColorSections.has(garment.id) ? (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                      Show colors
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                      Hide colors
                                    </>
                                  )}
                                </button>
                              </div>
                              <AnimatePresence>
                                {!collapsedColorSections.has(garment.id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-visible p-1">
                                {garment.available_colors.map((color, colorIndex) => {
                                  const isSelected = garmentColors.includes(color)
                                  const imageUrl = garment.color_images?.[color] || garment.thumbnail_url
                                  const isJustSelected = justSelectedColor === `${garment.id}-${color}`
                                  
                                  return (
                                    <motion.button
                                      key={color}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: colorIndex * 0.03 }}
                                      onClick={() => handleColorToggle(garment.id, color)}
                                      className={`relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] ${
                                        isSelected 
                                          ? 'ring-2 ring-primary-500 shadow-lg' 
                                          : 'border-2 border-surface-200/80 hover:border-primary-300 hover:shadow-md'
                                      }`}
                                    >
                                      {/* Pulse overlay on selection */}
                                      <AnimatePresence>
                                        {isJustSelected && (
                                          <motion.div
                                            initial={{ opacity: 0.5, scale: 1 }}
                                            animate={{ opacity: 0, scale: 1.1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.5 }}
                                            className="absolute inset-0 bg-gradient-to-br from-primary-400/40 to-primary-500/30 z-20 pointer-events-none rounded-xl"
                                          />
                                        )}
                                      </AnimatePresence>
                                      
                                      <div className="aspect-square bg-[#f5f5f5] relative">
                                        {imageUrl ? (
                                          <Image
                                            src={imageUrl}
                                            alt={color}
                                            fill
                                            className="object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                          </div>
                                        )}
                                        
                                        {/* Selection checkmark with spring animation */}
                                        <AnimatePresence>
                                          {isSelected && (
                                            <motion.div
                                              initial={{ scale: 0, rotate: -45 }}
                                              animate={{ scale: 1, rotate: 0 }}
                                              exit={{ scale: 0, rotate: 45 }}
                                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                              className="absolute top-1.5 right-1.5 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-lg ring-2 ring-white z-10"
                                            >
                                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                              </svg>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                      <div className={`p-2 text-center font-bold text-xs transition-colors ${
                                        isSelected ? 'bg-primary-500 text-white' : 'bg-white text-charcoal-700'
                                      }`}>
                                        {color}
                                      </div>
                                    </motion.button>
                                  )
                                })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Size/Quantity Inputs per Color */}
                            {garmentColors.length > 0 && (
                              <div className="space-y-4">
                                <h4 className="text-lg font-black text-charcoal-700">Enter quantities</h4>
                                {garmentColors.map((color, colorIdx) => {
                                  const imageUrl = garment.color_images?.[color] || garment.thumbnail_url
                                  const colorTotal = getColorTotal(garment.id, color)
                                  
                                  return (
                                    <motion.div 
                                      key={color} 
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: colorIdx * 0.05 }}
                                      className="p-4 bg-surface-50/80 rounded-xl border border-surface-200/60"
                                    >
                                      <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-surface-200 flex-shrink-0 shadow-sm">
                                          {imageUrl ? (
                                            <Image
                                              src={imageUrl}
                                              alt={color}
                                              width={48}
                                              height={48}
                                              className="object-cover w-full h-full"
                                            />
                                          ) : (
                                            <div className="w-full h-full bg-surface-100"></div>
                                          )}
                                        </div>
                                        <div className="flex-1">
                                          <h5 className="font-black text-charcoal-700">{color}</h5>
                                          <p className="text-sm">
                                            <span className="text-charcoal-400 font-medium">Subtotal:</span>{' '}
                                            <span className={`font-bold ${colorTotal > 0 ? 'text-primary-600' : 'text-charcoal-400'}`}>
                                              {colorTotal} pieces
                                            </span>
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => removeGarmentColor(garment.id, color)}
                                          className="p-2 text-charcoal-400 hover:text-error-500 hover:bg-error-50 rounded-lg transition-colors"
                                          title="Remove color"
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                        {SIZES.map((size) => {
                                          const sizeValue = selectedGarments[garment.id]?.colorSizeQuantities[color]?.[size as keyof typeof selectedGarments[string]['colorSizeQuantities'][string]] || 0
                                          const hasValue = sizeValue > 0
                                          
                                          return (
                                            <div key={size} className="relative">
                                              <label className="block text-xs font-bold text-charcoal-500 mb-1.5 text-center uppercase tracking-wide">
                                                {size}
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                value={sizeValue || ''}
                                                onChange={(e) => handleSizeQuantityChange(garment.id, color, size, e.target.value)}
                                                className={`w-full border-2 rounded-xl px-2 py-2.5 text-center font-bold text-charcoal-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm ${
                                                  hasValue 
                                                    ? 'border-primary-300 bg-primary-50/50' 
                                                    : 'border-surface-200 bg-white hover:border-surface-300'
                                                }`}
                                                placeholder="0"
                                              />
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </motion.div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Print Locations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-soft border border-surface-200/60"
            >
              <h3 className="text-2xl font-black text-charcoal-700 mb-2 tracking-tight">Print Locations</h3>
              <p className="text-charcoal-400 mb-6 font-medium">
                Choose where you want your design printed. Same locations apply to all styles.
              </p>
              <div className="space-y-3">
                {PRINT_LOCATIONS.map(({ value, label, icon }) => {
                  const isEnabled = printConfig.locations[value]?.enabled || false
                  
                  return (
                    <motion.div 
                      key={value} 
                      className={`relative border-2 rounded-xl p-4 transition-all cursor-pointer ${
                        isEnabled 
                          ? 'border-primary-300 bg-primary-50/30' 
                          : 'border-surface-200 hover:border-primary-200 hover:bg-surface-50'
                      }`}
                      onClick={() => togglePrintLocation(value, !isEnabled)}
                      whileTap={{ scale: 0.995 }}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-4 cursor-pointer flex-1">
                          {/* Custom checkbox */}
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isEnabled 
                              ? 'bg-primary-500 border-primary-500' 
                              : 'border-surface-300 bg-white'
                          }`}>
                            {isEnabled && (
                              <motion.svg 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-4 h-4 text-white" 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </motion.svg>
                            )}
                          </div>
                          
                          {/* Shirt icon */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            isEnabled ? 'bg-primary-100' : 'bg-surface-100'
                          }`}>
                            <ShirtIcon 
                              side={icon} 
                              className={`w-6 h-6 ${isEnabled ? 'text-primary-600' : 'text-charcoal-400'}`} 
                            />
                          </div>
                          
                          <span className={`font-black text-lg transition-colors ${
                            isEnabled ? 'text-charcoal-700' : 'text-charcoal-600'
                          }`}>
                            {label}
                          </span>
                        </label>
                        
                        {isEnabled && (
                          <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={printConfig.locations[value]?.num_colors || 1}
                              onChange={(e) => setLocationColors(value, parseInt(e.target.value))}
                              className="border-2 border-surface-200 rounded-xl px-4 py-2.5 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all outline-none bg-white cursor-pointer"
                            >
                              <option value={1}>1 color</option>
                              <option value={2}>2 colors</option>
                              <option value={3}>3 colors</option>
                              <option value={4}>4 colors</option>
                            </select>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* Additional Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 shadow-soft border border-surface-200/60"
            >
              <h3 className="text-2xl font-black text-charcoal-700 mb-6 tracking-tight">Additional Details</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-charcoal-500 mb-2 uppercase tracking-wide">
                    Organization/Event Name
                    <span className="text-charcoal-400 font-medium normal-case tracking-normal ml-1">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setCustomerInfo({ organizationName: e.target.value })}
                      className="w-full border-2 border-surface-200 rounded-xl px-4 py-3 font-medium text-charcoal-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all outline-none bg-white hover:border-surface-300 placeholder:text-charcoal-300"
                      placeholder="e.g., Smith Family Reunion 2025"
                    />
                    {organizationName && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="w-5 h-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal-500 mb-2 uppercase tracking-wide">
                    Need-by Date
                    <span className="text-charcoal-400 font-medium normal-case tracking-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={needByDate}
                    onChange={(e) => setCustomerInfo({ needByDate: e.target.value })}
                    className="w-full border-2 border-surface-200 rounded-xl px-4 py-3 font-medium text-charcoal-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all outline-none bg-white hover:border-surface-300"
                  />
                  <p className="text-sm text-charcoal-400 mt-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Most orders ship in ~14 business days after art approval
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <Link
                href="/custom-shirts/configure"
                className="group px-6 py-3.5 bg-white border-2 border-surface-200 rounded-xl font-bold text-charcoal-600 hover:bg-surface-50 hover:border-surface-300 hover:shadow-soft transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Styles
              </Link>
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className="group px-8 py-3.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-black shadow-soft hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                Continue to Artwork
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quote Panel */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-24 bg-gradient-to-br from-charcoal-700 via-charcoal-800 to-charcoal-900 text-white rounded-2xl p-6 shadow-xl"
            >
              <h3 className="text-2xl font-black mb-6 tracking-tight">Order Summary</h3>
              
              {/* Garment breakdown */}
              <div className="space-y-3 mb-6">
                {selectedGarmentData.map((garment, index) => {
                  const garmentQty = getGarmentQuantity(garment.id)
                  const garmentColors = getGarmentColors(garment.id)
                  
                  return (
                    <div key={garment.id} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 relative ring-1 ring-white/10">
                        {garment.thumbnail_url ? (
                          <Image
                            src={garment.thumbnail_url}
                            alt={garment.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white/50 text-xs font-bold">{index + 1}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{garment.name}</p>
                        <p className="text-white/50 text-xs">
                          {garmentColors.length} color{garmentColors.length !== 1 ? 's' : ''} • {garmentQty} pcs
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Quantity Progress Ring */}
              <div className="border-t border-white/10 pt-6 mb-4">
                <div className="flex items-center gap-5">
                  {/* Progress Ring */}
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      {/* Background ring */}
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        className="text-white/10"
                      />
                      {/* Progress ring */}
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        strokeLinecap="round"
                        className={meetsMinimum ? 'text-success-400' : 'text-primary-400'}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: Math.min(totalQty / 24, 1) }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{
                          strokeDasharray: '201',
                          strokeDashoffset: '0'
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span 
                        key={totalQty}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-2xl font-black ${meetsMinimum ? 'text-success-400' : totalQty > 0 ? 'text-primary-400' : 'text-white/40'}`}
                      >
                        {totalQty}
                      </motion.span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-white/60 text-sm font-medium mb-1">Total Quantity</p>
                    {meetsMinimum ? (
                      <div className="flex items-center gap-2">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <svg className="w-5 h-5 text-success-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </motion.div>
                        <span className="text-success-400 font-bold text-sm">Minimum met!</span>
                      </div>
                    ) : totalQty > 0 ? (
                      <p className="text-primary-300 font-bold text-sm">
                        {24 - totalQty} more needed
                      </p>
                    ) : (
                      <p className="text-white/40 font-medium text-sm">
                        24 piece minimum
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quote */}
              {multiGarmentQuote && meetsMinimum ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 pt-4 border-t border-white/10"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Garments</span>
                    <span className="font-bold">${multiGarmentQuote.garment_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Print Cost</span>
                    <span className="font-bold">${multiGarmentQuote.print_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Setup ({multiGarmentQuote.total_screens} screens)</span>
                    <span className="font-bold">${multiGarmentQuote.setup_fees.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="flex justify-between items-baseline mb-3">
                      <span className="text-white/80 font-bold">Estimated Total</span>
                      <span className="text-3xl font-black text-primary-400">${multiGarmentQuote.total.toFixed(2)}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
                      <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <p className="text-sm text-white/70 font-bold">
                        ~${multiGarmentQuote.per_shirt_price.toFixed(2)} per shirt
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : !meetsMinimum ? (
                <div className="text-center py-4 border-t border-white/10">
                  <p className="text-white/50 font-medium text-sm">
                    Add at least 24 pieces to see pricing
                  </p>
                </div>
              ) : (
                <div className="py-6 border-t border-white/10">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-white/50 font-medium text-sm text-center mt-3">Calculating quote...</p>
                </div>
              )}

              {/* Validation Checklist */}
              <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                {[
                  { label: 'Colors selected', checked: hasColors },
                  { label: 'Minimum 24 pieces', checked: meetsMinimum },
                  { label: 'Print location selected', checked: hasPrintLocations },
                ].map(({ label, checked }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      checked ? 'bg-success-500' : 'border-2 border-white/20'
                    }`}>
                      {checked && (
                        <motion.svg 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 text-white" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </motion.svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${checked ? 'text-white' : 'text-white/40'}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

