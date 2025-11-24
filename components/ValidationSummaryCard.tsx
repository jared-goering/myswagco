'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PrintLocation } from '@/types'

export interface ValidationIssue {
  id: string
  type: 'vectorization' | 'quality' | 'colors' | 'missing'
  severity: 'blocker' | 'warning' | 'info'
  location: PrintLocation
  message: string
  isProcessing?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface ValidationSummaryCardProps {
  issues: ValidationIssue[]
  getLocationLabel: (location: PrintLocation) => string
  onDismiss?: () => void
}

export default function ValidationSummaryCard({ 
  issues, 
  getLocationLabel,
  onDismiss 
}: ValidationSummaryCardProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  
  if (issues.length === 0 || isDismissed) {
    return null
  }
  
  const blockers = issues.filter(i => i.severity === 'blocker')
  const warnings = issues.filter(i => i.severity === 'warning')
  const processingCount = issues.filter(i => i.isProcessing).length
  
  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  // Compact mode: only warnings, no blockers
  const isCompactMode = blockers.length === 0 && warnings.length > 0

  // If in compact mode and not expanded, show just a dismissible inline badge
  if (isCompactMode && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 flex items-center gap-2"
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold hover:bg-amber-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {warnings.length} tip{warnings.length > 1 ? 's' : ''}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          onClick={handleDismiss}
          className="text-charcoal-400 hover:text-charcoal-600 transition-colors p-1"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    )
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`mt-4 rounded-bento-lg border-2 overflow-hidden ${
          blockers.length > 0 
            ? 'border-red-200 bg-red-50' 
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 ${
          blockers.length > 0 ? 'bg-red-100/50' : 'bg-amber-100/50'
        }`}>
          <div className="flex items-center gap-2">
            {processingCount > 0 ? (
              <>
                <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-bold text-blue-700">Processing...</span>
              </>
            ) : blockers.length > 0 ? (
              <>
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-bold text-red-700">
                  {blockers.length} issue{blockers.length > 1 ? 's' : ''} blocking checkout
                </span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-bold text-amber-700">
                  {warnings.length} tip{warnings.length > 1 ? 's' : ''} for better results
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {isCompactMode && (
              <button
                onClick={() => setIsExpanded(false)}
                className="text-amber-500 hover:text-amber-700 transition-colors p-1"
                aria-label="Collapse"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
            {warnings.length > 0 && blockers.length === 0 && (
              <button
                onClick={handleDismiss}
                className="text-charcoal-400 hover:text-charcoal-600 transition-colors p-1"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Issues List - Compact */}
        <div className="px-4 py-3 space-y-2">
          {/* Blockers */}
          {blockers.map((issue) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {issue.isProcessing ? (
                  <svg className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={`text-sm font-semibold truncate ${issue.isProcessing ? 'text-blue-700' : 'text-red-700'}`}>
                  <strong>{getLocationLabel(issue.location)}:</strong> {issue.message}
                </span>
              </div>
              {issue.action && !issue.isProcessing && (
                <button
                  onClick={issue.action.onClick}
                  className="flex-shrink-0 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-xs"
                >
                  {issue.action.label}
                </button>
              )}
            </motion.div>
          ))}
          
          {/* Warnings */}
          {warnings.map((issue) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold text-amber-700 truncate">
                  <strong>{getLocationLabel(issue.location)}:</strong> {issue.message}
                </span>
              </div>
              {issue.action && (
                <button
                  onClick={issue.action.onClick}
                  className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold text-xs"
                >
                  {issue.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
