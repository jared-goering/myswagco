'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Text, Group } from 'react-konva'
import { PrintLocation, ArtworkTransform, Garment, ArtworkFile } from '@/types'
import Konva from 'konva'
import useImage from 'use-image'
import { motion, AnimatePresence } from 'framer-motion'
import DesignToolbar from './DesignToolbar'
import PrintAreaGuides from './PrintAreaGuides'
import TooltipHelp from './TooltipHelp'

interface DesignEditorProps {
  artworkFile: File | null
  artworkFileRecord: ArtworkFile | null
  printLocation: PrintLocation
  transform: ArtworkTransform | null
  onTransformChange: (transform: ArtworkTransform) => void
  garment: Garment | null
  selectedColors: string[]
  activeColor: string
  onColorChange: (color: string) => void
  onVectorize?: (artworkFileId: string) => Promise<void>
  maxInkColors?: number
  detectedColors?: number
  // Location picker props
  enabledLocations?: PrintLocation[]
  activeLocation?: PrintLocation
  onLocationChange?: (location: PrintLocation) => void
  hasArtworkForLocation?: (location: PrintLocation) => boolean
  getLocationLabel?: (location: PrintLocation) => string
}

// Canvas dimensions - sized to show shirt proportionally (22" wide × 30" long)
const CANVAS_WIDTH = 500
const CANVAS_HEIGHT = 550

// Shirt positioning (centered with padding)
const SHIRT_PADDING = 28
const SHIRT_WIDTH = CANVAS_WIDTH - (SHIRT_PADDING * 2)
const SHIRT_HEIGHT = CANVAS_HEIGHT - (SHIRT_PADDING * 2)

// Maximum print dimensions in inches
const MAX_PRINT_DIMENSIONS: Record<PrintLocation, { width: number; height: number }> = {
  front: { width: 11, height: 17 },
  back: { width: 11, height: 17 },
  left_chest: { width: 4, height: 4 },
  right_chest: { width: 4, height: 4 },
  full_back: { width: 13, height: 19 },
}

// Print area dimensions in pixels (scaled to match actual shirt body)
const PRINT_AREAS: Record<PrintLocation, { width: number; height: number; x: number; y: number }> = {
  front: { width: 165, height: 255, x: 167.5, y: 135 },
  back: { width: 165, height: 255, x: 167.5, y: 130 },
  left_chest: { width: 60, height: 60, x: 290, y: 165 },
  right_chest: { width: 60, height: 60, x: 150, y: 165 },
  full_back: { width: 195, height: 285, x: 152.5, y: 125 },
}

// Calculate pixels per inch for each location
function getPixelsPerInch(location: PrintLocation): { x: number; y: number } {
  const printArea = PRINT_AREAS[location]
  const maxDimensions = MAX_PRINT_DIMENSIONS[location]
  return {
    x: printArea.width / maxDimensions.width,
    y: printArea.height / maxDimensions.height,
  }
}

// Get shirt image URL - either from garment color images or fallback to SVG
function getShirtImageUrl(location: PrintLocation, garment: Garment | null, activeColor: string): string | null {
  if (garment && activeColor) {
    // For back locations, try back image first, then front image as fallback
    if (location === 'back' || location === 'full_back') {
      if (garment.color_back_images?.[activeColor]) {
        return garment.color_back_images[activeColor]
      }
      // Fallback to front image if no back image exists
      if (garment.color_images?.[activeColor]) {
        return garment.color_images[activeColor]
      }
    }
    // For front locations, use front image
    else if (garment.color_images?.[activeColor]) {
      return garment.color_images[activeColor]
    }
  }
  
  // Fallback to SVG if no garment images
  if (location === 'front' || location === 'left_chest' || location === 'right_chest') {
    return '/shirt-front.svg'
  } else if (location === 'back' || location === 'full_back') {
    return '/shirt-back.svg'
  }
  return null
}

interface HistoryState {
  transform: ArtworkTransform
  timestamp: number
}

export default function DesignEditor({ 
  artworkFile,
  artworkFileRecord,
  printLocation, 
  transform, 
  onTransformChange,
  garment,
  selectedColors,
  activeColor,
  onColorChange,
  onVectorize,
  maxInkColors = 4,
  detectedColors = 0,
  enabledLocations = [],
  activeLocation,
  onLocationChange,
  hasArtworkForLocation,
  getLocationLabel
}: DesignEditorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [isSelected, setIsSelected] = useState(false)
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  const [isVectorizing, setIsVectorizing] = useState(false)
  const [showVectorized, setShowVectorized] = useState(false)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const imageRef = useRef<Konva.Image>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const stageRef = useRef<Konva.Stage>(null)
  
  // Refs for tracking image loading state
  const isInitialLoadRef = useRef(true)
  const lastImageDimensionsRef = useRef<{ width: number; height: number } | null>(null)
  
  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyStep, setHistoryStep] = useState(-1)
  
  // Load shirt image (either actual garment photo or SVG)
  const shirtImageUrl = getShirtImageUrl(printLocation, garment, activeColor)
  const [shirtImage] = useImage(shirtImageUrl || '', 'anonymous')

  const printArea = PRINT_AREAS[printLocation]
  const maxDimensions = MAX_PRINT_DIMENSIONS[printLocation]
  const pixelsPerInch = getPixelsPerInch(printLocation)

  // Calculate current dimensions in inches
  function getCurrentDimensions(): { width: number; height: number } | null {
    if (!image || !transform) return null
    const widthPx = image.width * transform.scale * Math.abs(scaleX)
    const heightPx = image.height * transform.scale * Math.abs(scaleY)
    return {
      width: widthPx / pixelsPerInch.x,
      height: heightPx / pixelsPerInch.y,
    }
  }

  // Save to history
  const saveToHistory = useCallback((newTransform: ArtworkTransform) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1)
      newHistory.push({ transform: newTransform, timestamp: Date.now() })
      // Keep only last 20 states
      return newHistory.slice(-20)
    })
    setHistoryStep(prev => Math.min(prev + 1, 19))
  }, [historyStep])

  // Undo
  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      const newStep = historyStep - 1
      setHistoryStep(newStep)
      onTransformChange(history[newStep].transform)
    }
  }, [historyStep, history, onTransformChange])

  // Redo
  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1
      setHistoryStep(newStep)
      onTransformChange(history[newStep].transform)
    }
  }, [historyStep, history, onTransformChange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!image || !transform) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Undo/Redo
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }
      if (cmdOrCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
        return
      }

      if (!isSelected) return

      const nudgeAmount = e.shiftKey ? 10 : 1

      // Arrow keys to nudge
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onTransformChange({ ...transform, x: transform.x - nudgeAmount })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onTransformChange({ ...transform, x: transform.x + nudgeAmount })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        onTransformChange({ ...transform, y: transform.y - nudgeAmount })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        onTransformChange({ ...transform, y: transform.y + nudgeAmount })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [image, transform, isSelected, onTransformChange, handleUndo, handleRedo])

  // Load image when file changes and create stable URL
  // Also handle persisted records (after page reload)
  useEffect(() => {
    // Check if we have either a File or a persisted record with URL
    const hasPersistedRecord = !artworkFile && artworkFileRecord && 
      (artworkFileRecord.file_url || artworkFileRecord.vectorized_file_url)
    
    if (!artworkFile && !hasPersistedRecord) {
      setImage(null)
      setOriginalImageUrl(null)
      lastImageDimensionsRef.current = null
      isInitialLoadRef.current = true
      return
    }

    // Mark as initial load
    isInitialLoadRef.current = true

    let blobUrl: string | null = null
    let urlToLoad: string
    
    if (artworkFile) {
      // Create a stable blob URL for the original file
      blobUrl = URL.createObjectURL(artworkFile)
      setOriginalImageUrl(blobUrl)
      
      // Determine which image to load (might be vectorized)
      urlToLoad = artworkFileRecord?.vectorization_status === 'completed' && artworkFileRecord?.vectorized_file_url
        ? artworkFileRecord.vectorized_file_url
        : blobUrl
    } else {
      // Use persisted URLs (after page reload)
      const persistedUrl = artworkFileRecord?.vectorized_file_url || artworkFileRecord?.file_url || ''
      setOriginalImageUrl(artworkFileRecord?.file_url || persistedUrl)
      urlToLoad = persistedUrl
    }

    const img = new window.Image()
    img.crossOrigin = 'anonymous' // Needed for data URLs and external URLs
    img.onload = () => {
      // Store dimensions for this image
      lastImageDimensionsRef.current = { width: img.width, height: img.height }
      
      setImage(img)
      
      // Set default transform if not already set (first time upload)
      if (!transform) {
        const scale = Math.min(
          printArea.width / img.width,
          printArea.height / img.height,
          1
        ) * 0.8 // Start at 80% of max size
        
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        
        const newTransform = {
          x: printArea.x + (printArea.width - scaledWidth) / 2,
          y: printArea.y + (printArea.height - scaledHeight) / 2,
          scale,
          rotation: 0,
        }
        onTransformChange(newTransform)
        saveToHistory(newTransform)
      }
      
      // Mark initial load as complete after image is loaded
      // Use requestAnimationFrame to ensure render cycle completes
      requestAnimationFrame(() => {
        isInitialLoadRef.current = false
      })
    }
    img.src = urlToLoad
    
    // Cleanup blob URL on unmount (only if we created one)
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [artworkFile, printLocation, artworkFileRecord?.vectorization_status, artworkFileRecord?.vectorized_file_url, artworkFileRecord?.file_url])

  // Update transformer when image is selected
  useEffect(() => {
    if (isSelected && imageRef.current && transformerRef.current) {
      transformerRef.current.nodes([imageRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const handleTransformEnd = () => {
    const node = imageRef.current
    if (!node || !image || !transform) return

    // Get the scale applied by the transformer
    const nodeScaleX = node.scaleX()
    const nodeScaleY = node.scaleY()
    
    // Calculate new scale based on original image dimensions
    const currentWidth = image.width * transform.scale
    const newWidth = currentWidth * Math.abs(nodeScaleX)
    const newScale = newWidth / image.width

    // Store flip state
    setScaleX(nodeScaleX < 0 ? -1 : 1)
    setScaleY(nodeScaleY < 0 ? -1 : 1)

    // Reset the node scale back to 1 to prevent compounding
    node.scaleX(nodeScaleX < 0 ? -1 : 1)
    node.scaleY(nodeScaleY < 0 ? -1 : 1)

    const newTransform = {
      x: node.x(),
      y: node.y(),
      scale: newScale,
      rotation: node.rotation(),
    }
    onTransformChange(newTransform)
    saveToHistory(newTransform)
  }

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!transform) return
    const newTransform = {
      x: e.target.x(),
      y: e.target.y(),
      scale: transform.scale,
      rotation: transform.rotation,
    }
    onTransformChange(newTransform)
    saveToHistory(newTransform)
  }

  // Toolbar actions
  const handleCenter = () => {
    if (!image || !transform) return
    const scaledWidth = image.width * transform.scale
    const scaledHeight = image.height * transform.scale
    onTransformChange({
      ...transform,
      x: printArea.x + (printArea.width - scaledWidth) / 2,
      y: printArea.y + (printArea.height - scaledHeight) / 2,
      rotation: 0,
    })
  }

  const handleFit = () => {
    if (!image || !transform) return
    const scale = Math.min(
      printArea.width / image.width,
      printArea.height / image.height
    ) * 0.95 // 95% to leave small margin
    
    const scaledWidth = image.width * scale
    const scaledHeight = image.height * scale
    
    onTransformChange({
      x: printArea.x + (printArea.width - scaledWidth) / 2,
      y: printArea.y + (printArea.height - scaledHeight) / 2,
      scale,
      rotation: 0,
    })
  }

  const handleReset = () => {
    if (!image) return
    const scale = Math.min(
      printArea.width / image.width,
      printArea.height / image.height,
      1
    ) * 0.8
    
    const scaledWidth = image.width * scale
    const scaledHeight = image.height * scale
    
    onTransformChange({
      x: printArea.x + (printArea.width - scaledWidth) / 2,
      y: printArea.y + (printArea.height - scaledHeight) / 2,
      scale,
      rotation: 0,
    })
    setScaleX(1)
    setScaleY(1)
    setIsSelected(false)
  }

  const handleRotate = (angle: number) => {
    if (!transform) return
    onTransformChange({
      ...transform,
      rotation: (transform.rotation + angle) % 360,
    })
  }

  const handleFlipH = () => {
    setScaleX(prev => prev * -1)
    if (imageRef.current) {
      imageRef.current.scaleX(scaleX * -1)
    }
  }

  const handleFlipV = () => {
    setScaleY(prev => prev * -1)
    if (imageRef.current) {
      imageRef.current.scaleY(scaleY * -1)
    }
  }

  const handleVectorize = async () => {
    if (!artworkFileRecord || !onVectorize) return
    
    setIsVectorizing(true)
    try {
      await onVectorize(artworkFileRecord.id)
      setShowVectorized(true)
    } catch (error) {
      console.error('Vectorization failed:', error)
    } finally {
      setIsVectorizing(false)
    }
  }

  // Determine which image to display
  const displayImageUrl = artworkFileRecord?.vectorized_file_url && showVectorized
    ? artworkFileRecord.vectorized_file_url
    : originalImageUrl

  // Update image when vectorized version becomes available
  useEffect(() => {
    if (artworkFileRecord?.vectorization_status === 'completed' && artworkFileRecord.vectorized_file_url) {
      setShowVectorized(true)
    }
  }, [artworkFileRecord?.vectorization_status, artworkFileRecord?.vectorized_file_url])

  // Reload image when toggling between original and vectorized
  // This effect ONLY handles switching between original/vectorized, NOT initial load
  useEffect(() => {
    const imageUrl = displayImageUrl
    if (!imageUrl) return

    // Skip if this is handled by the artworkFile effect (initial load)
    if (isInitialLoadRef.current) {
      return
    }

    // Only run if we already have an image (i.e., toggling views)
    if (!image) return

    const img = new window.Image()
    img.onload = () => {
      const prevDims = lastImageDimensionsRef.current
      
      // Check if dimensions actually changed
      if (prevDims && (prevDims.width !== img.width || prevDims.height !== img.height)) {
        // Calculate the visual size we want to maintain (in pixels)
        const currentVisualWidth = prevDims.width * (transform?.scale || 1)
        const currentVisualHeight = prevDims.height * (transform?.scale || 1)
        
        // Calculate new scale to maintain the same visual size
        const newScale = currentVisualWidth / img.width
        
        // Sanity check - scale should be reasonable
        if (newScale > 0 && newScale < 100 && transform) {
          onTransformChange({
            ...transform,
            scale: newScale,
          })
        }
      }
      
      // Update dimensions ref and image
      lastImageDimensionsRef.current = { width: img.width, height: img.height }
      setImage(img)
    }
    img.src = imageUrl
  }, [displayImageUrl, image, transform, onTransformChange])

  if (!image || !transform) {
    return (
      <div className="space-y-4">
        {/* Compact Preview Controls - Color Selector (even when no artwork) */}
        {selectedColors.length > 1 && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-charcoal-500 font-semibold text-sm">Color:</span>
            <div className="flex gap-1">
              {selectedColors.map((color) => {
                const isActive = color === activeColor
                const colorImageUrl = garment?.color_images?.[color]
                
                return (
                  <button
                    key={color}
                    onClick={() => onColorChange(color)}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all
                      ${isActive
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200 border border-surface-300'
                      }
                    `}
                  >
                    {colorImageUrl && (
                      <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                        <img src={colorImageUrl} alt={color} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span>{color}</span>
                    {isActive && <span className="ml-0.5">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Location Toggle - Premium Segmented Control (empty state) */}
        {enabledLocations.length > 1 && onLocationChange && getLocationLabel && (
          <div className="mb-4">
            <div className="relative inline-flex bg-surface-100 rounded-xl p-1 shadow-inner">
              <motion.div
                className="absolute top-1 bottom-1 bg-white rounded-lg shadow-md"
                initial={false}
                animate={{
                  x: enabledLocations.indexOf(activeLocation || enabledLocations[0]) * 120,
                  width: 120,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
              {enabledLocations.map((loc) => {
                const isActive = activeLocation === loc
                const hasArtwork = hasArtworkForLocation?.(loc)
                const isFront = loc === 'front' || loc === 'left_chest' || loc === 'right_chest'
                
                return (
                  <button
                    key={loc}
                    onClick={() => onLocationChange(loc)}
                    className={`
                      relative z-10 flex items-center justify-center gap-2 w-[120px] py-2.5 rounded-lg text-sm font-bold transition-colors duration-200
                      ${isActive ? 'text-charcoal-800' : 'text-charcoal-500 hover:text-charcoal-700'}
                    `}
                  >
                    <svg className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isFront ? (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 4l3 2h6l3-2 3 3-2 3v10a1 1 0 01-1 1H6a1 1 0 01-1-1V10L3 7l3-3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6a3 3 0 006 0" />
                        </>
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 4l3 2h6l3-2 3 3-2 3v10a1 1 0 01-1 1H6a1 1 0 01-1-1V10L3 7l3-3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6h4v2h-4z" />
                        </>
                      )}
                    </svg>
                    <span>{getLocationLabel(loc)}</span>
                    {hasArtwork && (
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-emerald-400'}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg">
          <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
            <Layer>
              {/* Shirt SVG background */}
              {shirtImage && (
                <KonvaImage
                  image={shirtImage}
                  x={SHIRT_PADDING}
                  y={SHIRT_PADDING}
                  width={SHIRT_WIDTH}
                  height={SHIRT_HEIGHT}
                  listening={false}
                  opacity={0.6}
                />
              )}
              
              <PrintAreaGuides printArea={printArea} showGrid={false} animated={false} />
            </Layer>
          </Stage>
          
          {/* Upload message overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center p-8 bg-white/95 backdrop-blur-sm rounded-lg border-2 border-gray-200 shadow-xl"
            >
              <motion.svg 
                className="w-20 h-20 text-gray-300 mx-auto mb-4"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </motion.svg>
              <p className="text-gray-700 font-semibold text-lg mb-2">Upload artwork to preview</p>
              <p className="text-gray-500 text-sm">Your design will appear here for positioning</p>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  const dims = getCurrentDimensions()
  const isOversize = dims ? (dims.width > maxDimensions.width || dims.height > maxDimensions.height) : false

  return (
    <div className="space-y-4">
      {/* Color Selector - Compact */}
      {selectedColors.length > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-charcoal-500 font-semibold text-sm">Color:</span>
          <div className="flex gap-1">
            {selectedColors.map((color) => {
              const isActive = color === activeColor
              const colorImageUrl = garment?.color_images?.[color]
              
              return (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${isActive
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200 border border-surface-300'
                    }
                  `}
                >
                  {colorImageUrl && (
                    <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                      <img src={colorImageUrl} alt={color} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <span>{color}</span>
                  {isActive && <span className="ml-0.5">✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Location Toggle - Premium Segmented Control */}
      {enabledLocations.length > 1 && onLocationChange && getLocationLabel && (
        <div className="mb-4">
          <div className="relative inline-flex bg-surface-100 rounded-xl p-1 shadow-inner">
            {/* Sliding Background Indicator */}
            <motion.div
              className="absolute top-1 bottom-1 bg-white rounded-lg shadow-md"
              initial={false}
              animate={{
                x: enabledLocations.indexOf(activeLocation || enabledLocations[0]) * (typeof window !== 'undefined' ? 120 : 120),
                width: 120,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
            
            {enabledLocations.map((loc) => {
              const isActive = activeLocation === loc
              const hasArtwork = hasArtworkForLocation?.(loc)
              const isFront = loc === 'front' || loc === 'left_chest' || loc === 'right_chest'
              
              return (
                <button
                  key={loc}
                  onClick={() => onLocationChange(loc)}
                  className={`
                    relative z-10 flex items-center justify-center gap-2 w-[120px] py-2.5 rounded-lg text-sm font-bold transition-colors duration-200
                    ${isActive
                      ? 'text-charcoal-800'
                      : 'text-charcoal-500 hover:text-charcoal-700'
                    }
                  `}
                >
                  {/* Location Icon - T-shirt front/back */}
                  <svg 
                    className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    {isFront ? (
                      /* T-shirt front with neckline */
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 4l3 2h6l3-2 3 3-2 3v10a1 1 0 01-1 1H6a1 1 0 01-1-1V10L3 7l3-3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6a3 3 0 006 0" />
                      </>
                    ) : (
                      /* T-shirt back with tag */
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 4l3 2h6l3-2 3 3-2 3v10a1 1 0 01-1 1H6a1 1 0 01-1-1V10L3 7l3-3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6h4v2h-4z" />
                      </>
                    )}
                  </svg>
                  
                  <span>{getLocationLabel(loc)}</span>
                  
                  {/* Artwork Status Indicator */}
                  {hasArtwork && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`
                        w-2 h-2 rounded-full
                        ${isActive ? 'bg-emerald-500' : 'bg-emerald-400'}
                      `}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Canvas Section with Enhanced Styling */}
      <motion.div 
        key={activeColor}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative bg-gradient-to-br from-surface-50 to-surface-100 rounded-bento-lg border-2 border-surface-200 overflow-hidden shadow-soft hover:shadow-bento transition-shadow duration-300"
      >
        <Stage 
          ref={stageRef}
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          className="cursor-move bg-white"
          onClick={(e) => {
            // Click on empty area deselects
            if (e.target === e.target.getStage()) {
              setIsSelected(false)
            }
          }}
        >
          <Layer>
            {/* Shirt SVG background */}
            {shirtImage && (
              <KonvaImage
                image={shirtImage}
                x={SHIRT_PADDING}
                y={SHIRT_PADDING}
                width={SHIRT_WIDTH}
                height={SHIRT_HEIGHT}
                listening={false}
                opacity={0.7}
              />
            )}

            <PrintAreaGuides printArea={printArea} showGrid={true} showSafeArea={true} animated={true} />

            {/* Artwork image */}
            <KonvaImage
              ref={imageRef}
              image={image}
              x={transform.x}
              y={transform.y}
              offsetX={scaleX < 0 ? image.width * transform.scale : 0}
              offsetY={scaleY < 0 ? image.height * transform.scale : 0}
              width={image.width * transform.scale}
              height={image.height * transform.scale}
              rotation={transform.rotation}
              scaleX={scaleX}
              scaleY={scaleY}
              draggable
              onClick={() => setIsSelected(true)}
              onTap={() => setIsSelected(true)}
              onDragEnd={handleDragEnd}
              onTransformEnd={handleTransformEnd}
              shadowEnabled={isSelected}
              shadowColor="black"
              shadowBlur={10}
              shadowOpacity={0.3}
            />

            {/* Transformer for resize/rotate */}
            {isSelected && (
              <Transformer
                ref={transformerRef}
                rotateEnabled
                keepRatio
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center']}
                boundBoxFunc={(oldBox, newBox) => {
                  // Limit minimum size
                  if (newBox.width < 20 || newBox.height < 20) {
                    return oldBox
                  }
                  return newBox
                }}
                anchorStroke="#3b82f6"
                anchorFill="white"
                anchorSize={8}
                borderStroke="#3b82f6"
                borderStrokeWidth={2}
              />
            )}
          </Layer>
        </Stage>

        {/* Dimension display - Enhanced */}
        <AnimatePresence>
          {dims && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`
                absolute bottom-4 left-4 z-10 rounded-bento-lg shadow-bento backdrop-blur-md border-2 overflow-hidden
                ${isOversize 
                  ? 'bg-error-50/95 border-error-400' 
                  : 'bg-white/95 border-surface-300'
                }
              `}
            >
              <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {isOversize ? (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-error-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${isOversize ? 'text-error-700' : 'text-charcoal-500'}`}>
                      Design Size
                    </div>
                    <div className={`text-xl font-black ${isOversize ? 'text-error-900' : 'text-charcoal-800'}`}>
                      {dims.width.toFixed(1)}" × {dims.height.toFixed(1)}"
                    </div>
                    <div className={`text-xs font-medium mt-0.5 ${isOversize ? 'text-error-600' : 'text-charcoal-400'}`}>
                      Max: {maxDimensions.width}" × {maxDimensions.height}"
                    </div>
                  </div>
                </div>
              </div>
              {isOversize && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-4 py-2 bg-error-500 text-white text-xs font-bold"
                >
                  ⚠️ Design exceeds maximum print area
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard shortcuts hint - Enhanced */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-4 right-4 bg-charcoal-800/95 backdrop-blur-md text-white rounded-bento-lg shadow-bento border border-charcoal-600 overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-charcoal-700/50 border-b border-charcoal-600">
              <div className="font-black text-xs uppercase tracking-wide flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
                Keyboard Shortcuts
              </div>
            </div>
            <div className="px-4 py-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-charcoal-300 font-medium">Nudge design</span>
                <kbd className="px-2 py-0.5 bg-charcoal-700 rounded border border-charcoal-500 font-mono text-xs">
                  ← → ↑ ↓
                </kbd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-charcoal-300 font-medium">Nudge 10px</span>
                <kbd className="px-2 py-0.5 bg-charcoal-700 rounded border border-charcoal-500 font-mono text-xs">
                  Shift + Arrows
                </kbd>
              </div>
              <div className="border-t border-charcoal-700 my-2"></div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-charcoal-300 font-medium">Undo</span>
                <kbd className="px-2 py-0.5 bg-charcoal-700 rounded border border-charcoal-500 font-mono text-xs">
                  ⌘Z
                </kbd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-charcoal-300 font-medium">Redo</span>
                <kbd className="px-2 py-0.5 bg-charcoal-700 rounded border border-charcoal-500 font-mono text-xs">
                  ⌘⇧Z
                </kbd>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* File Type Badge & Status - Enhanced with better spacing */}
      {artworkFileRecord && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          <TooltipHelp
            content={
              artworkFileRecord.is_vector
                ? "Vector files produce the highest quality prints at any size."
                : artworkFileRecord.vectorization_status === 'completed'
                ? "Your file has been successfully converted to vector format for optimal printing."
                : "Raster files need to be vectorized for the best screen printing results."
            }
          >
            <div className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-bento text-xs font-bold cursor-help transition-all shadow-soft hover:shadow-bento hover:scale-105
              ${artworkFileRecord.is_vector
                ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-800 border-2 border-emerald-300'
                : artworkFileRecord.vectorization_status === 'completed'
                ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-800 border-2 border-emerald-300'
                : artworkFileRecord.vectorization_status === 'processing'
                ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border-2 border-blue-300 animate-pulse'
                : 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 border-2 border-amber-300'
              }
            `}>
              {artworkFileRecord.is_vector ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Vector Format
                </>
              ) : artworkFileRecord.vectorization_status === 'completed' ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Vectorized ✓
                </>
              ) : artworkFileRecord.vectorization_status === 'processing' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Raster - Needs Vectorization
                </>
              )}
            </div>
          </TooltipHelp>
          
          {/* Toggle between original and vectorized - Enhanced */}
          {artworkFileRecord.vectorization_status === 'completed' && artworkFileRecord.vectorized_file_url && (
            <TooltipHelp content="Compare the original raster file with the vectorized version">
              <motion.button
                onClick={() => setShowVectorized(!showVectorized)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-bento text-xs font-bold bg-white hover:bg-surface-50 text-charcoal-700 border-2 border-surface-300 hover:border-primary-300 transition-all shadow-soft hover:shadow-bento"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                {showVectorized ? 'Show Original' : 'Show Vectorized'}
              </motion.button>
            </TooltipHelp>
          )}
          
          {/* Color count warning - Enhanced */}
          {detectedColors > maxInkColors && (
            <TooltipHelp content={`Your design uses ${detectedColors} colors, which exceeds the recommended ${maxInkColors} color maximum. Each additional color may increase printing costs.`}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-bento text-xs font-bold bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 border-2 border-amber-300 cursor-help shadow-soft hover:shadow-bento hover:scale-105 transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {detectedColors} colors (max: {maxInkColors})
              </motion.div>
            </TooltipHelp>
          )}
        </motion.div>
      )}

      {/* Vectorize Button - Enhanced Prominent CTA */}
      {artworkFileRecord && !artworkFileRecord.is_vector && artworkFileRecord.vectorization_status !== 'completed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative"
        >
          <div className="bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50 border-2 border-primary-300 rounded-bento-lg p-6 shadow-bento overflow-hidden">
            {/* Decorative gradient orbs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-200 rounded-full blur-3xl opacity-30 -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-200 rounded-full blur-3xl opacity-20 -ml-16 -mb-16"></div>
            
            <div className="relative flex items-start gap-4">
              <motion.div 
                className="flex-shrink-0"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-bento shadow-soft flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-black text-charcoal-800">Convert to Vector Format</h3>
                  <TooltipHelp 
                    content="Screen printing requires vector files for the best results. Vectors are resolution-independent and produce crisp, clean prints at any size without pixelation."
                    side="right"
                  >
                    <svg className="w-4 h-4 text-primary-600 cursor-help hover:text-primary-700 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </TooltipHelp>
                </div>
                <p className="text-sm text-charcoal-600 font-medium mb-5 leading-relaxed">
                  Your PNG file will be automatically converted to vector format (SVG). This process typically takes 5-15 seconds and ensures crisp, clean prints at any size.
                </p>
                <motion.button
                  onClick={handleVectorize}
                  disabled={isVectorizing}
                  whileHover={!isVectorizing ? { scale: 1.03 } : {}}
                  whileTap={!isVectorizing ? { scale: 0.97 } : {}}
                  className={`
                    px-7 py-3.5 rounded-bento font-black text-base flex items-center gap-3 transition-all
                    ${isVectorizing
                      ? 'bg-primary-300 text-primary-700 cursor-wait'
                      : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-bento hover:shadow-xl'
                    }
                  `}
                >
                  {isVectorizing ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Vectorizing... (5-15 seconds)</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span>Vectorize for Print</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Subtle Divider */}
      <div className="relative h-px my-2">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-surface-200 to-transparent"></div>
      </div>

      {/* Toolbar Section with Enhanced Presentation */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-charcoal-500">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Design Tools
        </div>
        <DesignToolbar
          onCenter={handleCenter}
          onFit={handleFit}
          onReset={handleReset}
          onRotate={handleRotate}
          onFlipH={handleFlipH}
          onFlipV={handleFlipV}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyStep > 0}
          canRedo={historyStep < history.length - 1}
        />
      </motion.div>
    </div>
  )
}
