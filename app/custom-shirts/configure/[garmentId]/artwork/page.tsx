'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useOrderStore } from '@/lib/store/orderStore'
import { PrintLocation, ArtworkTransform } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import * as Popover from '@radix-ui/react-popover'
import * as Tabs from '@radix-ui/react-tabs'
import DesignEditor from '@/components/DesignEditor'
import FileUploadCard from '@/components/FileUploadCard'
import ArtworkGallery from '@/components/ArtworkGallery'
import Toast from '@/components/Toast'

export default function ArtworkUpload() {
  const router = useRouter()
  const params = useParams()
  const garmentId = params.garmentId as string

  const { printConfig, artworkFiles, setArtworkFile, artworkTransforms, setArtworkTransform } = useOrderStore()
  const [activeTab, setActiveTab] = useState<PrintLocation | null>(null)
  const [showGallery, setShowGallery] = useState(false)
  const [showRequirements, setShowRequirements] = useState(false)
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; show: boolean; confetti?: boolean }>({
    message: '',
    type: 'info',
    show: false,
  })

  const enabledLocations = Object.entries(printConfig.locations)
    .filter(([, config]) => config?.enabled)
    .map(([location]) => location as PrintLocation)

  // Set initial active tab to first enabled location
  useEffect(() => {
    if (enabledLocations.length > 0 && !activeTab) {
      setActiveTab(enabledLocations[0])
    }
  }, [enabledLocations.length])

  // Check if all files uploaded (only show toast once)
  useEffect(() => {
    const allUploaded = enabledLocations.every(location => artworkFiles[location])
    if (allUploaded && enabledLocations.length > 0 && !hasShownCompletionToast) {
      setHasShownCompletionToast(true)
      setToast({
        message: '🎉 All artwork uploaded successfully!',
        type: 'success',
        show: true,
        confetti: true,
      })
    }
    // Reset the flag if files are removed
    if (!allUploaded && hasShownCompletionToast) {
      setHasShownCompletionToast(false)
    }
  }, [artworkFiles, enabledLocations, hasShownCompletionToast])

  function handleFileSelect(location: PrintLocation, file: File | null) {
    setArtworkFile(location, file)
    // Switch to the tab of the uploaded file
    if (file) {
      setActiveTab(location)
      setToast({
        message: `Artwork uploaded for ${getLocationLabel(location)}`,
        type: 'success',
        show: true,
      })
    }
  }

  function handleFileRemove(location: PrintLocation) {
    setArtworkFile(location, null)
    setToast({
      message: `Artwork removed from ${getLocationLabel(location)}`,
      type: 'info',
      show: true,
    })
  }

  function handleTransformChange(location: PrintLocation, transform: ArtworkTransform) {
    setArtworkTransform(location, transform)
  }

  const MAX_DIMENSIONS: Record<PrintLocation, { width: number; height: number }> = {
    front: { width: 11, height: 17 },
    back: { width: 11, height: 17 },
    left_chest: { width: 4, height: 4 },
    right_chest: { width: 4, height: 4 },
    full_back: { width: 13, height: 19 },
  }

  const PRINT_AREA_PIXELS: Record<PrintLocation, { width: number; height: number }> = {
    front: { width: 165, height: 255 },
    back: { width: 165, height: 255 },
    left_chest: { width: 60, height: 60 },
    right_chest: { width: 60, height: 60 },
    full_back: { width: 195, height: 285 },
  }

  function getValidationWarnings(location: PrintLocation): string[] {
    const warnings: string[] = []
    const file = artworkFiles[location]
    const transform = artworkTransforms[location]

    if (!file || !transform) return warnings

    const maxDims = MAX_DIMENSIONS[location]
    const printAreaPx = PRINT_AREA_PIXELS[location]
    
    const img = new Image()
    img.src = URL.createObjectURL(file)
    const widthPx = img.width * transform.scale
    const heightPx = img.height * transform.scale
    const widthInches = (widthPx / printAreaPx.width) * maxDims.width
    const heightInches = (heightPx / printAreaPx.height) * maxDims.height

    if (widthInches > maxDims.width || heightInches > maxDims.height) {
      warnings.push(`Design exceeds maximum print area of ${maxDims.width}" × ${maxDims.height}". Please resize.`)
    }

    if (transform.scale < 0.3) {
      warnings.push('Design appears very small. Consider using a larger design for better print quality.')
    }

    const normalizedRotation = Math.abs(transform.rotation % 360)
    if (normalizedRotation > 15 && normalizedRotation < 345) {
      warnings.push('Design is rotated. Rotated designs may have different pricing or printing considerations.')
    }

    return warnings
  }

  function hasAnyWarnings(): boolean {
    return enabledLocations.some(location => getValidationWarnings(location).length > 0)
  }

  function getLocationLabel(location: PrintLocation): string {
    const labels: Record<PrintLocation, string> = {
      front: 'Front',
      back: 'Back',
      left_chest: 'Left Chest',
      right_chest: 'Right Chest',
      full_back: 'Full Back'
    }
    return labels[location]
  }

  function canContinue(): boolean {
    return enabledLocations.every(location => artworkFiles[location] !== null && artworkFiles[location] !== undefined)
  }

  function handleContinue() {
    if (canContinue()) {
      router.push(`/custom-shirts/configure/${garmentId}/checkout`)
    }
  }

  // Progress calculation
  const uploadedCount = enabledLocations.filter(loc => artworkFiles[loc]).length
  const totalCount = enabledLocations.length
  const progress = totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
        showConfetti={toast.confetti}
      />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/custom-shirts" className="text-2xl font-bold text-gradient">
              My Swag Co
            </Link>
            <nav className="flex items-center gap-6">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-primary-600">Step 3</span> / Upload Artwork
              </div>
              {/* Progress indicator */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-600 to-primary-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {uploadedCount}/{totalCount}
                </span>
              </div>
            </nav>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 lg:mb-12"
        >
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            Upload Your Artwork
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload high-resolution files for each print location and position your design
          </p>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setShowGallery(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 rounded-lg font-medium text-sm text-gray-700 hover:text-primary-700 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              View Examples
            </button>
            
            <Popover.Root open={showRequirements} onOpenChange={setShowRequirements}>
              <Popover.Trigger asChild>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 rounded-lg font-medium text-sm text-gray-700 hover:text-primary-700 transition-all shadow-sm hover:shadow-md">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  File Requirements
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-50 w-80 bg-white rounded-lg shadow-xl border-2 border-gray-200 p-4 animate-slide-up"
                  sideOffset={5}
                >
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      File Requirements
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Formats:</strong> PNG, JPG, PDF, AI, EPS, SVG</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Max Size:</strong> 50MB per file</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Resolution:</strong> 300dpi recommended</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Best Quality:</strong> Vector files (AI, EPS, SVG)</span>
                      </li>
                    </ul>
                  </div>
                  <Popover.Arrow className="fill-white" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
          {/* Left Column: File Uploads */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 lg:p-6">
              <div className="space-y-6">
                {enabledLocations.map((location, index) => {
                  const colors = printConfig.locations[location]?.num_colors || 1
                  const file = artworkFiles[location]

                  return (
                    <motion.div
                      key={location}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <FileUploadCard
                        location={location}
                        label={getLocationLabel(location)}
                        colors={colors}
                        file={file}
                        onFileSelect={(file) => handleFileSelect(location, file)}
                        onFileRemove={() => handleFileRemove(location)}
                      />
                    </motion.div>
                  )
                })}
              </div>

              {/* Text-Only Design Option */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200"
              >
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Don't have artwork?
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  If you just need text printed on your shirts, you can work with our team to create a simple text-based design. 
                  Upload a text file or document describing what you want, and we'll follow up with you.
                </p>
                <label className="inline-flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-primary-400 hover:bg-primary-50 px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Text Description
                  <input
                    type="file"
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0]
                      if (selectedFile && enabledLocations.length > 0) {
                        handleFileSelect(enabledLocations[0], selectedFile)
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Column: Live Design Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:sticky lg:top-24 lg:self-start"
          >
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Design Preview</h2>
                {uploadedCount > 0 && (
                  <span className="badge-success">
                    {uploadedCount}/{totalCount} Complete
                  </span>
                )}
              </div>

              {/* Enhanced Tabs */}
              {enabledLocations.length > 0 && (
                <Tabs.Root value={activeTab || enabledLocations[0]} onValueChange={(val) => setActiveTab(val as PrintLocation)}>
                  <Tabs.List className="flex flex-wrap gap-2 mb-6">
                    {enabledLocations.map((location) => (
                      <Tabs.Trigger
                        key={location}
                        value={location}
                        className={`
                          flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
                          ${activeTab === location
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {getLocationLabel(location)}
                        {artworkFiles[location] && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={activeTab === location ? 'text-white' : 'text-success-600'}
                          >
                            ✓
                          </motion.span>
                        )}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>

                  {enabledLocations.map((location) => (
                    <Tabs.Content key={location} value={location} className="outline-none">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={location}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <DesignEditor
                            artworkFile={artworkFiles[location]}
                            printLocation={location}
                            transform={artworkTransforms[location] || null}
                            onTransformChange={(transform) => handleTransformChange(location, transform)}
                          />

                          {/* Validation Warnings */}
                          <AnimatePresence>
                            {getValidationWarnings(location).length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 bg-warning-50 border-2 border-warning-300 rounded-lg p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <svg className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-warning-900 mb-1">Design Warnings</h4>
                                    <ul className="text-sm text-warning-800 space-y-1">
                                      {getValidationWarnings(location).map((warning, idx) => (
                                        <li key={idx}>• {warning}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </AnimatePresence>
                    </Tabs.Content>
                  ))}
                </Tabs.Root>
              )}
            </div>
          </motion.div>
        </div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto"
        >
          <Link
            href={`/custom-shirts/configure/${garmentId}`}
            className="w-full sm:w-auto btn-secondary"
          >
            ← Back
          </Link>
          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
            <motion.button
              onClick={handleContinue}
              disabled={!canContinue()}
              whileHover={canContinue() ? { scale: 1.02 } : {}}
              whileTap={canContinue() ? { scale: 0.98 } : {}}
              className="w-full sm:w-auto btn-primary"
            >
              Continue to Checkout →
            </motion.button>
            {hasAnyWarnings() && canContinue() && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-warning-600 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                There are design warnings. You can still proceed.
              </motion.p>
            )}
            {!canContinue() && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-gray-500"
              >
                Upload artwork for all locations to continue
              </motion.p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Gallery Modal */}
      <ArtworkGallery isOpen={showGallery} onClose={() => setShowGallery(false)} />
    </div>
  )
}
