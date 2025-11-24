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
  
  if (issues.length === 0 || isDismissed) {
    return null
  }
  
  const blockers = issues.filter(i => i.severity === 'blocker')
  const warnings = issues.filter(i => i.severity === 'warning')
  const infos = issues.filter(i => i.severity === 'info')
  const processingCount = issues.filter(i => i.isProcessing).length
  
  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bento-card mb-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-black text-charcoal-700 flex items-center gap-2">
              {processingCount > 0 ? (
                <>
                  <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing
                </>
              ) : blockers.length > 0 ? (
                <>
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Action Required
                </>
              ) : warnings.length > 0 ? (
                <>
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Recommendations
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Information
                </>
              )}
            </h3>
            <p className="text-sm text-charcoal-500 font-semibold mt-1">
              {processingCount > 0
                ? `Vectorizing ${processingCount} file${processingCount > 1 ? 's' : ''}... Please wait.`
                : blockers.length > 0 
                ? `${blockers.length} issue${blockers.length > 1 ? 's' : ''} blocking checkout`
                : warnings.length > 0
                ? `${warnings.length} recommendation${warnings.length > 1 ? 's' : ''} for better results`
                : `${infos.length} tip${infos.length > 1 ? 's' : ''}`
              }
            </p>
          </div>
          
          {warnings.length > 0 && blockers.length === 0 && (
            <button
              onClick={handleDismiss}
              className="text-charcoal-400 hover:text-charcoal-600 transition-colors p-1"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {/* Blockers */}
          {blockers.map((issue) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`
                p-4 border-2 rounded-lg
                ${issue.isProcessing 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-red-50 border-red-200'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {issue.isProcessing ? (
                    <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${issue.isProcessing ? 'text-blue-900' : 'text-red-900'}`}>
                    {getLocationLabel(issue.location)}
                  </p>
                  <p className={`text-sm font-semibold mt-1 ${issue.isProcessing ? 'text-blue-700' : 'text-red-700'}`}>
                    {issue.message}
                  </p>
                  {issue.action && (
                    <button
                      onClick={issue.action.onClick}
                      disabled={issue.isProcessing}
                      className={`
                        mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors
                        ${issue.isProcessing 
                          ? 'bg-blue-500 text-white cursor-wait' 
                          : 'bg-red-600 text-white hover:bg-red-700'
                        }
                      `}
                    >
                      {issue.isProcessing ? (
                        <>
                          <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Vectorizing...
                        </>
                      ) : (
                        <>
                          {issue.action.label}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Warnings */}
          {warnings.map((issue) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-900">
                    {getLocationLabel(issue.location)}
                  </p>
                  <p className="text-sm text-amber-700 font-semibold mt-1">
                    {issue.message}
                  </p>
                  {issue.action && (
                    <button
                      onClick={issue.action.onClick}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold text-sm"
                    >
                      {issue.action.label}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Info */}
          {infos.map((issue) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-blue-900">
                    {getLocationLabel(issue.location)}
                  </p>
                  <p className="text-sm text-blue-700 font-semibold mt-1">
                    {issue.message}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

