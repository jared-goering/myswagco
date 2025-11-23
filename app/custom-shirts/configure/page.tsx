'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Garment } from '@/types'

type SortOption = 'name-asc' | 'name-desc' | 'brand-asc' | 'price-asc' | 'price-desc'

export default function GarmentSelection() {
  const router = useRouter()
  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set())
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

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

  function handleSelectGarment(garmentId: string) {
    router.push(`/custom-shirts/configure/${garmentId}`)
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
        sorted.sort((a, b) => a.base_cost - b.base_cost)
        break
      case 'price-desc':
        sorted.sort((a, b) => b.base_cost - a.base_cost)
        break
    }

    return sorted
  }, [garments, selectedCategory, searchQuery, selectedBrands, selectedColors, sortBy])

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
  const activeFilterCount = (selectedBrands.size > 0 ? 1 : 0) + (selectedColors.size > 0 ? 1 : 0)

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory('All')
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
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="fixed top-4 left-0 right-0 z-50 transition-all duration-300 flex justify-center px-4">
        <div className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-lg rounded-full px-8 py-3 flex items-center gap-4">
          <Link href="/custom-shirts" className="hover:opacity-80 transition-opacity">
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
            <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full text-sm font-black">1</span>
            <span className="text-sm font-bold text-charcoal-700 whitespace-nowrap">Choose Garment</span>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-charcoal-700 mb-4 tracking-tight">
            Choose Your Garment
          </h1>
          <p className="text-xl text-charcoal-400 max-w-2xl mx-auto">
            Select from our curated collection of premium blanks
          </p>
        </div>

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
            {/* Filters Section */}
            <div className="mb-8 space-y-4">
              {/* Search Bar and Sort */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, brand, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 border border-surface-300 rounded-bento-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium text-charcoal-700 placeholder-charcoal-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-charcoal-400 hover:text-charcoal-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none w-full md:w-auto pl-4 pr-10 py-3 border border-surface-300 rounded-bento-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-bold text-charcoal-700 bg-white cursor-pointer"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="brand-asc">Brand (A-Z)</option>
                    <option value="price-asc">Price (Low to High)</option>
                    <option value="price-desc">Price (High to Low)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
                      selectedCategory === category
                        ? 'bg-primary-500 text-white shadow-soft'
                        : 'bg-white text-charcoal-600 border border-surface-300 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    {category}
                    <span className={`ml-2 ${selectedCategory === category ? 'text-white/80' : 'text-charcoal-400'}`}>
                      ({categoryCounts[category] || 0})
                    </span>
                  </button>
                ))}
              </div>

              {/* Advanced Filters Toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-charcoal-600 hover:text-primary-600 transition-colors"
                >
                  <svg 
                    className={`h-5 w-5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Advanced Filters
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-primary-500 text-white text-xs font-black rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {(searchQuery || selectedCategory !== 'All' || activeFilterCount > 0) && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 text-sm font-bold text-charcoal-500 hover:text-error-600 transition-colors"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="bento-card bg-white space-y-6 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Brand Filter */}
                    <div>
                      <h3 className="text-lg font-black text-charcoal-700 mb-3">Filter by Brand</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableBrands.map((brand) => (
                          <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedBrands.has(brand)}
                              onChange={() => toggleBrand(brand)}
                              className="w-4 h-4 text-primary-500 border-surface-300 rounded focus:ring-primary-500"
                            />
                            <span className="font-semibold text-charcoal-600 group-hover:text-charcoal-800">
                              {brand}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Color Filter */}
                    <div>
                      <h3 className="text-lg font-black text-charcoal-700 mb-3">Filter by Color</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableColors.slice(0, 20).map((color) => (
                          <label key={color} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedColors.has(color)}
                              onChange={() => toggleColor(color)}
                              className="w-4 h-4 text-primary-500 border-surface-300 rounded focus:ring-primary-500"
                            />
                            <span className="font-semibold text-charcoal-600 group-hover:text-charcoal-800">
                              {color}
                            </span>
                          </label>
                        ))}
                        {availableColors.length > 20 && (
                          <p className="text-xs text-charcoal-400 italic pt-2">
                            Showing first 20 colors
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div className="mb-6">
              <p className="text-lg font-bold text-charcoal-600">
                {filteredGarments.length === 0 ? (
                  'No garments found'
                ) : (
                  <>
                    Showing <span className="text-primary-600">{filteredGarments.length}</span> {filteredGarments.length === 1 ? 'garment' : 'garments'}
                    {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                  </>
                )}
              </p>
            </div>

            {/* Garments Grid */}
            {filteredGarments.length > 0 ? (
              <div className="bento-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredGarments.map((garment) => (
                  <div
                    key={garment.id}
                    className="bento-card-hover overflow-hidden group"
                  >
                    <div className="aspect-square bg-surface-100 rounded-bento mb-6 relative overflow-hidden">
                      {garment.thumbnail_url ? (
                        <Image
                          src={garment.thumbnail_url}
                          alt={garment.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                          <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {garment.category && (
                        <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-black text-charcoal-700">
                          {garment.category}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-charcoal-700 mb-1">
                        {garment.name}
                      </h3>
                      <p className="text-sm text-charcoal-400 font-semibold mb-3">{garment.brand}</p>
                      <p className="text-charcoal-500 mb-4 line-clamp-2 leading-relaxed">
                        {garment.description}
                      </p>
                      <div className="mb-6">
                        <p className="text-sm text-charcoal-500 font-semibold mb-2">Available colors:</p>
                        <div className="flex flex-wrap gap-2">
                          {garment.available_colors.slice(0, 5).map((color) => (
                            <span key={color} className="text-xs bg-surface-100 px-3 py-1.5 rounded-full font-semibold text-charcoal-600">
                              {color}
                            </span>
                          ))}
                          {garment.available_colors.length > 5 && (
                            <span className="text-xs text-charcoal-400 font-semibold">
                              +{garment.available_colors.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectGarment(garment.id)}
                        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-black py-4 rounded-bento-lg transition-all shadow-soft hover:shadow-bento"
                      >
                        Select This Garment
                      </button>
                    </div>
                  </div>
                ))}
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
          </>
        )}

        {!loading && !error && garments.length === 0 && (
          <div className="bento-card text-center text-charcoal-500">
            <p className="text-lg">No garments available at this time. Please check back later.</p>
          </div>
        )}
      </div>
    </div>
  )
}

