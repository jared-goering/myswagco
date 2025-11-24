'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PrintLocation, ArtworkFile } from '@/types'

interface ValidationIssue {
  type: 'vectorization' | 'quality' | 'colors'
  location: PrintLocation
  message: string
  action?: () => void
}

interface ArtworkProgressChecklistProps {
  enabledLocations: PrintLocation[]
  artworkFiles: Record<string, File | null>
  artworkFileRecords: Record<string, ArtworkFile | null>
  detectedColors: Record<string, number>
  maxInkColors: number
  activeTab: PrintLocation | null
  onTabChange: (location: PrintLocation) => void
  getLocationLabel: (location: PrintLocation) => string
}

export default function ArtworkProgressChecklist({
  enabledLocations,
  artworkFiles,
  artworkFileRecords,
  detectedColors,
  maxInkColors,
  activeTab,
  onTabChange,
  getLocationLabel,
}: ArtworkProgressChecklistProps) {
  
  // Calculate progress
  const totalSteps = enabledLocations.length * 2 // Upload + Vectorize for each
  let completedSteps = 0
  
  const locationStatus = enabledLocations.map(location => {
    const file = artworkFiles[location]
    const record = artworkFileRecords[location]
    // Consider artwork present if we have a File OR a persisted record with a URL
    const hasFile = !!file || (!!record && (!!record.file_url || !!record.vectorized_file_url))
    const isVector = record?.is_vector || false
    const isVectorized = record?.vectorization_status === 'completed'
    const isProcessing = record?.vectorization_status === 'processing'
    const needsVectorization = hasFile && !isVector && !isVectorized
    const colors = detectedColors[location] || 0
    const hasColorIssue = colors > maxInkColors
    
    if (hasFile) completedSteps++
    if (hasFile && (isVector || isVectorized)) completedSteps++
    
    return {
      location,
      hasFile,
      isVector,
      isVectorized,
      isProcessing,
      needsVectorization,
      hasColorIssue,
      colors,
      status: !hasFile 
        ? 'missing' 
        : needsVectorization 
        ? 'needs-action' 
        : isProcessing 
        ? 'processing' 
        : 'complete'
    }
  })
  
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100)
  const isComplete = progressPercentage === 100
  const hasBlockers = locationStatus.some(s => s.needsVectorization)
  const hasWarnings = locationStatus.some(s => s.hasColorIssue)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bento-card mb-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-black text-charcoal-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Artwork Checklist
          </h3>
          <p className="text-sm text-charcoal-500 font-semibold mt-1">
            {isComplete ? 'All ready for checkout!' : `${completedSteps} of ${totalSteps} steps complete`}
          </p>
        </div>
        
        {/* Progress Circle */}
        <div className="relative w-16 h-16">
          <svg className="transform -rotate-90 w-16 h-16">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-surface-200"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
              animate={{ 
                strokeDashoffset: 2 * Math.PI * 28 * (1 - progressPercentage / 100)
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={isComplete ? "text-emerald-500" : "text-primary-500"}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isComplete ? (
              <motion.svg 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-8 h-8 text-emerald-600"
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </motion.svg>
            ) : (
              <span className="text-sm font-black text-charcoal-700">{progressPercentage}%</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-surface-200 rounded-full h-2 mb-4 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-primary-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      {/* Location Status List */}
      <div className="space-y-2">
        {locationStatus.map(({ location, hasFile, isVector, isVectorized, isProcessing, needsVectorization, hasColorIssue, colors, status }) => (
          <motion.button
            key={location}
            onClick={() => hasFile && onTabChange(location)}
            className={`
              w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left
              ${activeTab === location 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50'
              }
              ${!hasFile ? 'opacity-60' : ''}
            `}
            whileHover={hasFile ? { scale: 1.01 } : {}}
            whileTap={hasFile ? { scale: 0.99 } : {}}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {status === 'complete' ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : status === 'processing' ? (
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : status === 'needs-action' ? (
                  <motion.div 
                    className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-surface-300 bg-white" />
                )}
              </div>
              
              {/* Location Name */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-charcoal-700 truncate">
                  {getLocationLabel(location)}
                </p>
                {hasFile && (
                  <p className="text-xs text-charcoal-500 font-semibold">
                    {isProcessing ? 'Vectorizing...' :
                     needsVectorization ? 'Needs vectorization' :
                     isVectorized ? 'Vectorized' :
                     isVector ? 'Vector format' :
                     'Uploaded'}
                  </p>
                )}
              </div>
              
              {/* Warning Badge */}
              {hasColorIssue && (
                <div className="flex-shrink-0 ml-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {colors} colors
                  </span>
                </div>
              )}
            </div>
            
            {/* Arrow */}
            {hasFile && (
              <svg className="w-5 h-5 text-charcoal-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </motion.button>
        ))}
      </div>
      
      {/* Summary Messages */}
      <AnimatePresence>
        {hasBlockers && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg"
          >
            <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Vectorization required before checkout
            </p>
          </motion.div>
        )}
        
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg"
          >
            <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              All artwork is ready! You can proceed to checkout.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

