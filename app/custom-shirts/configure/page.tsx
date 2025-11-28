'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Garment } from '@/types'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { useOrderStore } from '@/lib/store/orderStore'
import StyleCart from '@/components/StyleCart'
import GarmentChatAssistant from '@/components/GarmentChatAssistant'
import GarmentQuickView from '@/components/GarmentQuickView'

type SortOption = 'name-asc' | 'name-desc' | 'brand-asc' | 'price-asc' | 'price-desc'

// Helper function to map color names to CSS colors for dot swatches
function getColorValue(colorName: string): string {
  const colorMap: Record<string, string> = {
    // Common colors
    'White': '#FFFFFF',
    'Black': '#1a1a1a',
    'Navy': '#1e3a5f',
    'Navy Blue': '#1e3a5f',
    'Royal': '#4169e1',
    'Royal Blue': '#4169e1',
    'Red': '#dc2626',
    'Cardinal': '#8b0000',
    'Maroon': '#800000',
    'Burgundy': '#722f37',
    'Orange': '#ea580c',
    'Gold': '#eab308',
    'Yellow': '#facc15',
    'Kelly Green': '#22c55e',
    'Forest Green': '#166534',
    'Hunter Green': '#14532d',
    'Charcoal': '#374151',
    'Heather Grey': '#9ca3af',
    'Sport Grey': '#9ca3af',
    'Athletic Heather': '#a1a1aa',
    'Ash': '#d4d4d8',
    'Light Blue': '#7dd3fc',
    'Carolina Blue': '#56a3d9',
    'Purple': '#7c3aed',
    'Pink': '#ec4899',
    'Hot Pink': '#ec4899',
    'Brown': '#78350f',
    'Tan': '#d4b896',
    'Sand': '#d4b896',
    'Khaki': '#c3b091',
    'Olive': '#4d7c0f',
    'Military Green': '#4b5320',
    'Camo': '#4b5320',
    'Teal': '#0d9488',
    'Turquoise': '#06b6d4',
    'Coral': '#f97316',
    'Mint': '#86efac',
    'Lavender': '#c4b5fd',
    'Cream': '#fef3c7',
    'Ivory': '#fffff0',
    'Slate': '#64748b',
    'Steel Blue': '#4682b4',
    'Safety Green': '#84cc16',
    'Safety Orange': '#fb923c',
    'Neon Yellow': '#facc15',
    'Graphite': '#4b5563',
    'Pewter': '#8e8e93',
    'Silver': '#c0c0c0',
  }
  
  // Try exact match first
  if (colorMap[colorName]) return colorMap[colorName]
  
  // Try case-insensitive match
  const lowerName = colorName.toLowerCase()
  for (const [key, value] of Object.entries(colorMap)) {
    if (key.toLowerCase() === lowerName) return value
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(colorMap)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return value
    }
  }
  
  // Default to a neutral gray
  return '#9ca3af'
}

export default function GarmentSelection() {
  const router = useRouter()
  const { isAuthenticated, customer, user, openAuthModal, signOut, isLoading: authLoading } = useCustomerAuth()
  const { addGarment, removeGarment, hasGarment, getSelectedGarmentIds, reset } = useOrderStore()
  
  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedFitType, setSelectedFitType] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set())
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Animation state for newly selected items
  const [justSelected, setJustSelected] = useState<string | null>(null)
  
  // Chat assistant state
  const [showChatAssistant, setShowChatAssistant] = useState(false)
  
  // Quick view state
  const [quickViewGarment, setQuickViewGarment] = useState<Garment | null>(null)

  const selectedGarmentIds = getSelectedGarmentIds()
  const selectedCount = selectedGarmentIds.length

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
    fetchGarments()
  }, [])

  async function fetchGarments() {
    try {
      const response = await fetch('/api/garments')
      if (!response.ok) throw new Error('Failed to fetch garments')
      const data = await response.json()
      setGarments(data)
    } catch (err) {
      setError('Failed to load garments. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleToggleGarment(garmentId: string) {
    if (hasGarment(garmentId)) {
      removeGarment(garmentId)
    } else {
      addGarment(garmentId)
      setJustSelected(garmentId)
      setTimeout(() => setJustSelected(null), 600)
    }
  }

  function handleContinue() {
    if (selectedCount > 0) {
      router.push('/custom-shirts/configure/colors')
    }
  }

  // Extract unique categories, brands, and colors from garments
  const categories = useMemo(() => {
    const cats = new Set<string>()
    garments.forEach(g => {
      if (g.category) cats.add(g.category)
    })
    return ['All', ...Array.from(cats).sort()]
  }, [garments])

  const availableBrands = useMemo(() => {
    const brands = new Set<string>()
    garments.forEach(g => brands.add(g.brand))
    return Array.from(brands).sort()
  }, [garments])

  const availableColors = useMemo(() => {
    const colors = new Set<string>()
    garments.forEach(g => {
      g.available_colors.forEach(c => colors.add(c))
    })
    return Array.from(colors).sort()
  }, [garments])

  // Filter and sort garments
  const filteredGarments = useMemo(() => {
    let filtered = garments

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(g => g.category === selectedCategory)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.brand.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query)
      )
    }

    // Brand filter
    if (selectedBrands.size > 0) {
      filtered = filtered.filter(g => selectedBrands.has(g.brand))
    }

    // Color filter
    if (selectedColors.size > 0) {
      filtered = filtered.filter(g => 
        g.available_colors.some(c => selectedColors.has(c))
      )
    }

    // Fit type filter
    if (selectedFitType !== 'All') {
      filtered = filtered.filter(g => g.fit_type === selectedFitType)
    }

    // Sort
    const sorted = [...filtered]
    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'brand-asc':
        sorted.sort((a, b) => a.brand.localeCompare(b.brand))
        break
      case 'price-asc':
        sorted.sort((a, b) => (a.customer_price || a.base_cost * 1.5) - (b.customer_price || b.base_cost * 1.5))
        break
      case 'price-desc':
        sorted.sort((a, b) => (b.customer_price || b.base_cost * 1.5) - (a.customer_price || a.base_cost * 1.5))
        break
    }

    return sorted
  }, [garments, selectedCategory, selectedFitType, searchQuery, selectedBrands, selectedColors, sortBy])

  // Count garments per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: garments.length }
    garments.forEach(g => {
      if (g.category) {
        counts[g.category] = (counts[g.category] || 0) + 1
      }
    })
    return counts
  }, [garments])

  // Active filter count
  const activeFilterCount = (selectedBrands.size > 0 ? 1 : 0) + (selectedColors.size > 0 ? 1 : 0) + (selectedFitType !== 'All' ? 1 : 0)

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory('All')
    setSelectedFitType('All')
    setSearchQuery('')
    setSelectedBrands(new Set())
    setSelectedColors(new Set())
    setSortBy('name-asc')
  }

  // Toggle brand filter
  const toggleBrand = (brand: string) => {
    const newSet = new Set(selectedBrands)
    if (newSet.has(brand)) {
      newSet.delete(brand)
    } else {
      newSet.add(brand)
    }
    setSelectedBrands(newSet)
  }

  // Toggle color filter
  const toggleColor = (color: string) => {
    const newSet = new Set(selectedColors)
    if (newSet.has(color)) {
      newSet.delete(color)
    } else {
      newSet.add(color)
    }
    setSelectedColors(newSet)
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
              <span className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-black">1</span>
              <div className="w-4 h-0.5 bg-surface-300 rounded-full" />
              <span className="w-6 h-6 bg-surface-300 text-charcoal-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div className="w-4 h-0.5 bg-surface-300 rounded-full" />
              <span className="w-6 h-6 bg-surface-300 text-charcoal-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div className="w-4 h-0.5 bg-surface-300 rounded-full" />
              <span className="w-6 h-6 bg-surface-300 text-charcoal-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            </div>
            <span className="text-sm font-bold text-charcoal-700 whitespace-nowrap ml-1">Choose Styles</span>
            
            {/* Selected count badge */}
            <AnimatePresence>
              {selectedCount > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="ml-1 flex items-center gap-1.5 px-3 py-1 bg-charcoal-700 text-white rounded-full"
                >
                  <span className="text-xs font-black">{selectedCount} selected</span>
                </motion.div>
              )}
            </AnimatePresence>
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
                      href="/account/designs"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      My Designs
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
        </motion.div>
      </header>

      {/* Main Content */}
      <div className="relative pt-24">
        {/* Title section - truly centered */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-black text-charcoal-700 mb-4 tracking-tight">
              Choose Your Styles
            </h1>
            <p className="text-xl text-charcoal-400 max-w-2xl mx-auto">
              Select one or more styles for your order. You can mix different garment types!
            </p>
          </motion.div>
        </div>

        {/* Two-column grid layout */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
            {/* Main content column */}
            <div>
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <p className="mt-4 text-charcoal-500 font-medium">Loading garments...</p>
            </div>
          )}

          {error && (
            <div className="bento-card bg-error-50 border-2 border-error-200 text-error-700 mb-8">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Unified Filter Toolbar */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
              >
                {/* Main toolbar row - search, categories, sort */}
                <div className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-3 mb-3">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    {/* Search Bar */}
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search styles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 bg-surface-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:bg-white font-medium text-charcoal-700 placeholder-charcoal-400 text-sm transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-charcoal-400 hover:text-charcoal-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="hidden lg:block w-px h-8 bg-surface-200" />

                    {/* Category Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin flex-shrink-0">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            selectedCategory === category
                              ? 'bg-primary-500 text-white shadow-sm'
                              : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                          }`}
                        >
                          {category}
                          <span className={`ml-1.5 ${selectedCategory === category ? 'text-white/80' : 'text-charcoal-400'}`}>
                            ({categoryCounts[category] || 0})
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="hidden lg:block w-px h-8 bg-surface-200" />

                    {/* Sort Dropdown */}
                    <div className="relative flex-shrink-0">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="appearance-none pl-3 pr-8 py-2.5 bg-surface-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 font-bold text-charcoal-700 text-sm cursor-pointer transition-all"
                      >
                        <option value="name-asc">A-Z</option>
                        <option value="name-desc">Z-A</option>
                        <option value="brand-asc">Brand</option>
                        <option value="price-asc">Price ↑</option>
                        <option value="price-desc">Price ↓</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary row - filters toggle and count */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${
                        showAdvancedFilters || activeFilterCount > 0 
                          ? 'text-primary-600 bg-primary-50' 
                          : 'text-charcoal-500 hover:text-charcoal-700 hover:bg-surface-100'
                      }`}
                    >
                      <svg 
                        className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-primary-500 text-white text-xs font-black rounded-full">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>

                    {(searchQuery || selectedCategory !== 'All' || activeFilterCount > 0) && (
                      <button
                        onClick={clearAllFilters}
                        className="text-sm font-semibold text-charcoal-400 hover:text-error-500 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  
                  {/* Results count inline */}
                  <p className="text-sm font-medium text-charcoal-400">
                    <span className="font-bold text-charcoal-600">{filteredGarments.length}</span> {filteredGarments.length === 1 ? 'style' : 'styles'}
                    {selectedCategory !== 'All' && <span className="text-charcoal-400"> in {selectedCategory}</span>}
                  </p>
                </div>

              {/* Advanced Filters Panel */}
              <AnimatePresence>
                {showAdvancedFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-3"
                  >
                    <div className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Fit Type Filter */}
                        <div>
                          <h3 className="text-sm font-black text-charcoal-700 mb-3 uppercase tracking-wide">Fit Type</h3>
                          <div className="flex flex-wrap gap-2">
                            {(['All', 'unisex', 'womens', 'youth'] as const).map((fit) => (
                              <button
                                key={fit}
                                onClick={() => setSelectedFitType(fit)}
                                className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                                  selectedFitType === fit
                                    ? 'bg-violet-500 text-white shadow-sm'
                                    : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                                }`}
                              >
                                {fit === 'All' ? 'All' : fit === 'unisex' ? 'Unisex' : fit === 'womens' ? "Women's" : 'Youth'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Brand Filter */}
                        <div>
                          <h3 className="text-sm font-black text-charcoal-700 mb-3 uppercase tracking-wide">Brand</h3>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                            {availableBrands.map((brand) => (
                              <label key={brand} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-surface-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={selectedBrands.has(brand)}
                                  onChange={() => toggleBrand(brand)}
                                  className="w-4 h-4 text-primary-500 border-surface-300 rounded focus:ring-primary-500"
                                />
                                <span className="font-semibold text-charcoal-600 group-hover:text-charcoal-800 text-sm">
                                  {brand}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Color Filter */}
                        <div>
                          <h3 className="text-sm font-black text-charcoal-700 mb-3 uppercase tracking-wide">Color</h3>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                            {availableColors.slice(0, 20).map((color) => (
                              <label key={color} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-surface-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={selectedColors.has(color)}
                                  onChange={() => toggleColor(color)}
                                  className="w-4 h-4 text-primary-500 border-surface-300 rounded focus:ring-primary-500"
                                />
                                <div 
                                  className="w-4 h-4 rounded-full border border-surface-300 shadow-inner"
                                  style={{ backgroundColor: getColorValue(color) }}
                                />
                                <span className="font-semibold text-charcoal-600 group-hover:text-charcoal-800 text-sm">
                                  {color}
                                </span>
                              </label>
                            ))}
                            {availableColors.length > 20 && (
                              <p className="text-xs text-charcoal-400 italic pt-2 pl-2">
                                +{availableColors.length - 20} more colors
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Garments Grid */}
            {filteredGarments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <AnimatePresence mode="popLayout">
                  {filteredGarments.map((garment, index) => {
                    const isSelected = hasGarment(garment.id)
                    const isJustSelected = justSelected === garment.id
                    const colorCount = garment.available_colors.length
                    
                    return (
                      <motion.div
                        key={garment.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ 
                          delay: index * 0.03,
                        }}
                        className={`group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border ${
                          isSelected 
                            ? 'shadow-lg ring-2 ring-primary-500 border-primary-200' 
                            : 'shadow-soft border-surface-200/60 hover:shadow-lg hover:-translate-y-1 hover:border-surface-300'
                        }`}
                        onClick={() => handleToggleGarment(garment.id)}
                      >
                        {/* Selection checkmark */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 45 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              className="absolute top-3 right-3 z-20"
                            >
                              <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Soft pulse overlay on select */}
                        <AnimatePresence>
                          {isJustSelected && (
                            <motion.div
                              initial={{ opacity: 0.4, scale: 1 }}
                              animate={{ opacity: 0, scale: 1.02 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.5 }}
                              className="absolute inset-0 bg-gradient-to-br from-primary-400/30 to-primary-500/20 z-10 pointer-events-none rounded-2xl"
                            />
                          )}
                        </AnimatePresence>

                        {/* Image container with consistent background */}
                        <div className="aspect-square bg-[#f5f5f5] relative overflow-hidden">
                          {garment.thumbnail_url ? (
                            <Image
                              src={garment.thumbnail_url}
                              alt={garment.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          
                          {/* Category badge */}
                          {garment.category && (
                            <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold text-charcoal-600 shadow-sm">
                              {garment.category}
                            </div>
                          )}
                          
                          {/* Quick view button - appears on hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setQuickViewGarment(garment)
                            }}
                            className="absolute bottom-3 left-3 right-3 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl text-sm font-bold text-charcoal-700 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white flex items-center justify-center gap-2 transform translate-y-2 group-hover:translate-y-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                          
                          {/* Bottom gradient for better text readability */}
                          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                        
                        {/* Card content */}
                        <div className="p-4">
                          <div className="mb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="text-lg font-black text-charcoal-700 leading-tight mb-0.5">
                                  {garment.name}
                                </h3>
                                <p className="text-sm text-charcoal-400 font-semibold">{garment.brand}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-black text-charcoal-800">
                                  ${(garment.customer_price || garment.base_cost * 1.5).toFixed(2)}
                                </p>
                                <p className="text-xs text-charcoal-400 font-medium">per shirt</p>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-charcoal-500 text-sm mb-4 line-clamp-2 leading-relaxed">
                            {garment.description}
                          </p>
                          
                          {/* Color dots with count - use actual product images when available */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-1.5">
                              <div className="flex -space-x-1.5">
                                {garment.available_colors.slice(0, 6).map((color, idx) => {
                                  const colorImage = garment.color_images?.[color]
                                  return (
                                    <div
                                      key={color}
                                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5 overflow-hidden"
                                      style={{ 
                                        backgroundColor: colorImage ? undefined : getColorValue(color),
                                        zIndex: 6 - idx
                                      }}
                                      title={color}
                                    >
                                      {colorImage && (
                                        <img 
                                          src={colorImage} 
                                          alt={color}
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                              {colorCount > 6 && (
                                <span className="text-xs font-bold text-charcoal-400 ml-1">
                                  +{colorCount - 6}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-primary-600">
                              {colorCount} colors
                            </span>
                          </div>
                          
                          {/* Action button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleGarment(garment.id)
                            }}
                            className={`w-full font-bold py-2.5 rounded-xl text-sm transition-all duration-200 ${
                              isSelected
                                ? 'bg-charcoal-800 text-white shadow-sm hover:bg-charcoal-900'
                                : 'bg-surface-100 text-charcoal-600 hover:bg-primary-500 hover:text-white'
                            }`}
                          >
                            {isSelected ? (
                              <span className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Selected
                              </span>
                            ) : (
                              'Add to Order'
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bento-card text-center py-16">
                <svg className="w-24 h-24 mx-auto mb-6 text-charcoal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-2xl font-black text-charcoal-700 mb-2">No Garments Found</h3>
                <p className="text-charcoal-500 mb-6">
                  Try adjusting your filters or search query to find what you're looking for.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-bento-lg transition-all shadow-soft"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {garments.length === 0 && (
              <div className="bento-card text-center text-charcoal-500">
                <p className="text-lg">No garments available at this time. Please check back later.</p>
              </div>
            )}
          </>
        )}
            </div>
            
            {/* Sidebar column */}
            <aside className="hidden lg:block">
              <StyleCart 
                garments={garments} 
                onContinue={handleContinue}
                onOpenChat={() => setShowChatAssistant(true)}
                isInGrid={true}
              />
            </aside>
          </div>
        </div>
      </div>

      {/* Mobile Style Cart (bottom bar only) */}
      <StyleCart 
        garments={garments} 
        onContinue={handleContinue}
        mobileOnly={true}
      />

      {/* AI Chat Assistant Modal */}
      <GarmentChatAssistant
        isOpen={showChatAssistant}
        onClose={() => setShowChatAssistant(false)}
        garments={garments}
        onAddGarment={(garmentId) => {
          addGarment(garmentId)
          setJustSelected(garmentId)
          setTimeout(() => setJustSelected(null), 600)
        }}
        selectedGarmentIds={selectedGarmentIds}
      />

      {/* Garment Quick View Modal */}
      <GarmentQuickView
        garment={quickViewGarment}
        isOpen={!!quickViewGarment}
        onClose={() => setQuickViewGarment(null)}
        isSelected={quickViewGarment ? hasGarment(quickViewGarment.id) : false}
        onToggleSelect={(garmentId) => {
          handleToggleGarment(garmentId)
        }}
      />
    </div>
  )
}
