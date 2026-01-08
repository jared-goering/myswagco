'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Garment } from '@/types'

interface GarmentPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (garments: Garment[]) => void
  excludeGarmentIds: string[] // IDs of garments already in the campaign
}

export default function GarmentPickerModal({
  isOpen,
  onClose,
  onSelect,
  excludeGarmentIds,
}: GarmentPickerModalProps) {
  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch garments when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchGarments()
      setSelectedIds(new Set())
      setSearchQuery('')
    }
  }, [isOpen])

  async function fetchGarments() {
    try {
      setLoading(true)
      const response = await fetch('/api/garments')
      if (response.ok) {
        const data = await response.json()
        setGarments(data)
      }
    } catch (err) {
      console.error('Error fetching garments:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter out already-added garments and apply search
  const availableGarments = useMemo(() => {
    const excludeSet = new Set(excludeGarmentIds)
    return garments
      .filter(g => !excludeSet.has(g.id))
      .filter(g => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        return (
          g.name.toLowerCase().includes(query) ||
          g.brand.toLowerCase().includes(query) ||
          g.category?.toLowerCase().includes(query)
        )
      })
  }, [garments, excludeGarmentIds, searchQuery])

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

  function toggleGarment(garmentId: string) {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(garmentId)) {
        newSet.delete(garmentId)
      } else {
        newSet.add(garmentId)
      }
      return newSet
    })
  }

  function handleConfirm() {
    const selectedGarments = garments.filter(g => selectedIds.has(g.id))
    onSelect(selectedGarments)
    onClose()
  }

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
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 flex-shrink-0">
              <div>
                <h2 className="text-xl font-black text-charcoal-700">Add Garment Styles</h2>
                <p className="text-sm text-charcoal-500">
                  Select one or more styles to add to this campaign
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-charcoal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-4 border-b border-surface-200 flex-shrink-0">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, brand, or category..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-surface-300 rounded-xl text-charcoal-700 font-medium focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : availableGarments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="font-bold text-charcoal-600">
                    {searchQuery ? 'No garments match your search' : 'All garments are already added'}
                  </p>
                  <p className="text-sm text-charcoal-500 mt-1">
                    {searchQuery ? 'Try a different search term' : 'This campaign has all available styles'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {availableGarments.map((garment) => {
                    const isSelected = selectedIds.has(garment.id)
                    const price = garment.customer_price || garment.base_cost * 1.5
                    
                    return (
                      <button
                        key={garment.id}
                        onClick={() => toggleGarment(garment.id)}
                        className={`relative bg-white rounded-xl border-2 overflow-hidden transition-all text-left group ${
                          isSelected
                            ? 'border-primary-500 ring-2 ring-primary-200'
                            : 'border-surface-200 hover:border-surface-300 hover:shadow-md'
                        }`}
                      >
                        {/* Selection indicator */}
                        <div
                          className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary-500 text-white'
                              : 'bg-white/90 border-2 border-surface-300 group-hover:border-primary-300'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>

                        {/* Image */}
                        <div className="aspect-square bg-surface-50 relative">
                          {garment.thumbnail_url ? (
                            <Image
                              src={garment.thumbnail_url}
                              alt={garment.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 25vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-3">
                          <p className="text-xs font-bold text-charcoal-400 uppercase tracking-wide">
                            {garment.brand}
                          </p>
                          <p className="font-bold text-charcoal-700 text-sm line-clamp-2 leading-tight mt-0.5">
                            {garment.name}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-black text-primary-600">
                              ${price.toFixed(2)}
                            </span>
                            <span className="text-xs text-charcoal-400">
                              {garment.available_colors.length} colors
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between flex-shrink-0 bg-surface-50">
              <div className="text-sm text-charcoal-600">
                {selectedIds.size > 0 ? (
                  <span className="font-bold">
                    {selectedIds.size} style{selectedIds.size !== 1 ? 's' : ''} selected
                  </span>
                ) : (
                  <span>Select styles to add</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-charcoal-600 font-bold hover:bg-surface-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={selectedIds.size === 0}
                  className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Selected
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}





