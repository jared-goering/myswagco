'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Garment, CampaignGarmentConfig, Campaign, PrintLocation, ArtworkTransform } from '@/types'
import dynamic from 'next/dynamic'

// Dynamically import the Konva-based renderer
const CampaignMockupRenderer = dynamic(
  () => import('@/components/CampaignMockupRenderer'),
  { 
    ssr: false, 
    loading: () => <div className="w-full aspect-square bg-surface-100 animate-pulse rounded-2xl" /> 
  }
)

interface CartItem {
  garmentId: string
  garment: Garment
  color: string
  size: string
  quantity: number
  pricePerItem: number
}

interface ProductCardProps {
  garment: Garment
  config: CampaignGarmentConfig
  campaign: Campaign
  onAddToCart: (item: CartItem) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
  isSingleStyle?: boolean
  isFree?: boolean // true when organizer_pays
}

export default function ProductCard({
  garment,
  config,
  campaign,
  onAddToCart,
  isExpanded = false,
  onToggleExpand,
  isSingleStyle = false,
  isFree = false,
}: ProductCardProps) {
  const [selectedColor, setSelectedColor] = useState<string>(config.colors[0] || '')
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [showSuccess, setShowSuccess] = useState(false)
  const [selectedView, setSelectedView] = useState<'front' | 'back'>('front')

  // Get available colors that have images
  const availableColors = config.colors.filter(color => garment.color_images?.[color])
  
  // Get available sizes
  const sizes = garment.size_range || ['S', 'M', 'L', 'XL', '2XL']

  // Check for front/back artwork
  const artworkUrls = campaign.artwork_urls || {}
  const hasFrontArtwork = !!artworkUrls['front']
  const hasBackArtwork = !!artworkUrls['back']
  const hasMultipleViews = hasFrontArtwork && hasBackArtwork

  // Get artwork for selected view
  const artworkLocation = selectedView === 'back' && hasBackArtwork ? 'back' 
    : hasFrontArtwork ? 'front' 
    : hasBackArtwork ? 'back' 
    : 'front'
  const artworkUrl = artworkUrls[artworkLocation] || null
  const artworkTransform = campaign.artwork_transforms?.[artworkLocation] as ArtworkTransform | undefined

  // Reset selections when expanding a different card
  useEffect(() => {
    if (isExpanded) {
      setSelectedColor(availableColors[0] || config.colors[0] || '')
      setSelectedSize('')
      setQuantity(1)
    }
  }, [isExpanded])

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) return

    onAddToCart({
      garmentId: garment.id,
      garment,
      color: selectedColor,
      size: selectedSize,
      quantity,
      pricePerItem: config.price,
    })

    // Show success feedback
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)

    // Reset for next item
    setSelectedSize('')
    setQuantity(1)
  }

  const isReadyToAdd = selectedSize && selectedColor

  // Collapsed card view
  if (!isExpanded && !isSingleStyle) {
    return (
      <motion.button
        onClick={onToggleExpand}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl border border-surface-200/50 overflow-hidden text-left transition-all duration-300 group"
      >
        {/* Product image */}
        <div className="relative aspect-square bg-gradient-to-br from-surface-50 to-surface-100 overflow-hidden">
          {garment.color_images?.[config.colors[0]] ? (
            <Image
              src={garment.color_images[config.colors[0]]}
              alt={garment.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            />
          ) : garment.thumbnail_url ? (
            <Image
              src={garment.thumbnail_url}
              alt={garment.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-surface-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Color dots preview */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5">
            {availableColors.slice(0, 6).map((color, idx) => (
              <div
                key={color}
                className="w-5 h-5 rounded-full border-2 border-white shadow-sm overflow-hidden"
              >
                {garment.color_images?.[color] && (
                  <Image
                    src={garment.color_images[color]}
                    alt={color}
                    width={20}
                    height={20}
                    className="object-cover w-full h-full"
                  />
                )}
              </div>
            ))}
            {availableColors.length > 6 && (
              <span className="text-xs font-bold text-charcoal-500 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
                +{availableColors.length - 6}
              </span>
            )}
          </div>
        </div>

        {/* Product info */}
        <div className="p-4">
          <h3 className="font-bold text-charcoal-700 text-lg mb-1 group-hover:text-teal-700 transition-colors">
            {garment.name}
          </h3>
          <p className="text-sm text-charcoal-500 mb-3">{garment.brand}</p>
          <div className="flex items-center justify-between">
            {isFree ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-charcoal-400 line-through">
                  ${config.price.toFixed(2)}
                </span>
                <span className="text-lg font-black text-emerald-600">Free</span>
              </div>
            ) : (
              <span className="text-2xl font-black text-charcoal-800">
                ${config.price.toFixed(2)}
              </span>
            )}
            <span className="text-sm text-teal-600 font-bold group-hover:translate-x-1 transition-transform">
              Select →
            </span>
          </div>
        </div>
      </motion.button>
    )
  }

  // Expanded card view (or single style)
  return (
    <motion.div
      initial={isSingleStyle ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl shadow-xl border border-surface-200/50 overflow-hidden ${
        isSingleStyle ? '' : 'col-span-full'
      }`}
    >
      <div className={`grid gap-0 ${isSingleStyle ? 'lg:grid-cols-2' : 'md:grid-cols-2'}`}>
        {/* Left: Product mockup */}
        <div className="relative bg-gradient-to-br from-surface-50 to-surface-100">
          {/* Back button for multi-style */}
          {!isSingleStyle && onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-xl text-sm font-bold text-charcoal-600 hover:text-charcoal-800 hover:bg-white shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Styles
            </button>
          )}

          {/* Front/Back toggle */}
          {hasMultipleViews && (
            <div className={`absolute ${isSingleStyle ? 'top-4 left-1/2 -translate-x-1/2' : 'top-4 right-4'} z-10 flex gap-1 bg-white/90 backdrop-blur-sm rounded-xl p-1 shadow-sm`}>
              <button
                onClick={() => setSelectedView('front')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedView === 'front'
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'text-charcoal-600 hover:bg-surface-100'
                }`}
              >
                Front
              </button>
              <button
                onClick={() => setSelectedView('back')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedView === 'back'
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'text-charcoal-600 hover:bg-surface-100'
                }`}
              >
                Back
              </button>
            </div>
          )}

          {/* Live mockup with artwork */}
          <div className={isSingleStyle ? 'aspect-square max-h-[60vh] lg:max-h-none' : 'aspect-square'}>
            <CampaignMockupRenderer
              garment={garment}
              activeColor={selectedColor}
              artworkUrl={artworkUrl}
              transform={artworkTransform || null}
              location={artworkLocation as PrintLocation}
            />
          </div>
        </div>

        {/* Right: Configuration */}
        <div className={`p-6 ${isSingleStyle ? 'lg:p-8' : 'md:p-8'} flex flex-col`}>
          {/* Product info */}
          <div className={`mb-6 ${isSingleStyle ? 'text-center lg:text-left' : ''}`}>
            <h2 className="text-2xl font-black text-charcoal-800 mb-1">{garment.name}</h2>
            <p className="text-charcoal-500">{garment.brand}</p>
            {isFree ? (
              <div className={`mt-2 flex items-center gap-3 ${isSingleStyle ? 'justify-center lg:justify-start' : ''}`}>
                <span className="text-xl font-bold text-charcoal-400 line-through">
                  ${config.price.toFixed(2)}
                </span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-black text-lg rounded-full">
                  Covered
                </span>
              </div>
            ) : (
              <p className="text-3xl font-black text-teal-600 mt-2">
                ${config.price.toFixed(2)}
              </p>
            )}
          </div>

          {/* Color selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-charcoal-600 mb-3">
              Color: <span className="text-charcoal-800">{selectedColor}</span>
            </label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {availableColors.map(color => {
                const isSelected = color === selectedColor
                const colorImage = garment.color_images?.[color]
                
                return (
                  <motion.button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    whileTap={{ scale: 0.95 }}
                    className={`relative w-14 h-14 sm:w-12 sm:h-12 rounded-xl overflow-hidden transition-all touch-manipulation ${
                      isSelected
                        ? 'ring-2 ring-teal-500 ring-offset-2 scale-105'
                        : 'hover:scale-105 ring-1 ring-surface-200'
                    }`}
                    title={color}
                  >
                    {colorImage ? (
                      <Image
                        src={colorImage}
                        alt={color}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-200 flex items-center justify-center text-xs text-charcoal-500">
                        {color.substring(0, 2)}
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Size selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-charcoal-600 mb-3">
              Size {selectedSize && <span className="text-charcoal-800">: {selectedSize}</span>}
            </label>
            <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-2">
              {sizes.map(size => {
                const isSelected = size === selectedSize
                return (
                  <motion.button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    whileTap={{ scale: 0.95 }}
                    className={`min-w-0 sm:min-w-[3rem] px-3 sm:px-4 py-3 sm:py-2.5 rounded-xl font-bold text-sm transition-all touch-manipulation ${
                      isSelected
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                        : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200 active:bg-surface-300'
                    }`}
                  >
                    {size}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-charcoal-600 mb-3">Quantity</label>
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 sm:w-12 sm:h-12 rounded-xl bg-surface-100 text-charcoal-600 font-bold text-xl hover:bg-surface-200 active:bg-surface-300 transition-colors flex items-center justify-center touch-manipulation"
              >
                −
              </motion.button>
              <span className="w-12 text-center text-2xl font-black text-charcoal-700">
                {quantity}
              </span>
              <motion.button
                onClick={() => setQuantity(quantity + 1)}
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 sm:w-12 sm:h-12 rounded-xl bg-surface-100 text-charcoal-600 font-bold text-xl hover:bg-surface-200 active:bg-surface-300 transition-colors flex items-center justify-center touch-manipulation"
              >
                +
              </motion.button>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Add to bag button */}
          <div className="space-y-3">
            <motion.button
              onClick={handleAddToCart}
              disabled={!isReadyToAdd}
              whileHover={isReadyToAdd ? { scale: 1.02 } : {}}
              whileTap={isReadyToAdd ? { scale: 0.98 } : {}}
              className={`w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                isReadyToAdd
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl'
                  : 'bg-surface-200 text-charcoal-400 cursor-not-allowed'
              }`}
            >
              <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Added to Bag!
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2"
                  >
                    {isFree ? (
                      <>
                        Add to Bag
                        <span className="text-white/60 line-through text-base">${(config.price * quantity).toFixed(2)}</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded text-sm">Free</span>
                      </>
                    ) : (
                      <>Add to Bag — ${(config.price * quantity).toFixed(2)}</>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {!isReadyToAdd && (
              <p className="text-center text-sm text-charcoal-400">
                {!selectedColor ? 'Select a color' : 'Select a size'} to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

