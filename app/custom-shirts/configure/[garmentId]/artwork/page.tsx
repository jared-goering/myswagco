'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import { useOrderStore } from '@/lib/store/orderStore'
import { PrintLocation, ArtworkTransform, Garment } from '@/types'
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

  const { printConfig, artworkFiles, setArtworkFile, artworkFileRecords, setArtworkFileRecord, artworkTransforms, setArtworkTransform, setVectorizedFile, hasUnvectorizedRasterFiles, selectedColors } = useOrderStore()
  const [activeTab, setActiveTab] = useState<PrintLocation | null>(null)
  const [showGallery, setShowGallery] = useState(false)
  const [showRequirements, setShowRequirements] = useState(false)
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false)
  const [textDescription, setTextDescription] = useState('')
  const [garment, setGarment] = useState<Garment | null>(null)
  const [activeColor, setActiveColor] = useState<string>(selectedColors[0] || '')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; show: boolean; confetti?: boolean }>({
    message: '',
    type: 'info',
    show: false,
  })
  const [orderId, setOrderId] = useState<string | null>(null)
  const [maxInkColors, setMaxInkColors] = useState<number>(4)
  const [detectedColors, setDetectedColors] = useState<{ [location: string]: number }>({})

  const enabledLocations = Object.entries(printConfig.locations)
    .filter(([, config]) => config?.enabled)
    .map(([location]) => location as PrintLocation)

  // Fetch garment data and app config on mount
  useEffect(() => {
    async function fetchGarment() {
      try {
        const response = await fetch(`/api/garments/${garmentId}`)
        if (response.ok) {
          const garmentData = await response.json()
          setGarment(garmentData)
        }
      } catch (error) {
        console.error('Error fetching garment:', error)
      }
    }
    
    async function fetchAppConfig() {
      try {
        const response = await fetch('/api/app-config')
        if (response.ok) {
          const config = await response.json()
          setMaxInkColors(config.max_ink_colors || 4)
        }
      } catch (error) {
        console.error('Error fetching app config:', error)
      }
    }
    
    fetchGarment()
    fetchAppConfig()
  }, [garmentId])

  // Set initial active tab to first enabled location
  useEffect(() => {
    if (enabledLocations.length > 0 && !activeTab) {
      setActiveTab(enabledLocations[0])
    }
  }, [enabledLocations.length])

  // Set initial active color from selected colors
  useEffect(() => {
    if (selectedColors.length > 0 && !activeColor) {
      setActiveColor(selectedColors[0])
    }
  }, [selectedColors])

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

  async function handleFileSelect(location: PrintLocation, file: File | null) {
    setArtworkFile(location, file)
    
    if (file) {
      // Detect file type for immediate UI feedback
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const vectorExtensions = ['svg', 'ai', 'eps']
      const isVector = vectorExtensions.includes(fileExtension || '')
      
      // Create a client-side record for immediate UI feedback
      const tempRecord = {
        id: `temp-${location}-${Date.now()}`,
        order_id: 'pending',
        location: location,
        file_url: URL.createObjectURL(file),
        file_name: file.name,
        file_size: file.size,
        is_vector: isVector,
        vectorization_status: isVector ? 'not_needed' as const : 'pending' as const,
        created_at: new Date().toISOString()
      }
      
      setArtworkFileRecord(location, tempRecord)
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
    setArtworkFileRecord(location, null)
    setToast({
      message: `Artwork removed from ${getLocationLabel(location)}`,
      type: 'info',
      show: true,
    })
  }

  async function handleVectorize(artworkFileId: string) {
    try {
      // Find which location this artwork belongs to
      const location = Object.entries(artworkFileRecords).find(
        ([, record]) => record?.id === artworkFileId
      )?.[0] as PrintLocation | undefined
      
      if (!location) {
        throw new Error('Could not find artwork location')
      }
      
      const file = artworkFiles[location]
      
      if (!file) {
        throw new Error('File not found')
      }
      
      // Use temporary vectorization endpoint (doesn't require order)
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/artwork/vectorize-temp', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.svg_data_url) {
          // Update the record with the vectorized data URL
          setVectorizedFile(location, result.svg_data_url, 'completed')
          
          const colorCount = result.color_count || 0
          
          // Store detected colors for this location
          setDetectedColors(prev => ({
            ...prev,
            [location]: colorCount
          }))
          
          const colorInfo = colorCount ? ` (${colorCount} color${colorCount !== 1 ? 's' : ''} detected)` : ''
          
          // Check if color count exceeds maximum
          if (colorCount > maxInkColors) {
            setToast({
              message: `Artwork vectorized for ${getLocationLabel(location)}!${colorInfo} ⚠️ Warning: Design has ${colorCount} colors but maximum is ${maxInkColors}. This may increase costs or require color reduction.`,
              type: 'warning',
              show: true,
            })
          } else {
            setToast({
              message: `Artwork vectorized successfully for ${getLocationLabel(location)}!${colorInfo}`,
              type: 'success',
              show: true,
            })
          }
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Vectorization failed')
      }
    } catch (error) {
      console.error('Vectorization error:', error)
      setToast({
        message: error instanceof Error ? error.message : 'Failed to vectorize artwork',
        type: 'error',
        show: true,
      })
      throw error
    }
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
    // Can continue if they have text description OR all artwork is uploaded AND vectorized
    const hasTextDescription = textDescription.trim().length > 0
    const hasAllArtwork = enabledLocations.every(location => artworkFiles[location] !== null && artworkFiles[location] !== undefined)
    
    // Check if any raster files need vectorization
    const needsVectorization = hasUnvectorizedRasterFiles()
    
    return hasTextDescription || (hasAllArtwork && !needsVectorization)
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
    <div className="min-h-screen bg-surface-200">
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
        className="fixed top-4 left-0 right-0 z-50 transition-all duration-300 flex justify-center px-4"
      >
        <div className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-lg rounded-full px-10 py-4 flex items-center gap-8">
          <Link href="/custom-shirts" className="hover:opacity-80 transition-opacity">
            <NextImage 
              src="/logo.png" 
              alt="My Swag Co" 
              width={150} 
              height={45}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full text-sm font-black">3</span>
            <span className="text-sm font-bold text-charcoal-700 whitespace-nowrap">Upload Artwork</span>
            {/* Progress indicator */}
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-surface-300">
              <div className="w-20 h-2 bg-surface-300 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-sm font-black text-charcoal-600">
                {uploadedCount}/{totalCount}
              </span>
            </div>
          </nav>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-8 lg:pb-12">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 lg:mb-12"
        >
          <h1 className="text-4xl lg:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
            Upload Your Artwork
          </h1>
          <p className="text-charcoal-500 text-lg max-w-2xl mx-auto font-semibold">
            Upload high-resolution files for each print location and position your design
          </p>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setShowGallery(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white border-2 border-surface-300 hover:border-primary-400 hover:bg-primary-50 rounded-bento font-bold text-sm text-charcoal-700 hover:text-primary-700 transition-all shadow-soft hover:shadow-bento"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              View Examples
            </button>
            
            <Popover.Root open={showRequirements} onOpenChange={setShowRequirements}>
              <Popover.Trigger asChild>
                <button className="inline-flex items-center gap-2 px-5 py-3 bg-white border-2 border-surface-300 hover:border-primary-400 hover:bg-primary-50 rounded-bento font-bold text-sm text-charcoal-700 hover:text-primary-700 transition-all shadow-soft hover:shadow-bento">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  File Requirements
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-50 w-80 bg-white rounded-bento-lg shadow-bento border-2 border-surface-300 p-6 animate-slide-up"
                  sideOffset={5}
                >
                  <div className="space-y-3">
                    <h3 className="font-black text-charcoal-700 flex items-center gap-2 text-lg">
                      <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      File Requirements
                    </h3>
                    <ul className="space-y-2 text-sm text-charcoal-600 font-semibold">
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
            <div className="bento-card">
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
                        artworkFileRecord={artworkFileRecords[location] || null}
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
                className="mt-6 p-6 bg-gradient-to-br from-surface-50 to-surface-100 rounded-bento-lg border-2 border-surface-300"
              >
                <h3 className="font-black text-charcoal-700 mb-2 flex items-center gap-2 text-lg">
                  <svg className="w-5 h-5 text-charcoal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Don't have artwork?
                </h3>
                <p className="text-charcoal-500 text-sm mb-4 font-semibold">
                  If you just need text printed on your shirts, tell us what you want below. Our team will create a simple text-based design and follow up with you.
                </p>
                
                {/* Text Input */}
                <div className="mb-4">
                  <label className="block text-sm font-black text-charcoal-600 mb-2 uppercase tracking-wide">
                    Describe your text design
                  </label>
                  <textarea
                    value={textDescription}
                    onChange={(e) => setTextDescription(e.target.value)}
                    placeholder="Example: 'IOWA STATE CHAMPIONSHIP 2024' in bold letters on the front, and 'GO HAWKS!' on the back"
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-surface-300 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none resize-none text-sm font-bold text-charcoal-700"
                  />
                  {textDescription && (
                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      We'll include this with your order
                    </p>
                  )}
                </div>

                {/* Optional File Upload */}
                <div className="pt-3 border-t border-surface-300">
                  <p className="text-xs text-charcoal-500 mb-2 font-bold">Optional: Upload reference images or documents</p>
                  <label className="inline-flex items-center gap-2 bg-white border-2 border-surface-300 hover:border-primary-400 hover:bg-primary-50 px-4 py-2.5 rounded-bento cursor-pointer text-sm font-black transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload File
                    <input
                      type="file"
                      accept=".txt,.doc,.docx,.pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0]
                        if (selectedFile) {
                          setToast({
                            message: 'Reference file uploaded - we\'ll review it with your order',
                            type: 'success',
                            show: true,
                          })
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
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
            <div className="bento-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-charcoal-700 tracking-tight">Design Preview</h2>
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
                          flex items-center gap-2 px-5 py-3 rounded-bento font-bold text-sm transition-all
                          ${activeTab === location
                            ? 'bg-primary-500 text-white shadow-bento'
                            : 'bg-surface-100 text-charcoal-700 hover:bg-surface-200'
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
                            artworkFileRecord={artworkFileRecords[location] || null}
                            printLocation={location}
                            transform={artworkTransforms[location] || null}
                            onTransformChange={(transform) => handleTransformChange(location, transform)}
                            garment={garment}
                            selectedColors={selectedColors}
                            activeColor={activeColor}
                            onColorChange={setActiveColor}
                            onVectorize={handleVectorize}
                            maxInkColors={maxInkColors}
                            detectedColors={detectedColors[location] || 0}
                          />

                          {/* Validation Warnings */}
                          <AnimatePresence>
                            {getValidationWarnings(location).length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-6 bg-data-yellow/20 border-2 border-data-yellow/40 rounded-bento-lg p-6"
                              >
                                <div className="flex items-start gap-3">
                                  <svg className="w-6 h-6 text-data-yellow mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  <div className="flex-1">
                                    <h4 className="font-black text-charcoal-700 mb-2">Design Warnings</h4>
                                    <ul className="text-sm text-charcoal-600 font-semibold space-y-1">
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
                className="text-xs text-data-yellow font-bold flex items-center gap-1"
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
                className="text-xs text-charcoal-500 font-semibold"
              >
                {hasUnvectorizedRasterFiles() 
                  ? 'Please vectorize all raster artwork before continuing'
                  : 'Upload artwork for all locations or describe your text design to continue'
                }
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
