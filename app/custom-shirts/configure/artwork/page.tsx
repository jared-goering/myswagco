'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import { useOrderStore } from '@/lib/store/orderStore'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { PrintLocation, ArtworkTransform, Garment } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import * as Popover from '@radix-ui/react-popover'
import * as Tabs from '@radix-ui/react-tabs'
import DesignEditor from '@/components/DesignEditor'
import FileUploadCard from '@/components/FileUploadCard'
import ArtworkGallery from '@/components/ArtworkGallery'
import Toast from '@/components/Toast'
import ValidationSummaryCard, { ValidationIssue } from '@/components/ValidationSummaryCard'
import AIDesignGenerator from '@/components/AIDesignGenerator'

export default function MultiGarmentArtworkPage() {
  const router = useRouter()
  const { isAuthenticated, customer, user, openAuthModal, signOut, isLoading: authLoading } = useCustomerAuth()

  const { 
    selectedGarments,
    getSelectedGarmentIds,
    printConfig, 
    artworkFiles, 
    setArtworkFile, 
    artworkFileRecords, 
    setArtworkFileRecord, 
    artworkTransforms, 
    setArtworkTransform, 
    setVectorizedFile, 
    hasUnvectorizedRasterFiles, 
    textDescription, 
    setTextDescription, 
    saveDraft,
    orderMode,
    setMockupImageDataUrl,
    clearMockupImages,
  } = useOrderStore()

  const [activeTab, setActiveTab] = useState<PrintLocation | null>(null)
  
  // State for capturing mockups for all garments and colors
  // Each item is { garmentId, garmentIndex, color } to support multi-garment campaigns
  interface CaptureQueueItem {
    garmentId: string
    garmentIndex: number
    color: string
  }
  const [isCapturingMockups, setIsCapturingMockups] = useState(false)
  const [captureQueue, setCaptureQueue] = useState<CaptureQueueItem[]>([])
  const [navigateAfterCapture, setNavigateAfterCapture] = useState(false)
  const [pendingCapture, setPendingCapture] = useState<CaptureQueueItem | null>(null)
  const [canvasReadyForCapture, setCanvasReadyForCapture] = useState<string | null>(null) // garmentId:color
  const lastCapturedKeyRef = useRef<string | null>(null)
  const currentCaptureKeyRef = useRef<string | null>(null)
  
  // Keep ref in sync with pending capture for use in callbacks
  useEffect(() => {
    currentCaptureKeyRef.current = pendingCapture ? `${pendingCapture.garmentId}:${pendingCapture.color}` : null
  }, [pendingCapture])
  const [showGallery, setShowGallery] = useState(false)
  const [showRequirements, setShowRequirements] = useState(false)
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false)
  const [garments, setGarments] = useState<Garment[]>([])
  const [activeGarmentIndex, setActiveGarmentIndex] = useState(0)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; show: boolean; confetti?: boolean }>({
    message: '',
    type: 'info',
    show: false,
  })
  const [maxInkColors, setMaxInkColors] = useState<number>(4)
  const [detectedColors, setDetectedColors] = useState<{ [location: string]: number }>({})
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [isAISectionExpanded, setIsAISectionExpanded] = useState(false)
  const [aiEditImage, setAiEditImage] = useState<string | null>(null)
  const [aiEditLocation, setAiEditLocation] = useState<PrintLocation | null>(null)
  const [removingBgLocation, setRemovingBgLocation] = useState<PrintLocation | null>(null)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const [showSavedArtworkBrowser, setShowSavedArtworkBrowser] = useState(false)
  const [savedArtworkList, setSavedArtworkList] = useState<any[]>([])
  const [loadingSavedArtwork, setLoadingSavedArtwork] = useState(false)
  const [selectedLocationForSaved, setSelectedLocationForSaved] = useState<PrintLocation | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [loading, setLoading] = useState(true)
  const accountDropdownRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitialized = useRef(false)
  const captureCanvasRef = useRef<(() => string | null) | null>(null)

  const selectedIds = getSelectedGarmentIds()

  // Get selected garment data
  const selectedGarmentData = useMemo(() => {
    return garments.filter(g => selectedIds.includes(g.id))
  }, [garments, selectedIds])

  // Current garment being previewed
  const currentGarment = selectedGarmentData[activeGarmentIndex] || null

  // Get colors for current garment
  const currentGarmentColors = useMemo(() => {
    if (!currentGarment) return []
    return selectedGarments[currentGarment.id]?.selectedColors || []
  }, [currentGarment, selectedGarments])

  const [activeColor, setActiveColor] = useState<string>('')

  // Debounced save draft function
  const debouncedSaveDraft = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(async () => {
      if (isAuthenticated && selectedIds.length > 0) {
        setSaveStatus('saving')
        await saveDraft()
        setSaveStatus('saved')
        
        if (saveStatusTimeoutRef.current) {
          clearTimeout(saveStatusTimeoutRef.current)
        }
        saveStatusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      }
    }, 2000)
  }, [isAuthenticated, selectedIds.length, saveDraft])

  // Auto-save draft when authenticated user makes changes
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      return
    }
    
    if (isAuthenticated && selectedIds.length > 0) {
      debouncedSaveDraft()
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [artworkFileRecords, artworkTransforms, textDescription, isAuthenticated, selectedIds.length, debouncedSaveDraft])

  // Close account dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const enabledLocations = Object.entries(printConfig.locations)
    .filter(([, config]) => config?.enabled)
    .map(([location]) => location as PrintLocation)

  // Redirect if no garments selected
  useEffect(() => {
    if (!loading && selectedIds.length === 0) {
      router.replace('/custom-shirts/configure')
    }
  }, [selectedIds.length, loading, router])

  // Fetch garments and app config on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [garmentsRes, configRes] = await Promise.all([
          fetch('/api/garments'),
          fetch('/api/app-config')
        ])
        
        if (garmentsRes.ok) {
          const garmentsData = await garmentsRes.json()
          setGarments(garmentsData)
        }
        
        if (configRes.ok) {
          const config = await configRes.json()
          setMaxInkColors(config.max_ink_colors || 4)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Set initial active tab to first enabled location
  useEffect(() => {
    if (enabledLocations.length > 0 && !activeTab) {
      setActiveTab(enabledLocations[0])
    }
  }, [enabledLocations.length])

  // Set initial active color from current garment's selected colors
  useEffect(() => {
    if (currentGarmentColors.length > 0 && !activeColor) {
      setActiveColor(currentGarmentColors[0])
    }
  }, [currentGarmentColors])

  // Update active color when switching garments
  useEffect(() => {
    if (currentGarmentColors.length > 0) {
      setActiveColor(currentGarmentColors[0])
    }
  }, [activeGarmentIndex])
  
  // Handle mockup capture for all garments and colors (for campaigns)
  // Step 1: When capturing starts or queue changes, set the pending capture item and switch garment/color
  useEffect(() => {
    if (!isCapturingMockups || captureQueue.length === 0) return
    
    const itemToCapture = captureQueue[0]
    const captureKey = `${itemToCapture.garmentId}:${itemToCapture.color}`
    
    // Only set pending if we haven't already captured this item
    if (lastCapturedKeyRef.current !== captureKey) {
      // Update the ref synchronously BEFORE setting state, so it's available in callbacks
      currentCaptureKeyRef.current = captureKey
      
      setPendingCapture(itemToCapture)
      
      // Switch garment if needed
      if (activeGarmentIndex !== itemToCapture.garmentIndex) {
        setActiveGarmentIndex(itemToCapture.garmentIndex)
      }
      
      // Set active color to trigger canvas re-render
      // The DesignEditor's onCaptureReady will signal when the new image is loaded
      if (activeColor !== itemToCapture.color) {
        setActiveColor(itemToCapture.color)
      }
      // Note: We don't manually set canvasReadyForCapture here anymore
      // The DesignEditor will call onCaptureReady when the shirt image is loaded,
      // which will set canvasReadyForCapture via the callback
    }
  }, [isCapturingMockups, captureQueue, activeGarmentIndex, activeColor])
  
  // Step 2: When canvas is ready for the pending capture, do the capture
  useEffect(() => {
    if (!isCapturingMockups || !pendingCapture) return
    const captureKey = `${pendingCapture.garmentId}:${pendingCapture.color}`
    if (canvasReadyForCapture !== captureKey) return
    if (lastCapturedKeyRef.current === captureKey) return
    
    // Canvas is ready - capture after a small delay to ensure rendering is complete
    const captureTimeout = setTimeout(() => {
      if (captureCanvasRef.current) {
        const mockupDataUrl = captureCanvasRef.current()
        if (mockupDataUrl) {
          // Store with garmentId:color key for multi-garment support
          // Also store with just color for backwards compatibility (first garment)
          setMockupImageDataUrl(captureKey, mockupDataUrl)
          if (pendingCapture.garmentIndex === 0) {
            // For the first garment, also store with just color key for backwards compat
            setMockupImageDataUrl(pendingCapture.color, mockupDataUrl)
          }
          lastCapturedKeyRef.current = captureKey
        }
      }
      
      // Move to next item or finish
      const remainingItems = captureQueue.slice(1)
      setPendingCapture(null)
      setCanvasReadyForCapture(null)
      
      if (remainingItems.length > 0) {
        setCaptureQueue(remainingItems)
      } else {
        // Done capturing all items
        setIsCapturingMockups(false)
        setCaptureQueue([])
        lastCapturedKeyRef.current = null
        if (navigateAfterCapture) {
          setNavigateAfterCapture(false)
          router.push('/custom-shirts/configure/campaign-details')
        }
      }
    }, 300) // Delay to ensure Konva has fully rendered the new shirt color
    
    return () => clearTimeout(captureTimeout)
  }, [isCapturingMockups, pendingCapture, canvasReadyForCapture, captureQueue, navigateAfterCapture, router, setMockupImageDataUrl])
  
  // Fallback: if canvas doesn't signal ready within timeout, force capture anyway
  useEffect(() => {
    if (!isCapturingMockups || !pendingCapture) return
    const captureKey = `${pendingCapture.garmentId}:${pendingCapture.color}`
    if (canvasReadyForCapture === captureKey) return // Already ready
    
    const fallbackTimeout = setTimeout(() => {
      // Force set canvas ready if it hasn't signaled yet
      setCanvasReadyForCapture(captureKey)
    }, 2000)
    
    return () => clearTimeout(fallbackTimeout)
  }, [isCapturingMockups, pendingCapture, canvasReadyForCapture])

  // Helper to check if a location has artwork
  const hasArtworkForLocation = (location: PrintLocation): boolean => {
    const file = artworkFiles[location]
    const record = artworkFileRecords[location]
    return !!file || (!!record && (!!record.file_url || !!record.vectorized_file_url))
  }

  // Check if all files uploaded
  useEffect(() => {
    const allUploaded = enabledLocations.every(location => hasArtworkForLocation(location))
    if (allUploaded && enabledLocations.length > 0 && !hasShownCompletionToast) {
      setHasShownCompletionToast(true)
      setToast({
        message: 'All artwork uploaded successfully!',
        type: 'success',
        show: true,
        confetti: true,
      })
    }
    if (!allUploaded && hasShownCompletionToast) {
      setHasShownCompletionToast(false)
    }
  }, [artworkFiles, artworkFileRecords, enabledLocations, hasShownCompletionToast])

  async function handleFileSelect(location: PrintLocation, file: File | null, options?: { skipAutoSave?: boolean; existingArtworkId?: string; existingImageUrl?: string }) {
    setArtworkFile(location, file)
    
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const vectorExtensions = ['svg', 'ai', 'eps']
      const isVector = vectorExtensions.includes(fileExtension || '')
      
      const tempRecord = {
        id: options?.existingArtworkId || `temp-${location}-${Date.now()}`,
        order_id: 'pending',
        location: location,
        file_url: options?.existingImageUrl || URL.createObjectURL(file),
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
      
      // Save to account if authenticated
      if (isAuthenticated && user && !options?.skipAutoSave) {
        try {
          const reader = new FileReader()
          reader.onload = async () => {
            const base64Data = reader.result as string
            const artworkName = file.name.replace(/\.[^/.]+$/, '')
            
            const response = await fetch('/api/saved-artwork', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                name: artworkName,
                image_data: base64Data,
                is_ai_generated: false,
                metadata: {
                  original_filename: file.name,
                  file_size: file.size,
                  location: location,
                  is_vector: isVector,
                  auto_saved_from_order: true
                }
              })
            })
            
            if (response.ok) {
              const savedArtwork = await response.json()
              const persistentRecord = {
                id: savedArtwork.id,
                order_id: 'pending',
                location: location,
                file_url: savedArtwork.image_url,
                file_name: file.name,
                file_size: file.size,
                is_vector: isVector,
                vectorization_status: isVector ? 'not_needed' as const : 'pending' as const,
                created_at: savedArtwork.created_at
              }
              setArtworkFileRecord(location, persistentRecord)
            }
          }
          reader.readAsDataURL(file)
        } catch (error) {
          console.error('Error saving artwork to account:', error)
        }
      }
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

  async function handleEditWithAI(location: PrintLocation) {
    // Get the image URL to edit - prefer vectorized if available, otherwise original
    const record = artworkFileRecords[location]
    const file = artworkFiles[location]
    
    let imageUrl: string | null = null
    
    // Try to get image URL from record first
    if (record?.vectorized_file_url) {
      imageUrl = record.vectorized_file_url
    } else if (record?.file_url) {
      imageUrl = record.file_url
    } else if (file) {
      // Create a data URL from the file
      imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    }
    
    if (imageUrl) {
      setAiEditImage(imageUrl)
      setAiEditLocation(location)
      setShowAIGenerator(true)
    } else {
      setToast({
        message: 'Could not load image for editing',
        type: 'error',
        show: true,
      })
    }
  }

  function handleCloseAIGenerator() {
    setShowAIGenerator(false)
    // Clear edit state after a short delay to allow modal animation
    setTimeout(() => {
      setAiEditImage(null)
      setAiEditLocation(null)
    }, 300)
  }

  async function handleRemoveBackground(location: PrintLocation) {
    // Get the image to process
    const record = artworkFileRecords[location]
    const file = artworkFiles[location]
    
    let imageBase64: string | null = null
    
    // Get the image as base64
    if (record?.file_url && (record.file_url.startsWith('data:') || record.file_url.startsWith('http'))) {
      imageBase64 = record.file_url
    } else if (record?.vectorized_file_url) {
      imageBase64 = record.vectorized_file_url
    } else if (file) {
      imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    }
    
    if (!imageBase64) {
      setToast({
        message: 'Could not load image for background removal',
        type: 'error',
        show: true,
      })
      return
    }
    
    setRemovingBgLocation(location)
    
    try {
      const response = await fetch('/api/artwork/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove background')
      }
      
      if (data.success && data.image) {
        // Convert the result to a file and update the artwork
        const fetchResponse = await fetch(data.image)
        const blob = await fetchResponse.blob()
        const fileName = `bg-removed-${Date.now()}.png`
        const newFile = new File([blob], fileName, { type: 'image/png' })
        
        await handleFileSelect(location, newFile)
        
        setToast({
          message: `Background removed from ${getLocationLabel(location)}!`,
          type: 'success',
          show: true,
        })
      }
    } catch (error) {
      console.error('Background removal error:', error)
      setToast({
        message: error instanceof Error ? error.message : 'Failed to remove background',
        type: 'error',
        show: true,
      })
    } finally {
      setRemovingBgLocation(null)
    }
  }

  async function handleAIDesignGenerated(imageDataUrl: string, location: PrintLocation) {
    try {
      // Use the edit location if we're editing an existing design, otherwise use the provided location
      const targetLocation = aiEditLocation || location
      
      const response = await fetch(imageDataUrl)
      const blob = await response.blob()
      const fileName = `ai-generated-design-${Date.now()}.png`
      const file = new File([blob], fileName, { type: 'image/png' })
      
      await handleFileSelect(targetLocation, file)
      
      const actionVerb = aiEditLocation ? 'Updated' : 'Added'
      setToast({
        message: `${actionVerb} AI design for ${getLocationLabel(targetLocation)}!`,
        type: 'success',
        show: true,
        confetti: true,
      })
      
      setActiveTab(targetLocation)
      
      // Clear the edit state
      setAiEditImage(null)
      setAiEditLocation(null)
    } catch (error) {
      console.error('Error processing AI design:', error)
      setToast({
        message: 'Failed to process the AI-generated design',
        type: 'error',
        show: true,
      })
    }
  }

  async function handleVectorize(artworkFileId: string) {
    try {
      const location = Object.entries(artworkFileRecords).find(
        ([, record]) => record?.id === artworkFileId
      )?.[0] as PrintLocation | undefined
      
      if (!location) throw new Error('Could not find artwork location')
      
      const file = artworkFiles[location]
      if (!file) throw new Error('File not found')
      
      setVectorizedFile(location, '', 'processing')
      
      setToast({
        message: `Vectorizing ${getLocationLabel(location)}... This may take 5-15 seconds.`,
        type: 'info',
        show: true,
      })
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/artwork/vectorize-temp', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.svg_data_url) {
          setVectorizedFile(location, result.svg_data_url, 'completed')
          
          const colorCount = result.color_count || 0
          setDetectedColors(prev => ({ ...prev, [location]: colorCount }))
          
          const colorInfo = colorCount ? ` (${colorCount} color${colorCount !== 1 ? 's' : ''} detected)` : ''
          
          if (colorCount > maxInkColors) {
            setToast({
              message: `Artwork vectorized!${colorInfo} Warning: Design has ${colorCount} colors but maximum is ${maxInkColors}.`,
              type: 'warning',
              show: true,
            })
          } else {
            setToast({
              message: `Artwork vectorized successfully!${colorInfo}`,
              type: 'success',
              show: true,
            })
          }
          
          // Auto-save vectorized file to user's account if authenticated
          if (isAuthenticated && user && result.svg_data_url) {
            try {
              const originalName = file.name.replace(/\.[^/.]+$/, '') // Remove extension
              const vectorName = `${originalName}_vectorized`
              
              const saveResponse = await fetch('/api/saved-artwork', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  name: vectorName,
                  image_data: result.svg_data_url,
                  is_ai_generated: false,
                  metadata: {
                    original_filename: `${originalName}.svg`,
                    is_vector: true,
                    location: location,
                    color_count: colorCount,
                    auto_vectorized: true
                  }
                })
              })
              
              if (saveResponse.ok) {
                console.log(`Vectorized artwork "${vectorName}" saved to user's account`)
              } else {
                console.error('Failed to save vectorized artwork to account:', await saveResponse.text())
              }
            } catch (saveError) {
              console.error('Error saving vectorized artwork to account:', saveError)
            }
          }
        }
      } else {
        setVectorizedFile(location, '', 'pending')
        throw new Error('Vectorization failed')
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

  async function fetchSavedArtwork() {
    if (!isAuthenticated) return
    setLoadingSavedArtwork(true)
    try {
      const response = await fetch('/api/saved-artwork', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setSavedArtworkList(data)
      }
    } catch (error) {
      console.error('Error fetching saved artwork:', error)
    } finally {
      setLoadingSavedArtwork(false)
    }
  }

  async function handleUseSavedArtwork(artwork: any) {
    if (!selectedLocationForSaved) return
    
    try {
      const response = await fetch(artwork.image_url)
      const blob = await response.blob()
      
      const isVector = artwork.metadata?.is_vector || artwork.image_url.endsWith('.svg')
      const extension = isVector ? 'svg' : 'png'
      const fileName = `${artwork.name}.${extension}`
      const file = new File([blob], fileName, { type: blob.type })
      
      await handleFileSelect(selectedLocationForSaved, file, {
        skipAutoSave: true,
        existingArtworkId: artwork.id,
        existingImageUrl: artwork.image_url
      })
      
      setToast({
        message: `"${artwork.name}" added to ${getLocationLabel(selectedLocationForSaved)}`,
        type: 'success',
        show: true,
      })
      
      setShowSavedArtworkBrowser(false)
      setSelectedLocationForSaved(null)
    } catch (error) {
      console.error('Error using saved artwork:', error)
      setToast({
        message: 'Failed to load saved artwork',
        type: 'error',
        show: true,
      })
    }
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

  // Validation issues
  function getValidationIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    enabledLocations.forEach((location) => {
      const record = artworkFileRecords[location]
      const hasArtwork = hasArtworkForLocation(location)
      
      if (!hasArtwork) {
        issues.push({
          id: `missing-${location}`,
          type: 'missing',
          severity: 'blocker',
          location,
          message: 'No artwork uploaded yet',
          action: {
            label: 'Upload Now',
            onClick: () => setActiveTab(location)
          }
        })
        return
      }
      
      if (record && !record.is_vector && record.vectorization_status !== 'completed') {
        const isProcessing = record.vectorization_status === 'processing'
        issues.push({
          id: `vectorization-${location}`,
          type: 'vectorization',
          severity: 'blocker',
          location,
          message: isProcessing ? 'Vectorizing...' : 'Needs vectorization for screen printing',
          isProcessing,
          action: {
            label: isProcessing ? 'Processing' : 'Vectorize Now',
            onClick: () => {
              if (!isProcessing && record?.id) {
                handleVectorize(record.id)
              }
            }
          }
        })
      }
      
      const colors = detectedColors[location] || 0
      if (colors > maxInkColors) {
        issues.push({
          id: `colors-${location}`,
          type: 'colors',
          severity: 'warning',
          location,
          message: `Design has ${colors} colors (max ${maxInkColors} recommended)`,
        })
      }
    })
    
    return issues
  }

  function canContinue(): boolean {
    const hasTextDescription = textDescription.trim().length > 0
    const hasAllArtwork = enabledLocations.every(location => hasArtworkForLocation(location))
    const needsVectorization = hasUnvectorizedRasterFiles()
    
    return hasTextDescription || (hasAllArtwork && !needsVectorization)
  }

  async function handleContinue() {
    if (canContinue()) {
      // Save draft immediately before navigating (don't wait for debounce)
      if (isAuthenticated) {
        // Clear any pending debounced save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        await saveDraft()
      }
      
      // For campaigns, capture mockup images for ALL garments and ALL their colors
      if (orderMode === 'campaign' && captureCanvasRef.current) {
        // Build queue of all garment/color combinations to capture
        const queue: CaptureQueueItem[] = []
        
        selectedGarmentData.forEach((garment, garmentIndex) => {
          const garmentColors = selectedGarments[garment.id]?.selectedColors || []
          garmentColors.forEach(color => {
            queue.push({
              garmentId: garment.id,
              garmentIndex,
              color,
            })
          })
        })
        
        if (queue.length > 0) {
          // Clear previous mockups and start capture for all combinations
          clearMockupImages()
          
          // Start with the first garment and color
          const firstItem = queue[0]
          setActiveGarmentIndex(firstItem.garmentIndex)
          setActiveColor(firstItem.color)
          setCaptureQueue(queue)
          setNavigateAfterCapture(true)
          setIsCapturingMockups(true)
          return // The useEffect will handle navigation after all captures
        }
      }
      
      // Route to campaign details if in campaign mode, otherwise checkout
      if (orderMode === 'campaign') {
        router.push('/custom-shirts/configure/campaign-details')
      } else {
        router.push('/custom-shirts/configure/checkout')
      }
    }
  }

  // Progress calculation
  const uploadedCount = enabledLocations.filter(loc => hasArtworkForLocation(loc)).length
  const totalCount = enabledLocations.length
  const progress = totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-200">
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
        className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4"
      >
        <div className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-lg rounded-full px-10 py-4 flex items-center gap-8">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <NextImage 
              src="/logo.png" 
              alt="My Swag Co" 
              width={150} 
              height={45}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-3">
            {/* Step indicators */}
            <div className="flex items-center gap-1.5">
              <Link href="/custom-shirts/configure" className="w-6 h-6 bg-success-500 text-white rounded-full flex items-center justify-center text-xs font-black hover:bg-success-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="w-4 h-0.5 bg-success-300 rounded-full" />
              <Link href="/custom-shirts/configure/colors" className="w-6 h-6 bg-success-500 text-white rounded-full flex items-center justify-center text-xs font-black hover:bg-success-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="w-4 h-0.5 bg-surface-300 rounded-full" />
              <div className="relative">
                <span className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-black">3</span>
                {isAuthenticated && saveStatus !== 'idle' && (
                  <span className={`absolute -top-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    saveStatus === 'saving' ? 'bg-white shadow-sm' : 'bg-emerald-500'
                  }`}>
                    {saveStatus === 'saving' ? (
                      <span className="w-2 h-2 border-[1.5px] border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                )}
              </div>
              <div className="w-4 h-0.5 bg-surface-300 rounded-full" />
              <span className="w-6 h-6 bg-surface-300 text-charcoal-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            </div>
            <span className="text-sm font-bold text-charcoal-700 whitespace-nowrap ml-1">Upload Artwork</span>
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-surface-300">
              <div className="w-20 h-2 bg-surface-300 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-sm font-black text-charcoal-600">{uploadedCount}/{totalCount}</span>
            </div>
          </nav>
          
          {/* Account Button */}
          <div className="border-l border-charcoal-200 pl-4">
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-surface-200 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="relative" ref={accountDropdownRef}>
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-white/50 transition-colors"
                >
                  {customer?.avatar_url ? (
                    <img src={customer.avatar_url} alt={customer?.name || 'Avatar'} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                      {(customer?.name || customer?.email || user?.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </button>
                {showAccountDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-surface-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-surface-100">
                      <p className="text-sm font-bold text-charcoal-700 truncate">{customer?.name || 'Welcome!'}</p>
                      <p className="text-xs text-charcoal-400 truncate">{customer?.email || user?.email}</p>
                    </div>
                    <Link href="/account" onClick={() => setShowAccountDropdown(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      My Account
                    </Link>
                    <button onClick={() => { signOut(); setShowAccountDropdown(false) }} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => openAuthModal()} className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/50 transition-colors" title="Sign In">
                <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center text-charcoal-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              </button>
            )}
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-8 lg:pb-12">
        {/* Title Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 lg:mb-12">
          <h1 className="text-4xl lg:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">Upload Your Artwork</h1>
          <p className="text-charcoal-500 text-lg max-w-2xl mx-auto font-semibold">
            Upload high-resolution files for each print location. The same artwork will be applied to all {selectedIds.length} selected styles.
          </p>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {isAuthenticated && (
              <button
                onClick={() => { setSelectedLocationForSaved(enabledLocations[0] || 'front'); setShowSavedArtworkBrowser(true); fetchSavedArtwork() }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-bento font-bold text-sm transition-all shadow-soft hover:shadow-bento"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                My Saved Designs
              </button>
            )}
            
            <button onClick={() => setShowGallery(true)} className="inline-flex items-center gap-2 px-5 py-3 bg-white border-2 border-surface-300 hover:border-primary-400 hover:bg-primary-50 rounded-bento font-bold text-sm text-charcoal-700 hover:text-primary-700 transition-all shadow-soft hover:shadow-bento">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              View Examples
            </button>
            
            <Popover.Root open={showRequirements} onOpenChange={setShowRequirements}>
              <Popover.Trigger asChild>
                <button className="inline-flex items-center gap-2 px-5 py-3 bg-white border-2 border-surface-300 hover:border-primary-400 hover:bg-primary-50 rounded-bento font-bold text-sm text-charcoal-700 hover:text-primary-700 transition-all shadow-soft hover:shadow-bento">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  File Requirements
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-50 w-80 bg-white rounded-bento-lg shadow-bento border-2 border-surface-300 p-6 animate-slide-up" sideOffset={5}>
                  <div className="space-y-3">
                    <h3 className="font-black text-charcoal-700 text-lg">File Requirements</h3>
                    <ul className="space-y-2 text-sm text-charcoal-600 font-semibold">
                      <li className="flex items-start gap-2"><svg className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg><span><strong>Formats:</strong> PNG, JPG, PDF, AI, EPS, SVG</span></li>
                      <li className="flex items-start gap-2"><svg className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg><span><strong>Max Size:</strong> 50MB per file</span></li>
                      <li className="flex items-start gap-2"><svg className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg><span><strong>Resolution:</strong> 300dpi recommended</span></li>
                      <li className="flex items-start gap-2"><svg className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg><span><strong>Best Quality:</strong> Vector files (AI, EPS, SVG)</span></li>
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
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
            <div className="bento-card">
              <div className="space-y-4">
                {enabledLocations.map((location, index) => {
                  const colors = printConfig.locations[location]?.num_colors || 1
                  const file = artworkFiles[location]
                  return (
                    <motion.div key={location} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                      <FileUploadCard
                        location={location}
                        label={getLocationLabel(location)}
                        colors={colors}
                        file={file}
                        artworkFileRecord={artworkFileRecords[location] || null}
                        onFileSelect={(file) => handleFileSelect(location, file)}
                        onFileRemove={() => handleFileRemove(location)}
                        onEditWithAI={() => handleEditWithAI(location)}
                        onRemoveBackground={() => handleRemoveBackground(location)}
                        isRemovingBackground={removingBgLocation === location}
                      />
                    </motion.div>
                  )
                })}
              </div>

              <ValidationSummaryCard issues={getValidationIssues()} getLocationLabel={getLocationLabel} />

              {/* AI Generator Section */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 rounded-bento-lg border-2 border-surface-300 overflow-hidden">
                <button onClick={() => setIsAISectionExpanded(!isAISectionExpanded)} className={`w-full p-4 flex items-center justify-between transition-colors ${isAISectionExpanded ? 'bg-gradient-to-br from-surface-50 to-surface-100' : 'bg-white hover:bg-surface-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-bento bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-charcoal-700 text-sm">Need design help?</span>
                      <span className="block text-xs text-charcoal-500 font-medium">Generate with AI or describe your design</span>
                    </div>
                  </div>
                  <motion.svg animate={{ rotate: isAISectionExpanded ? 180 : 0 }} className="w-5 h-5 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></motion.svg>
                </button>
                <AnimatePresence>
                  {isAISectionExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="p-6 pt-2 bg-gradient-to-br from-surface-50 to-surface-100 border-t border-surface-200">
                        <button onClick={() => setShowAIGenerator(true)} className="w-full mb-4 p-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-bento-lg font-bold shadow-soft hover:shadow-bento transition-all group">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-bento bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            </div>
                            <div className="text-left">
                              <span className="block text-lg font-black">Generate with AI</span>
                              <span className="block text-sm text-white/80 font-medium">Create screen print-ready graphics instantly</span>
                            </div>
                            <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </div>
                        </button>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-300"></div></div>
                          <div className="relative flex justify-center text-sm"><span className="px-3 bg-gradient-to-br from-surface-50 to-surface-100 text-charcoal-500 font-semibold">or describe your design</span></div>
                        </div>
                        <div className="mt-4">
                          <textarea value={textDescription} onChange={(e) => setTextDescription(e.target.value)} placeholder="Example: 'IOWA STATE CHAMPIONSHIP 2024' in bold letters on the front" rows={3} className="w-full px-4 py-3 border-2 border-surface-300 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none resize-none text-sm font-medium text-charcoal-700 placeholder:text-charcoal-400" />
                          {textDescription && (
                            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                              We'll include this with your order
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Column: Live Design Preview with Style Switcher */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:sticky lg:top-24 lg:self-start space-y-6">
            <div className="bento-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-charcoal-700 tracking-tight">Design Preview</h2>
                {selectedGarmentData.length > 1 && (
                  <span className="px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-bold">
                    Style {activeGarmentIndex + 1} of {selectedGarmentData.length}
                  </span>
                )}
              </div>

              {/* Compact Style Switcher */}
              {selectedGarmentData.length > 1 && (
                <div className="mb-4 flex items-center gap-2 text-sm">
                  <span className="text-charcoal-500 font-semibold">Style:</span>
                  <div className="flex gap-1">
                    {selectedGarmentData.map((garment, index) => {
                      const isActive = activeGarmentIndex === index
                      const previewImage = garment.color_images && Object.keys(garment.color_images).length > 0
                        ? garment.color_images[Object.keys(garment.color_images)[0]]
                        : garment.thumbnail_url
                      
                      return (
                        <button
                          key={garment.id}
                          onClick={() => setActiveGarmentIndex(index)}
                          className={`
                            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all
                            ${isActive
                              ? 'bg-primary-500 text-white'
                              : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200 border border-surface-300'
                            }
                          `}
                        >
                          {previewImage && (
                            <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                              <img src={previewImage} alt={garment.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <span className="truncate max-w-[80px]">{garment.name}</span>
                          {isActive && <span className="ml-0.5">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Location Tabs and Content */}
              {enabledLocations.length > 0 && (
                <Tabs.Root value={activeTab || enabledLocations[0]} onValueChange={(val) => setActiveTab(val as PrintLocation)}>
                  {/* Location Content - DesignEditor with color picker and location picker */}
                  {enabledLocations.map((location) => (
                    <Tabs.Content key={location} value={location} className="outline-none">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`${location}-${activeGarmentIndex}`}
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
                            garment={currentGarment}
                            selectedColors={currentGarmentColors}
                            activeColor={activeColor}
                            onColorChange={setActiveColor}
                            onVectorize={handleVectorize}
                            maxInkColors={maxInkColors}
                            detectedColors={detectedColors[location] || 0}
                            enabledLocations={enabledLocations}
                            activeLocation={activeTab || undefined}
                            onLocationChange={(loc) => setActiveTab(loc)}
                            hasArtworkForLocation={hasArtworkForLocation}
                            getLocationLabel={getLocationLabel}
                            onCaptureReady={(captureFunc) => { 
                              captureCanvasRef.current = captureFunc
                              // Signal that canvas is ready for the pending capture (garmentId:color)
                              // Use ref to get the most up-to-date value
                              if (currentCaptureKeyRef.current) {
                                setCanvasReadyForCapture(currentCaptureKeyRef.current)
                              }
                            }}
                          />
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
          <Link href="/custom-shirts/configure/colors" className="w-full sm:w-auto btn-secondary">
            ← Back
          </Link>
          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
            <motion.button
              onClick={handleContinue}
              disabled={!canContinue() || isCapturingMockups}
              whileHover={canContinue() && !isCapturingMockups ? { scale: 1.02 } : {}}
              whileTap={canContinue() && !isCapturingMockups ? { scale: 0.98 } : {}}
              className={`w-full sm:w-auto px-8 py-4 rounded-bento font-black text-base transition-all ${
                canContinue() && !isCapturingMockups
                  ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-soft hover:shadow-bento'
                  : 'bg-surface-300 text-charcoal-400 cursor-not-allowed'
              }`}
            >
              {isCapturingMockups ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Capturing mockups...
                </span>
              ) : canContinue() 
                ? (orderMode === 'campaign' ? 'Continue to Campaign Details →' : 'Continue to Checkout →')
                : 'Complete artwork to continue'}
            </motion.button>
            {!canContinue() && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-charcoal-500 font-semibold text-right">
                {hasUnvectorizedRasterFiles() 
                  ? 'Please vectorize all raster artwork before continuing'
                  : 'Upload artwork for all locations or describe your text design to continue'
                }
              </motion.p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <ArtworkGallery isOpen={showGallery} onClose={() => setShowGallery(false)} />
      
      {/* Saved Artwork Browser Modal */}
      <AnimatePresence>
        {showSavedArtworkBrowser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSavedArtworkBrowser(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-bento-lg shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-surface-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-charcoal-700">My Saved Designs</h2>
                  <p className="text-charcoal-500 text-sm mt-1">Select a design to use for {selectedLocationForSaved ? getLocationLabel(selectedLocationForSaved) : 'your print'}</p>
                </div>
                <button onClick={() => setShowSavedArtworkBrowser(false)} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
                  <svg className="w-6 h-6 text-charcoal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-6 py-3 bg-surface-50 border-b border-surface-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-charcoal-600">Apply to:</span>
                  <div className="flex gap-2">
                    {enabledLocations.map((loc) => (
                      <button key={loc} onClick={() => setSelectedLocationForSaved(loc)} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${selectedLocationForSaved === loc ? 'bg-primary-500 text-white' : 'bg-white border border-surface-300 text-charcoal-600 hover:border-primary-400'}`}>
                        {getLocationLabel(loc)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {loadingSavedArtwork ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (<div key={i} className="aspect-square bg-surface-100 rounded-xl animate-pulse" />))}
                  </div>
                ) : savedArtworkList.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <p className="text-charcoal-600 font-semibold">No saved designs yet</p>
                    <p className="text-charcoal-400 text-sm mt-1">Upload artwork to save it to your account</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {savedArtworkList.map((artwork) => (
                      <button key={artwork.id} onClick={() => handleUseSavedArtwork(artwork)} className="group relative aspect-square bg-white rounded-xl border-2 border-surface-200 hover:border-primary-400 overflow-hidden transition-all hover:shadow-bento">
                        <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 12px 12px' }}>
                          <img src={artwork.image_url} alt={artwork.name} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {artwork.is_ai_generated && (<span className="px-2 py-0.5 bg-violet-500 text-white text-xs font-bold rounded-full">AI</span>)}
                          {artwork.metadata?.is_vector ? (<span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">Vector</span>) : (<span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">Raster</span>)}
                        </div>
                        <div className="absolute inset-0 bg-primary-500/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white font-bold">Use This Design</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-2 border-t border-surface-200">
                          <p className="text-sm font-semibold text-charcoal-700 truncate">{artwork.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AIDesignGenerator 
        isOpen={showAIGenerator} 
        onClose={handleCloseAIGenerator} 
        onDesignGenerated={handleAIDesignGenerated} 
        availableLocations={aiEditLocation ? [aiEditLocation] : enabledLocations}
        initialEditImage={aiEditImage || undefined}
      />
    </div>
  )
}

