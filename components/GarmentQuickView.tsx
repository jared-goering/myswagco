'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Garment } from '@/types'

interface GarmentQuickViewProps {
  garment: Garment | null
  isOpen: boolean
  onClose: () => void
  isSelected: boolean
  onToggleSelect: (garmentId: string) => void
}

// Helper function to map color names to CSS colors for fallback swatches
function getColorValue(colorName: string): string {
  const colorMap: Record<string, string> = {
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
    'Graphite': '#4b5563',
    'Pewter': '#8e8e93',
    'Silver': '#c0c0c0',
  }
  
  if (colorMap[colorName]) return colorMap[colorName]
  
  const lowerName = colorName.toLowerCase()
  for (const [key, value] of Object.entries(colorMap)) {
    if (key.toLowerCase() === lowerName) return value
  }
  
  for (const [key, value] of Object.entries(colorMap)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return value
    }
  }
  
  return '#9ca3af'
}

// Format fit type for display
function formatFitType(fitType?: string): string {
  if (!fitType) return 'Unisex'
  switch (fitType) {
    case 'unisex': return 'Unisex'
    case 'womens': return "Women's"
    case 'mens': return "Men's"
    case 'youth': return 'Youth'
    default: return fitType.charAt(0).toUpperCase() + fitType.slice(1)
  }
}

export default function GarmentQuickView({
  garment,
  isOpen,
  onClose,
  isSelected,
  onToggleSelect,
}: GarmentQuickViewProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [showAllColors, setShowAllColors] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Reset selected color when garment changes
  useEffect(() => {
    if (garment && garment.available_colors.length > 0) {
      // Default to first color with an image, or just first color
      const colorWithImage = garment.available_colors.find(c => garment.color_images?.[c])
      setSelectedColor(colorWithImage || garment.available_colors[0])
    }
    setShowAllColors(false)
  }, [garment])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!garment) return null

  const currentImage = selectedColor && garment.color_images?.[selectedColor]
    ? garment.color_images[selectedColor]
    : garment.thumbnail_url

  const colorCount = garment.available_colors.length
  const displayedColors = showAllColors 
    ? garment.available_colors 
    : garment.available_colors.slice(0, 12)
  const hasMoreColors = colorCount > 12 && !showAllColors

  const price = garment.customer_price || garment.base_cost * 1.5

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white hover:shadow-xl transition-all group"
              aria-label="Close quick view"
            >
              <svg className="w-5 h-5 text-charcoal-500 group-hover:text-charcoal-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 max-h-[90vh]">
              {/* Left column - Image gallery */}
              <div className="bg-[#f5f5f5] p-6 md:p-8 flex flex-col md:max-h-[90vh] md:overflow-y-auto">
                {/* Main image */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-soft mb-4 flex-shrink-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentImage || 'placeholder'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0"
                    >
                      {currentImage ? (
                        <Image
                          src={currentImage}
                          alt={`${garment.name} in ${selectedColor || 'default'}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                          <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Selected color label */}
                  {selectedColor && (
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-md">
                      <span className="text-sm font-bold text-charcoal-700">{selectedColor}</span>
                    </div>
                  )}
                </div>

                {/* Color swatches grid */}
                <div className="flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-black text-charcoal-500 uppercase tracking-wider">
                      Select Color
                    </h4>
                    <span className="text-xs font-bold text-charcoal-400">
                      {colorCount} available
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-2 px-2">
                    {displayedColors.map((color) => {
                      const colorImage = garment.color_images?.[color]
                      const isActive = selectedColor === color
                      
                      return (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`group relative aspect-square rounded-xl overflow-hidden transition-all duration-200 ${
                            isActive 
                              ? 'ring-2 ring-primary-500 ring-offset-2 scale-105 shadow-lg' 
                              : 'hover:scale-105 hover:shadow-md ring-1 ring-black/5'
                          }`}
                          title={color}
                          aria-label={`View ${color}`}
                        >
                          {colorImage ? (
                            <Image
                              src={colorImage}
                              alt={color}
                              fill
                              className="object-cover"
                              sizes="60px"
                            />
                          ) : (
                            <div 
                              className="w-full h-full" 
                              style={{ backgroundColor: getColorValue(color) }}
                            />
                          )}
                          
                          {/* Hover tooltip */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <span className="text-[10px] font-bold text-white truncate block text-center">
                              {color}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Show more button */}
                  {hasMoreColors && (
                    <button
                      onClick={() => setShowAllColors(true)}
                      className="mt-3 w-full py-2 text-sm font-bold text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-colors"
                    >
                      Show all {colorCount} colors
                    </button>
                  )}
                  
                  {showAllColors && colorCount > 12 && (
                    <button
                      onClick={() => setShowAllColors(false)}
                      className="mt-3 w-full py-2 text-sm font-bold text-charcoal-500 hover:text-charcoal-700 hover:bg-surface-100 rounded-xl transition-colors"
                    >
                      Show less
                    </button>
                  )}
                </div>
              </div>

              {/* Right column - Product details */}
              <div className="p-6 md:p-8 flex flex-col md:max-h-[90vh] md:overflow-y-auto">
                {/* Header */}
                <div className="mb-6">
                  {/* Brand */}
                  <p className="text-sm font-bold text-charcoal-400 uppercase tracking-wider mb-1">
                    {garment.brand}
                  </p>
                  
                  {/* Product name */}
                  <h2 className="text-2xl md:text-3xl font-black text-charcoal-800 tracking-tight leading-tight mb-3">
                    {garment.name}
                  </h2>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                      ${price.toFixed(2)}
                    </span>
                    <span className="text-sm font-medium text-charcoal-400">per shirt</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-surface-200 via-surface-300 to-surface-200 mb-6" />

                {/* Description */}
                <div className="mb-6 flex-1">
                  <h3 className="text-xs font-black text-charcoal-500 uppercase tracking-wider mb-3">
                    Description
                  </h3>
                  <p className="text-charcoal-600 leading-relaxed">
                    {garment.description}
                  </p>
                </div>

                {/* Specs grid */}
                <div className="mb-6">
                  <h3 className="text-xs font-black text-charcoal-500 uppercase tracking-wider mb-3">
                    Specifications
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Category */}
                    {garment.category && (
                      <div className="bg-surface-50 rounded-xl p-3">
                        <p className="text-xs font-medium text-charcoal-400 mb-1">Category</p>
                        <p className="text-sm font-bold text-charcoal-700">{garment.category}</p>
                      </div>
                    )}
                    
                    {/* Fit Type */}
                    <div className="bg-surface-50 rounded-xl p-3">
                      <p className="text-xs font-medium text-charcoal-400 mb-1">Fit</p>
                      <p className="text-sm font-bold text-charcoal-700">{formatFitType(garment.fit_type)}</p>
                    </div>
                    
                    {/* Colors count */}
                    <div className="bg-surface-50 rounded-xl p-3">
                      <p className="text-xs font-medium text-charcoal-400 mb-1">Colors</p>
                      <p className="text-sm font-bold text-charcoal-700">{colorCount} options</p>
                    </div>
                    
                    {/* Supplier */}
                    {garment.ss_style_id && (
                      <div className="bg-surface-50 rounded-xl p-3">
                        <p className="text-xs font-medium text-charcoal-400 mb-1">Style ID</p>
                        <p className="text-sm font-bold text-charcoal-700">{garment.ss_style_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Size range */}
                <div className="mb-8">
                  <h3 className="text-xs font-black text-charcoal-500 uppercase tracking-wider mb-3">
                    Available Sizes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {garment.size_range.map((size) => (
                      <span
                        key={size}
                        className="px-3 py-1.5 bg-surface-100 text-charcoal-700 rounded-lg text-sm font-bold"
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => onToggleSelect(garment.id)}
                  className={`w-full font-black py-4 rounded-2xl text-base transition-all duration-200 shadow-lg hover:shadow-xl ${
                    isSelected
                      ? 'bg-charcoal-800 text-white hover:bg-charcoal-900'
                      : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700'
                  }`}
                >
                  {isSelected ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Added to Order
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add to Order
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

