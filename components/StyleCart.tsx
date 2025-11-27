'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Garment } from '@/types'
import { useOrderStore } from '@/lib/store/orderStore'

interface StyleCartProps {
  garments: Garment[]
  onContinue: () => void
  onOpenChat?: () => void
  isInGrid?: boolean
  mobileOnly?: boolean
}

// Helper function to map color names to CSS colors for dot swatches
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
    'Orange': '#ea580c',
    'Gold': '#eab308',
    'Yellow': '#facc15',
    'Kelly Green': '#22c55e',
    'Forest Green': '#166534',
    'Charcoal': '#374151',
    'Heather Grey': '#9ca3af',
    'Sport Grey': '#9ca3af',
    'Light Blue': '#7dd3fc',
    'Purple': '#7c3aed',
    'Pink': '#ec4899',
    'Teal': '#0d9488',
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

export default function StyleCart({ garments, onContinue, onOpenChat, isInGrid = false, mobileOnly = false }: StyleCartProps) {
  const { removeGarment, getSelectedGarmentIds } = useOrderStore()
  const [showPulse, setShowPulse] = useState(false)
  const prevCountRef = useRef(0)
  
  const selectedIds = getSelectedGarmentIds()
  const selectedCount = selectedIds.length
  const selectedGarmentData = garments.filter(g => selectedIds.includes(g.id))
  
  // If mobileOnly, only render the mobile bar
  // If isInGrid, only render the desktop sidebar (sticky within grid)
  
  // Trigger pulse animation when items are added (not removed)
  useEffect(() => {
    if (selectedCount > prevCountRef.current) {
      setShowPulse(true)
      const timer = setTimeout(() => setShowPulse(false), 600)
      return () => clearTimeout(timer)
    }
    prevCountRef.current = selectedCount
  }, [selectedCount])

  const handleRemove = (garmentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeGarment(garmentId)
  }

  // Mobile only mode - just render mobile bar
  if (mobileOnly) {
    return (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="bg-gradient-to-r from-charcoal-800 to-charcoal-900 border-t border-white/5 px-4 py-4 shadow-2xl backdrop-blur-lg"
            >
              <div className="flex items-center gap-4 max-w-lg mx-auto">
                {/* Stacked thumbnails with overlap */}
                <div className="flex -space-x-3">
                  {selectedGarmentData.slice(0, 3).map((garment, idx) => (
                    <motion.div
                      key={garment.id}
                      initial={{ scale: 0, x: 20 }}
                      animate={{ scale: 1, x: 0 }}
                      transition={{ delay: idx * 0.1, type: 'spring', stiffness: 400 }}
                      className="w-11 h-11 rounded-xl overflow-hidden bg-white/10 border-2 border-charcoal-800 flex-shrink-0 relative shadow-lg"
                      style={{ zIndex: 3 - idx }}
                    >
                      {garment.thumbnail_url ? (
                        <Image src={garment.thumbnail_url} alt={garment.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/10" />
                      )}
                    </motion.div>
                  ))}
                  {selectedCount > 3 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-11 h-11 rounded-xl bg-primary-500 border-2 border-charcoal-800 flex items-center justify-center text-white text-xs font-black shadow-lg"
                    >
                      +{selectedCount - 3}
                    </motion.div>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-base">
                    {selectedCount} {selectedCount === 1 ? 'Style' : 'Styles'}
                  </p>
                  <p className="text-white/40 text-xs font-medium truncate">Tap continue to choose colors</p>
                </div>
                
                {/* Continue button */}
                <motion.button
                  onClick={onContinue}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-3 bg-primary-500 hover:bg-primary-400 text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-primary-500/20"
                >
                  <span>Continue</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Grid mode - sticky sidebar within grid column
  if (isInGrid) {
    return (
      <div className="sticky top-28 self-start">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-6 bg-gradient-to-br from-charcoal-600 via-charcoal-700 to-charcoal-800 text-white shadow-xl overflow-hidden relative"
        >
          {/* Subtle pattern background */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
              backgroundSize: '16px 16px'
            }}
          />
          
          <div className="relative z-10">
            {/* Header with count badge */}
            <div className="flex items-center gap-3 mb-6">
              <motion.div
                animate={showPulse ? { 
                  scale: [1, 1.15, 1],
                  boxShadow: ['0 0 0 0 rgba(255, 87, 34, 0)', '0 0 0 8px rgba(255, 87, 34, 0.3)', '0 0 0 0 rgba(255, 87, 34, 0)']
                } : {}}
                transition={{ duration: 0.5 }}
                className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <span className="text-white font-black text-xl">{selectedCount}</span>
              </motion.div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Selected Styles</h3>
                <p className="text-sm text-white/50 font-medium">
                  {selectedCount === 0 ? 'Pick your favorites!' : `${selectedCount} ${selectedCount === 1 ? 'style' : 'styles'} added`}
                </p>
              </div>
            </div>

            {/* Selected Items */}
            <div className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
              <AnimatePresence mode="popLayout">
                {selectedCount === 0 ? (
                  <motion.div
                    key="empty-state"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center py-10"
                  >
                    {/* Illustrated shirt icon */}
                    <div className="relative w-24 h-24 mx-auto mb-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-3xl" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-14 h-14 text-white/30" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20 12 L12 16 L12 24 L18 24 L18 52 L46 52 L46 24 L52 24 L52 16 L44 12" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M20 12 C20 12 24 20 32 20 C40 20 44 12 44 12" strokeLinecap="round" />
                        </svg>
                      </div>
                      <motion.div 
                        className="absolute -top-1 -right-1 text-primary-400"
                        animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L13.09 8.26L19 7L14.74 11.26L21 12L14.74 12.74L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.74L3 12L9.26 11.26L5 7L10.91 8.26L12 2Z" />
                        </svg>
                      </motion.div>
                      <motion.div 
                        className="absolute -bottom-1 -left-2 text-primary-300"
                        animate={{ rotate: [0, -10, 0], scale: [1, 1.15, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L13.09 8.26L19 7L14.74 11.26L21 12L14.74 12.74L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.74L3 12L9.26 11.26L5 7L10.91 8.26L12 2Z" />
                        </svg>
                      </motion.div>
                    </div>
                    <p className="text-white/70 font-bold text-base mb-1">No styles selected yet</p>
                    <p className="text-white/40 text-sm">Click on garments to add them here</p>
                  </motion.div>
                ) : (
                  selectedGarmentData.map((garment, index) => (
                    <motion.div
                      key={garment.id}
                      layout
                      initial={{ opacity: 0, x: 30, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -30, scale: 0.9 }}
                      transition={{ 
                        type: 'spring',
                        damping: 20,
                        stiffness: 300,
                        delay: index * 0.05
                      }}
                      className="group relative bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-sm rounded-xl p-3 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 shadow-inner">
                            {garment.thumbnail_url ? (
                              <Image
                                src={garment.thumbnail_url}
                                alt={garment.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/30">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="absolute -top-1 -left-1 w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-md ring-2 ring-charcoal-700">
                            {index + 1}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm truncate leading-tight">
                            {garment.name}
                          </h4>
                          <p className="text-xs text-white/40 font-medium truncate">
                            {garment.brand}
                          </p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className="flex -space-x-1">
                              {garment.available_colors.slice(0, 5).map((color, idx) => {
                                const colorImage = garment.color_images?.[color]
                                return (
                                  <div
                                    key={color}
                                    className="w-3.5 h-3.5 rounded-full border border-white/20 overflow-hidden"
                                    style={{ 
                                      backgroundColor: colorImage ? undefined : getColorValue(color),
                                      zIndex: 5 - idx
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
                            <span className="text-[10px] text-primary-400 font-bold ml-0.5">
                              {garment.available_colors.length} colors
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => handleRemove(garment.id, e)}
                          className="w-7 h-7 flex-shrink-0 bg-white/5 hover:bg-error-500/80 text-white/30 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200"
                          title="Remove"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Continue Button */}
            <div className="pt-4 border-t border-white/10">
              <motion.button
                onClick={onContinue}
                disabled={selectedCount === 0}
                whileHover={selectedCount > 0 ? { scale: 1.02 } : {}}
                whileTap={selectedCount > 0 ? { scale: 0.98 } : {}}
                className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all duration-300 ${
                  selectedCount > 0
                    ? 'bg-primary-500 hover:bg-primary-400 text-white shadow-lg hover:shadow-primary-500/30'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                <span>Continue</span>
                <motion.svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={selectedCount > 0 ? { x: [0, 3, 0] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </motion.svg>
              </motion.button>
              {selectedCount > 0 && (
                <p className="text-center text-xs text-white/30 font-medium mt-3">
                  Next: Choose colors & quantities
                </p>
              )}
            </div>

            {/* AI Chat Assistant Button */}
            {onOpenChat && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4"
              >
                <button
                  onClick={onOpenChat}
                  className="w-full group relative overflow-hidden rounded-xl p-[1px] transition-all duration-300 hover:scale-[1.02]"
                >
                  {/* Animated gradient border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity" 
                    style={{
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 3s linear infinite',
                    }}
                  />
                  
                  {/* Button content */}
                  <div className="relative flex items-center gap-3 px-4 py-3 bg-charcoal-800 rounded-[11px] transition-all group-hover:bg-charcoal-750">
                    {/* AI Icon with glow */}
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 transition-shadow">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Text */}
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-white group-hover:text-emerald-50 transition-colors">
                        Need help choosing?
                      </p>
                      <p className="text-xs text-white/50 group-hover:text-white/60 transition-colors">
                        Ask our AI Style Assistant
                      </p>
                    </div>
                    
                    {/* Arrow */}
                    <svg 
                      className="w-4 h-4 text-white/40 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                
                {/* Shimmer animation keyframes */}
                <style jsx>{`
                  @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                `}</style>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // Default: render both (legacy behavior)
  return (
    <>
      {/* Desktop Sidebar - aligned with "Showing X garments" results line */}
      <div className="hidden lg:block fixed right-6 top-[380px] w-[320px] z-40">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-6 bg-gradient-to-br from-charcoal-700 via-charcoal-750 to-charcoal-800 text-white shadow-2xl overflow-hidden relative"
        >
          {/* Subtle pattern background */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
              backgroundSize: '16px 16px'
            }}
          />
          
          <div className="relative z-10">
            {/* Header with count badge */}
            <div className="flex items-center gap-3 mb-6">
              <motion.div
                animate={showPulse ? { 
                  scale: [1, 1.15, 1],
                  boxShadow: ['0 0 0 0 rgba(255, 87, 34, 0)', '0 0 0 8px rgba(255, 87, 34, 0.3)', '0 0 0 0 rgba(255, 87, 34, 0)']
                } : {}}
                transition={{ duration: 0.5 }}
                className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <span className="text-white font-black text-xl">{selectedCount}</span>
              </motion.div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Selected Styles</h3>
                <p className="text-sm text-white/50 font-medium">
                  {selectedCount === 0 ? 'Pick your favorites!' : `${selectedCount} ${selectedCount === 1 ? 'style' : 'styles'} added`}
                </p>
              </div>
            </div>

            {/* Selected Items */}
            <div className="space-y-2 mb-6 max-h-[42vh] overflow-y-auto pr-1 scrollbar-thin">
              <AnimatePresence mode="popLayout">
                {selectedCount === 0 ? (
                  <motion.div
                    key="empty-state"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center py-10"
                  >
                    {/* Illustrated shirt icon */}
                    <div className="relative w-24 h-24 mx-auto mb-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-3xl" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* T-shirt outline SVG */}
                        <svg className="w-14 h-14 text-white/30" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20 12 L12 16 L12 24 L18 24 L18 52 L46 52 L46 24 L52 24 L52 16 L44 12" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M20 12 C20 12 24 20 32 20 C40 20 44 12 44 12" strokeLinecap="round" />
                        </svg>
                      </div>
                      {/* Sparkle decorations */}
                      <motion.div 
                        className="absolute -top-1 -right-1 text-primary-400"
                        animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L13.09 8.26L19 7L14.74 11.26L21 12L14.74 12.74L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.74L3 12L9.26 11.26L5 7L10.91 8.26L12 2Z" />
                        </svg>
                      </motion.div>
                      <motion.div 
                        className="absolute -bottom-1 -left-2 text-primary-300"
                        animate={{ rotate: [0, -10, 0], scale: [1, 1.15, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L13.09 8.26L19 7L14.74 11.26L21 12L14.74 12.74L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.74L3 12L9.26 11.26L5 7L10.91 8.26L12 2Z" />
                        </svg>
                      </motion.div>
                    </div>
                    <p className="text-white/70 font-bold text-base mb-1">No styles selected yet</p>
                    <p className="text-white/40 text-sm">Click on garments to add them here</p>
                  </motion.div>
                ) : (
                  selectedGarmentData.map((garment, index) => (
                    <motion.div
                      key={garment.id}
                      layout
                      initial={{ opacity: 0, x: 30, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -30, scale: 0.9 }}
                      transition={{ 
                        type: 'spring',
                        damping: 20,
                        stiffness: 300,
                        delay: index * 0.05
                      }}
                      className="group relative bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-sm rounded-xl p-3 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        {/* Thumbnail with index badge */}
                        <div className="relative flex-shrink-0">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 shadow-inner">
                            {garment.thumbnail_url ? (
                              <Image
                                src={garment.thumbnail_url}
                                alt={garment.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/30">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {/* Number badge - positioned outside overflow container */}
                          <div className="absolute -top-1 -left-1 w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-md ring-2 ring-charcoal-700">
                            {index + 1}
                          </div>
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm truncate leading-tight">
                            {garment.name}
                          </h4>
                          <p className="text-xs text-white/40 font-medium truncate">
                            {garment.brand}
                          </p>
                          {/* Color dot preview */}
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className="flex -space-x-1">
                              {garment.available_colors.slice(0, 5).map((color, idx) => {
                                const colorImage = garment.color_images?.[color]
                                return (
                                  <div
                                    key={color}
                                    className="w-3.5 h-3.5 rounded-full border border-white/20 overflow-hidden"
                                    style={{ 
                                      backgroundColor: colorImage ? undefined : getColorValue(color),
                                      zIndex: 5 - idx
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
                            <span className="text-[10px] text-primary-400 font-bold ml-0.5">
                              {garment.available_colors.length} colors
                            </span>
                          </div>
                        </div>
                        
                        {/* Remove button - always visible but subtle */}
                        <button
                          onClick={(e) => handleRemove(garment.id, e)}
                          className="w-7 h-7 flex-shrink-0 bg-white/5 hover:bg-error-500/80 text-white/30 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200"
                          title="Remove"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Continue Button */}
            <div className="pt-4 border-t border-white/10">
              <motion.button
                onClick={onContinue}
                disabled={selectedCount === 0}
                whileHover={selectedCount > 0 ? { scale: 1.02 } : {}}
                whileTap={selectedCount > 0 ? { scale: 0.98 } : {}}
                className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all duration-300 ${
                  selectedCount > 0
                    ? 'bg-primary-500 hover:bg-primary-400 text-white shadow-lg hover:shadow-primary-500/30'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                <span>Continue</span>
                <motion.svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={selectedCount > 0 ? { x: [0, 3, 0] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </motion.svg>
              </motion.button>
              {selectedCount > 0 && (
                <p className="text-center text-xs text-white/30 font-medium mt-3">
                  Next: Choose colors & quantities
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="bg-gradient-to-r from-charcoal-800 to-charcoal-900 border-t border-white/5 px-4 py-4 shadow-2xl backdrop-blur-lg"
            >
              <div className="flex items-center gap-4 max-w-lg mx-auto">
                {/* Stacked thumbnails with overlap */}
                <div className="flex -space-x-3">
                  {selectedGarmentData.slice(0, 3).map((garment, idx) => (
                    <motion.div
                      key={garment.id}
                      initial={{ scale: 0, x: 20 }}
                      animate={{ scale: 1, x: 0 }}
                      transition={{ delay: idx * 0.1, type: 'spring', stiffness: 400 }}
                      className="w-11 h-11 rounded-xl overflow-hidden bg-white/10 border-2 border-charcoal-800 flex-shrink-0 relative shadow-lg"
                      style={{ zIndex: 3 - idx }}
                    >
                      {garment.thumbnail_url ? (
                        <Image src={garment.thumbnail_url} alt={garment.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/10" />
                      )}
                    </motion.div>
                  ))}
                  {selectedCount > 3 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-11 h-11 rounded-xl bg-primary-500 border-2 border-charcoal-800 flex items-center justify-center text-white text-xs font-black shadow-lg"
                    >
                      +{selectedCount - 3}
                    </motion.div>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-base">
                    {selectedCount} {selectedCount === 1 ? 'Style' : 'Styles'}
                  </p>
                  <p className="text-white/40 text-xs font-medium truncate">Tap continue to choose colors</p>
                </div>
                
                {/* Continue button */}
                <motion.button
                  onClick={onContinue}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-3 bg-primary-500 hover:bg-primary-400 text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-primary-500/20"
                >
                  <span>Continue</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
