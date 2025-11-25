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
  showVectorized?: boolean
  onShowVectorizedChange?: (show: boolean) => void
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

interface ContentBounds {
  x: number
  y: number
  width: number
  height: number
}

// Detect actual content bounds by scanning for non-background pixels
function detectContentBounds(img: HTMLImageElement): ContentBounds | null {
  console.log('[CROP DEBUG] detectContentBounds called, image size:', img.width, 'x', img.height)
  try {
    const canvas = document.createElement('canvas')
    // Use smaller size for performance on large images
    const maxSize = 500
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    canvas.width = Math.floor(img.width * scale)
    canvas.height = Math.floor(img.height * scale)
    console.log('[CROP DEBUG] Canvas size:', canvas.width, 'x', canvas.height, 'scale:', scale)
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.log('[CROP DEBUG] Failed to get canvas context')
      return null
    }
    
    // Fill with white first to have a consistent background for detection
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    console.log('[CROP DEBUG] Attempting getImageData...')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    console.log('[CROP DEBUG] Got imageData, length:', data.length)
    
    let minX = canvas.width
    let minY = canvas.height
    let maxX = 0
    let maxY = 0
    let contentPixels = 0
    
    // Scan for pixels that are NOT white/near-white AND NOT fully transparent
    // This handles both transparent PNGs and white-background SVGs
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const idx = (y * canvas.width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        const alpha = data[idx + 3]
        
        // Skip fully transparent pixels
        if (alpha < 10) continue
        
        // Skip white/near-white pixels (background)
        // A pixel is considered "white" if all RGB values are > 250
        const isWhite = r > 250 && g > 250 && b > 250
        if (isWhite) continue
        
        // This pixel is visible content
        contentPixels++
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
    
    console.log('[CROP DEBUG] Content pixels found:', contentPixels, 'bounds:', { minX, minY, maxX, maxY })
    
    if (maxX < minX || maxY < minY) {
      console.log('[CROP DEBUG] No visible content, returning null')
      return null
    }
    
    // Add small padding (2% of size)
    const padX = Math.floor(canvas.width * 0.02)
    const padY = Math.floor(canvas.height * 0.02)
    minX = Math.max(0, minX - padX)
    minY = Math.max(0, minY - padY)
    maxX = Math.min(canvas.width - 1, maxX + padX)
    maxY = Math.min(canvas.height - 1, maxY + padY)
    
    // Scale back to original image coordinates
    const result = {
      x: Math.floor(minX / scale),
      y: Math.floor(minY / scale),
      width: Math.ceil((maxX - minX + 1) / scale),
      height: Math.ceil((maxY - minY + 1) / scale),
    }
    console.log('[CROP DEBUG] Final bounds:', result, 'vs original:', img.width, 'x', img.height)
    return result
  } catch (e) {
    console.error('[CROP DEBUG] Error:', e)
    return null
  }
}

// Parse SVG to get viewBox dimensions for proper rendering
function getSvgViewBoxDimensions(svgDataUrl: string): { width: number; height: number } | null {
  try {
    // Decode base64 SVG
    const base64 = svgDataUrl.split(',')[1]
    if (!base64) return null
    const svgText = atob(base64)
    
    // Parse viewBox
    const viewBoxMatch = svgText.match(/viewBox=["']([^"']+)["']/)
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/[\s,]+/)
      if (parts.length >= 4) {
        const width = parseFloat(parts[2])
        const height = parseFloat(parts[3])
        if (width > 0 && height > 0) {
          console.log('[CROP DEBUG] Parsed SVG viewBox:', width, 'x', height)
          return { width, height }
        }
      }
    }
    
    // Try width/height attributes
    const widthMatch = svgText.match(/width=["'](\d+)/)
    const heightMatch = svgText.match(/height=["'](\d+)/)
    if (widthMatch && heightMatch) {
      return { width: parseInt(widthMatch[1]), height: parseInt(heightMatch[1]) }
    }
    
    return null
  } catch (e) {
    console.error('[CROP DEBUG] Error parsing SVG:', e)
    return null
  }
}

// Render SVG at full resolution and return via callback
function renderSvgAtFullSize(
  svgDataUrl: string,
  viewBoxDims: { width: number; height: number },
  onLoad: (fullSizeImg: HTMLImageElement, scale: number) => void
): void {
  // Cap at reasonable max size for performance
  const maxDim = 2000
  const scale = Math.min(1, maxDim / Math.max(viewBoxDims.width, viewBoxDims.height))
  const targetWidth = Math.round(viewBoxDims.width * scale)
  const targetHeight = Math.round(viewBoxDims.height * scale)
  
  console.log('[CROP DEBUG] Rendering SVG at:', targetWidth, 'x', targetHeight, '(scale:', scale, ')')
  
  // Create a new SVG with explicit dimensions
  const base64 = svgDataUrl.split(',')[1]
  if (!base64) return
  
  let svgText: string
  try {
    svgText = atob(base64)
  } catch (e) {
    console.error('[CROP DEBUG] Error decoding base64:', e)
    return
  }
  
  // Add or replace width/height attributes
  svgText = svgText.replace(/<svg/, `<svg width="${targetWidth}" height="${targetHeight}"`)
  
  // Use encodeURIComponent for non-ASCII safe encoding
  const newDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
  
  const img = new window.Image()
  img.onload = () => {
    console.log('[CROP DEBUG] Full-size SVG loaded:', img.width, 'x', img.height)
    onLoad(img, scale)
  }
  img.onerror = (e) => {
    console.error('[CROP DEBUG] Error loading full-size SVG:', e)
  }
  img.src = newDataUrl
}

// Create a cropped version of an image and return via callback
function createCroppedImage(
  img: HTMLImageElement, 
  bounds: ContentBounds, 
  onLoad: (croppedImg: HTMLImageElement) => void,
  sourceImgUrl?: string
): void {
  console.log('[CROP DEBUG] createCroppedImage called with bounds:', bounds, 'img size:', img.width, 'x', img.height)
  
  // Check if this is an SVG that needs full-resolution rendering
  const isSvg = sourceImgUrl?.startsWith('data:image/svg')
  if (isSvg && sourceImgUrl) {
    const viewBoxDims = getSvgViewBoxDimensions(sourceImgUrl)
    if (viewBoxDims && (viewBoxDims.width > img.width * 2 || viewBoxDims.height > img.height * 2)) {
      console.log('[CROP DEBUG] SVG has larger viewBox, rendering at full size first')
      
      // Render SVG at full size, then crop
      renderSvgAtFullSize(sourceImgUrl, viewBoxDims, (fullSizeImg, scale) => {
        // Scale bounds to match full-size render
        const scaleFactor = fullSizeImg.width / img.width
        const scaledBounds = {
          x: Math.floor(bounds.x * scaleFactor),
          y: Math.floor(bounds.y * scaleFactor),
          width: Math.ceil(bounds.width * scaleFactor),
          height: Math.ceil(bounds.height * scaleFactor)
        }
        console.log('[CROP DEBUG] Scaled bounds for full-size:', scaledBounds)
        
        // Now crop from full-size image
        cropFromImage(fullSizeImg, scaledBounds, onLoad)
      })
      return
    }
  }
  
  // Standard cropping for non-SVG or small SVG
  cropFromImage(img, bounds, onLoad)
}

// Helper to actually perform the crop
function cropFromImage(
  img: HTMLImageElement,
  bounds: ContentBounds,
  onLoad: (croppedImg: HTMLImageElement) => void
): void {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bounds.width
    canvas.height = bounds.height
    console.log('[CROP DEBUG] Created canvas:', canvas.width, 'x', canvas.height)
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.log('[CROP DEBUG] Failed to get context')
      return
    }
    
    // Draw only the cropped portion
    ctx.drawImage(
      img,
      bounds.x, bounds.y, bounds.width, bounds.height, // source
      0, 0, bounds.width, bounds.height // destination
    )
    console.log('[CROP DEBUG] Drew cropped portion from', bounds.x, bounds.y, 'size', bounds.width, 'x', bounds.height)
    
    // Create a new image from the canvas
    const croppedImg = new window.Image()
    // IMPORTANT: Set onload BEFORE setting src
    croppedImg.onload = () => {
      console.log('[CROP DEBUG] Cropped image loaded, size:', croppedImg.width, 'x', croppedImg.height)
      onLoad(croppedImg)
    }
    const dataUrl = canvas.toDataURL('image/png')
    console.log('[CROP DEBUG] Created data URL, length:', dataUrl.length)
    croppedImg.src = dataUrl
  } catch (e) {
    console.error('[CROP DEBUG] Error creating cropped image:', e)
  }
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
  showVectorized: showVectorizedProp = true,
  onShowVectorizedChange
}: DesignEditorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [isSelected, setIsSelected] = useState(false)
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  const [isVectorizing, setIsVectorizing] = useState(false)
  // Use controlled state if callback provided, otherwise internal state
  const [showVectorizedInternal, setShowVectorizedInternal] = useState(true)
  const showVectorized = onShowVectorizedChange ? showVectorizedProp : showVectorizedInternal
  const setShowVectorized = onShowVectorizedChange || setShowVectorizedInternal
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [contentCrop, setContentCrop] = useState<ContentBounds | null>(null)
  const imageRef = useRef<Konva.Image>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const stageRef = useRef<Konva.Stage>(null)
  
  // Refs for tracking image loading state
  const isInitialLoadRef = useRef(true)
  const lastImageDimensionsRef = useRef<{ width: number; height: number } | null>(null)
  const hasDetectedBoundsRef = useRef(false)
  const croppedVectorizedImageRef = useRef<HTMLImageElement | null>(null)
  const originalImageRef = useRef<HTMLImageElement | null>(null)
  const storedContentCropRef = useRef<ContentBounds | null>(null)
  // Store separate transforms for original and vectorized views
  const vectorizedTransformRef = useRef<{ x: number; y: number; scale: number; rotation: number } | null>(null)
  const originalTransformRef = useRef<{ x: number; y: number; scale: number; rotation: number } | null>(null)
  const prevShowVectorizedRef = useRef<boolean | null>(null)
  const isTogglingViewRef = useRef(false)
  // Track previous artwork to detect actual artwork changes vs print location switches
  const prevArtworkIdRef = useRef<string | null>(null)
  
  // Note: When using cropped images, image.width/height are already the effective dimensions
  
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
    console.log('[CROP DEBUG] ===', printLocation, '- Initial load effect running ===')
    console.log('[CROP DEBUG]', printLocation, '- artworkFile:', artworkFile?.name)
    console.log('[CROP DEBUG]', printLocation, '- artworkFileRecord?.id:', artworkFileRecord?.id)
    console.log('[CROP DEBUG]', printLocation, '- artworkFileRecord?.vectorization_status:', artworkFileRecord?.vectorization_status)
    
    // Check if we have either a File or a persisted record with URL
    const hasPersistedRecord = !artworkFile && artworkFileRecord && 
      (artworkFileRecord.file_url || artworkFileRecord.vectorized_file_url)
    
    if (!artworkFile && !hasPersistedRecord) {
      console.log('[CROP DEBUG]', printLocation, '- No artwork file or persisted record, returning early')
      setImage(null)
      setOriginalImageUrl(null)
      setContentCrop(null)
      lastImageDimensionsRef.current = null
      isInitialLoadRef.current = true
      hasDetectedBoundsRef.current = false
      return
    }

    // Generate an ID for the current artwork to detect actual changes
    const artworkId = artworkFile?.name || artworkFileRecord?.id || artworkFileRecord?.file_url || null
    const artworkChanged = artworkId !== prevArtworkIdRef.current
    
    if (artworkChanged) {
      console.log('[CROP DEBUG]', printLocation, '- Artwork changed, resetting refs')
      // Only reset these when artwork actually changes, not on print location switch
      isInitialLoadRef.current = true
      hasDetectedBoundsRef.current = false
      croppedVectorizedImageRef.current = null
      originalImageRef.current = null
      storedContentCropRef.current = null
      vectorizedTransformRef.current = null
      originalTransformRef.current = null
      setContentCrop(null)
      prevArtworkIdRef.current = artworkId
    } else {
      console.log('[CROP DEBUG]', printLocation, '- Same artwork, preserving refs')
      isInitialLoadRef.current = true
    }

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

    // Check if we're loading a vectorized image
    console.log('[CROP DEBUG]', printLocation, '- Checking isLoadingVectorized conditions:')
    console.log('[CROP DEBUG]', printLocation, '-   vectorization_status:', artworkFileRecord?.vectorization_status)
    console.log('[CROP DEBUG]', printLocation, '-   vectorized_file_url exists:', !!artworkFileRecord?.vectorized_file_url)
    console.log('[CROP DEBUG]', printLocation, '-   urlToLoad:', urlToLoad?.substring(0, 100))
    console.log('[CROP DEBUG]', printLocation, '-   URLs match:', urlToLoad === artworkFileRecord?.vectorized_file_url)
    
    const isLoadingVectorized = artworkFileRecord?.vectorization_status === 'completed' && 
      artworkFileRecord?.vectorized_file_url && 
      (urlToLoad === artworkFileRecord.vectorized_file_url)

    const img = new window.Image()
    img.crossOrigin = 'anonymous' // Needed for data URLs and external URLs
    img.onload = () => {
      console.log('[CROP DEBUG]', printLocation, '- Image loaded, size:', img.width, 'x', img.height)
      console.log('[CROP DEBUG]', printLocation, '- isLoadingVectorized:', isLoadingVectorized)
      console.log('[CROP DEBUG]', printLocation, '- hasDetectedBoundsRef.current:', hasDetectedBoundsRef.current)
      
      // Store dimensions for this image
      lastImageDimensionsRef.current = { width: img.width, height: img.height }
      
      // Detect content bounds for vectorized images and create cropped version
      let finalImage: HTMLImageElement = img
      let detectedCrop: ContentBounds | null = null
      
      if (isLoadingVectorized && !hasDetectedBoundsRef.current) {
        console.log('[CROP DEBUG]', printLocation, '- Calling detectContentBounds...')
        const bounds = detectContentBounds(img)
        console.log('[CROP DEBUG]', printLocation, '- bounds result:', bounds)
        if (bounds) {
          // Only apply crop if it significantly reduces the size (at least 10% smaller)
          const originalArea = img.width * img.height
          const croppedArea = bounds.width * bounds.height
          console.log('[CROP DEBUG]', printLocation, '- originalArea:', originalArea, 'croppedArea:', croppedArea, 'ratio:', croppedArea / originalArea)
          if (croppedArea < originalArea * 0.9) {
            console.log('[CROP DEBUG]', printLocation, '- Cropping! Creating cropped image...')
            detectedCrop = bounds
            hasDetectedBoundsRef.current = true
            
            // Create a pre-cropped image using callback pattern
            // Pass the URL so SVGs can be rendered at full resolution
            // Also preload the original image for toggling
            const origUrl = blobUrl || artworkFileRecord?.file_url
            if (origUrl) {
              const origImg = new window.Image()
              origImg.crossOrigin = 'anonymous'
              origImg.onload = () => {
                console.log('[CROP DEBUG]', printLocation, '- Preloaded original image:', origImg.width, 'x', origImg.height)
                originalImageRef.current = origImg
              }
              origImg.src = origUrl
            }
            
            createCroppedImage(img, bounds, (croppedImg) => {
              console.log('[CROP DEBUG]', printLocation, '- Cropped image created, size:', croppedImg.width, 'x', croppedImg.height)
              console.log('[CROP DEBUG]', printLocation, '- Calling setImage with cropped image...')
              // Store cropped for toggling
              croppedVectorizedImageRef.current = croppedImg
              storedContentCropRef.current = detectedCrop
              setContentCrop(detectedCrop)
              setImage(croppedImg)
              console.log('[CROP DEBUG]', printLocation, '- setImage called successfully')
              
              // Use ACTUAL cropped image dimensions for transform calculation
              // (not bounds, which are in small-space coordinates)
              const effectiveW = croppedImg.width
              const effectiveH = croppedImg.height
              console.log('[CROP DEBUG]', printLocation, '- Using effectiveW:', effectiveW, 'effectiveH:', effectiveH)
              
              if (!transform) {
                // No transform yet - calculate initial position
                const scale = Math.min(
                  printArea.width / effectiveW,
                  printArea.height / effectiveH,
                  1
                ) * 0.8
                
                const scaledWidth = effectiveW * scale
                const scaledHeight = effectiveH * scale
                
                const newTransform = {
                  x: printArea.x + (printArea.width - scaledWidth) / 2,
                  y: printArea.y + (printArea.height - scaledHeight) / 2,
                  scale,
                  rotation: 0,
                }
                console.log('[CROP DEBUG]', printLocation, '- New transform scale:', scale)
                // Store initial vectorized transform
                vectorizedTransformRef.current = newTransform
                prevShowVectorizedRef.current = true
                onTransformChange(newTransform)
                saveToHistory(newTransform)
              } else {
                // Transform exists - check if we need to recalculate for NEW cropping
                // or if we're just switching back to a location we already processed
                const wasAlreadyCropped = croppedVectorizedImageRef.current !== null
                
                if (!wasAlreadyCropped) {
                  // First time cropping - recenter with new dimensions
                  const prevWidth = img.width * transform.scale
                  const prevHeight = img.height * transform.scale
                  const centerX = transform.x + prevWidth / 2
                  const centerY = transform.y + prevHeight / 2
                  
                  // Recalculate scale to maintain similar visual size
                  const newScale = Math.min(
                    printArea.width / effectiveW,
                    printArea.height / effectiveH,
                    1
                  ) * 0.8
                  
                  const newWidth = effectiveW * newScale
                  const newHeight = effectiveH * newScale
                  
                  const newTransform = {
                    x: centerX - newWidth / 2,
                    y: centerY - newHeight / 2,
                    scale: newScale,
                    rotation: transform.rotation,
                  }
                  console.log('[CROP DEBUG]', printLocation, '- New transform scale:', newScale)
                  // Store initial vectorized transform
                  vectorizedTransformRef.current = newTransform
                  prevShowVectorizedRef.current = true
                  onTransformChange(newTransform)
                } else {
                  // Already cropped before - just restore the stored transform and image
                  console.log('[CROP DEBUG]', printLocation, '- Already cropped, preserving existing transform')
                  vectorizedTransformRef.current = { ...transform }
                  prevShowVectorizedRef.current = true
                }
              }
              
              requestAnimationFrame(() => {
                isInitialLoadRef.current = false
              })
            }, urlToLoad)
            return // Exit early, cropped image callback will handle the rest
          }
        }
      }
      
      // No cropping needed or cropping failed - use original image
      console.log('[CROP DEBUG]', printLocation, '- Setting ORIGINAL image (no cropping):', finalImage.width, 'x', finalImage.height)
      // Store original for toggling
      originalImageRef.current = img
      setContentCrop(null)
      setImage(finalImage)
      
      // Use image dimensions for transform calculation
      const effectiveW = img.width
      const effectiveH = img.height
      
      // Set default transform if not already set (first time upload)
      if (!transform) {
        const scale = Math.min(
          printArea.width / effectiveW,
          printArea.height / effectiveH,
          1
        ) * 0.8 // Start at 80% of max size
        
        const scaledWidth = effectiveW * scale
        const scaledHeight = effectiveH * scale
        
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
  }, [artworkFile, artworkFileRecord, printLocation])

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
    
    // Calculate new scale based on image dimensions
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

  // Track which view we're syncing transforms for (using ref to avoid stale closure issues)
  const currentViewIsVectorizedRef = useRef(false)
  
  // Update the current view ref when view changes
  useEffect(() => {
    const isVectorized = showVectorized && artworkFileRecord?.vectorization_status === 'completed'
    currentViewIsVectorizedRef.current = isVectorized
  }, [showVectorized, artworkFileRecord?.vectorization_status])
  
  // Sync transform changes to the appropriate ref (so toggling restores correct size)
  // Only depends on transform - uses ref to determine which view we're on
  useEffect(() => {
    if (!transform || isInitialLoadRef.current) return
    
    // Skip during toggle transitions - the toggle effect handles saving/restoring
    if (isTogglingViewRef.current) return
    
    // Use ref to avoid running when showVectorized changes (which would save to wrong ref)
    if (currentViewIsVectorizedRef.current) {
      vectorizedTransformRef.current = { ...transform }
    } else {
      originalTransformRef.current = { ...transform }
    }
  }, [transform])

  // Update image when vectorized version becomes available
  useEffect(() => {
    if (artworkFileRecord?.vectorization_status === 'completed' && artworkFileRecord.vectorized_file_url) {
      setShowVectorized(true)
    }
  }, [artworkFileRecord?.vectorization_status, artworkFileRecord?.vectorized_file_url])

  // Toggle between original and vectorized using stored images
  // This effect ONLY handles switching between original/vectorized, NOT initial load
  useEffect(() => {
    // Skip if this is handled by the artworkFile effect (initial load)
    if (isInitialLoadRef.current) {
      console.log('[CROP DEBUG] Toggle effect: skipping (isInitialLoadRef is true)')
      return
    }

    // Only run if we already have an image (i.e., toggling views)
    if (!image || !transform) {
      console.log('[CROP DEBUG] Toggle effect: skipping (no image or transform)')
      return
    }

    const isVectorized = showVectorized && artworkFileRecord?.vectorization_status === 'completed'
    const wasVectorized = prevShowVectorizedRef.current
    
    // Only act if we're actually toggling (not initial render)
    if (wasVectorized === null || wasVectorized === isVectorized) {
      prevShowVectorizedRef.current = isVectorized
      return
    }
    
    console.log('[CROP DEBUG] Toggle effect: switching from', wasVectorized ? 'vectorized' : 'original', 'to', isVectorized ? 'vectorized' : 'original')
    
    // Set flag to prevent sync effect from running during toggle
    isTogglingViewRef.current = true
    
    // Save current transform before switching
    if (wasVectorized) {
      vectorizedTransformRef.current = { ...transform }
      console.log('[CROP DEBUG] Saved vectorized transform:', vectorizedTransformRef.current)
    } else {
      originalTransformRef.current = { ...transform }
      console.log('[CROP DEBUG] Saved original transform:', originalTransformRef.current)
    }
    
    prevShowVectorizedRef.current = isVectorized

    if (isVectorized) {
      // Show cropped vectorized image if available
      if (croppedVectorizedImageRef.current) {
        console.log('[CROP DEBUG] Toggle effect: restoring CROPPED vectorized image')
        // Restore the content crop for proper dimension display
        if (storedContentCropRef.current) {
          setContentCrop(storedContentCropRef.current)
        }
        setImage(croppedVectorizedImageRef.current)
        lastImageDimensionsRef.current = { 
          width: croppedVectorizedImageRef.current.width, 
          height: croppedVectorizedImageRef.current.height 
        }
        
        // Restore vectorized transform or calculate a new one
        if (vectorizedTransformRef.current) {
          console.log('[CROP DEBUG] Restoring vectorized transform:', vectorizedTransformRef.current)
          onTransformChange(vectorizedTransformRef.current)
          // Reset toggle flag after transform is applied
          requestAnimationFrame(() => {
            isTogglingViewRef.current = false
          })
        } else {
          isTogglingViewRef.current = false
        }
      }
    } else {
      // Show original uncropped image
      const showOriginal = (origImg: HTMLImageElement) => {
        setContentCrop(null)
        setImage(origImg)
        lastImageDimensionsRef.current = { width: origImg.width, height: origImg.height }
        
        // Restore original transform or calculate a new one that fits properly
        if (originalTransformRef.current) {
          console.log('[CROP DEBUG] Restoring original transform:', originalTransformRef.current)
          onTransformChange(originalTransformRef.current)
        } else {
          // Calculate a proper transform for the original image
          const scale = Math.min(
            printArea.width / origImg.width,
            printArea.height / origImg.height,
            1
          ) * 0.8
          
          const scaledWidth = origImg.width * scale
          const scaledHeight = origImg.height * scale
          
          const newTransform = {
            x: printArea.x + (printArea.width - scaledWidth) / 2,
            y: printArea.y + (printArea.height - scaledHeight) / 2,
            scale,
            rotation: transform.rotation,
          }
          console.log('[CROP DEBUG] Calculated new original transform:', newTransform)
          originalTransformRef.current = newTransform
          onTransformChange(newTransform)
        }
        // Reset toggle flag after transform is applied
        requestAnimationFrame(() => {
          isTogglingViewRef.current = false
        })
      }
      
      if (originalImageRef.current) {
        console.log('[CROP DEBUG] Toggle effect: restoring ORIGINAL image')
        showOriginal(originalImageRef.current)
      } else if (originalImageUrl) {
        // Load original image if not cached
        console.log('[CROP DEBUG] Toggle effect: loading original from URL')
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          originalImageRef.current = img
          showOriginal(img)
        }
        img.src = originalImageUrl
      }
    }
  }, [showVectorized, artworkFileRecord?.vectorization_status, image, originalImageUrl, transform, onTransformChange, printArea])

  if (!image || !transform) {
    return (
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
    )
  }

  const dims = getCurrentDimensions()
  const isOversize = dims ? (dims.width > maxDimensions.width || dims.height > maxDimensions.height) : false

  return (
    <div className="space-y-4">
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg">
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

        {/* Dimension display */}
        <AnimatePresence>
          {dims && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`
                absolute bottom-4 left-4 z-10 px-4 py-3 rounded-lg text-sm font-medium shadow-lg backdrop-blur-md
                ${isOversize 
                  ? 'bg-error-100/90 border-2 border-error-300 text-error-900' 
                  : 'bg-white/90 border-2 border-gray-200 text-gray-900'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {isOversize && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                <div>
                  <div className="font-semibold">Design Size:</div>
                  <div className="text-lg">{dims.width.toFixed(1)}" × {dims.height.toFixed(1)}"</div>
                  <div className="text-xs opacity-75 mt-0.5">Max: {maxDimensions.width}" × {maxDimensions.height}"</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard shortcuts hint */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-4 right-4 px-3 py-2 bg-gray-900/80 backdrop-blur-md text-white text-xs rounded-lg shadow-lg"
          >
            <div className="font-semibold mb-1">Keyboard Shortcuts</div>
            <div className="space-y-0.5 opacity-90">
              <div>Arrow keys: Nudge (+ Shift for 10px)</div>
              <div>⌘Z: Undo • ⌘⇧Z: Redo</div>
            </div>
          </motion.div>
        )}
      </div>

      {/* File Type Badge */}
      {artworkFileRecord && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-2 flex-wrap"
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
              inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold cursor-help transition-all
              ${artworkFileRecord.is_vector
                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                : artworkFileRecord.vectorization_status === 'completed'
                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                : artworkFileRecord.vectorization_status === 'processing'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                : 'bg-amber-100 text-amber-700 border-2 border-amber-300 animate-pulse'
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
          
          
          {/* Color count warning */}
          {detectedColors > maxInkColors && (
            <TooltipHelp content={`Your design uses ${detectedColors} colors, which exceeds the recommended ${maxInkColors} color maximum. Each additional color may increase printing costs.`}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border-2 border-amber-300 cursor-help">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {detectedColors} colors (max: {maxInkColors})
              </div>
            </TooltipHelp>
          )}
        </motion.div>
      )}

      {/* Vectorize Button - Prominent CTA */}
      {artworkFileRecord && !artworkFileRecord.is_vector && artworkFileRecord.vectorization_status !== 'completed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4"
        >
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-300 rounded-bento-lg p-6 shadow-bento">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-black text-charcoal-700">Convert to Vector Format</h3>
                  <TooltipHelp 
                    content="Screen printing requires vector files for the best results. Vectors are resolution-independent and produce crisp, clean prints at any size without pixelation."
                    side="right"
                  >
                    <svg className="w-4 h-4 text-primary-600 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </TooltipHelp>
                </div>
                <p className="text-sm text-charcoal-600 font-semibold mb-4">
                  Your PNG file will be automatically converted to vector format (SVG). This process typically takes 5-15 seconds and ensures crisp, clean prints at any size.
                </p>
                <button
                  onClick={handleVectorize}
                  disabled={isVectorizing}
                  className={`
                    px-6 py-3 rounded-bento font-black text-base flex items-center gap-2 transition-all
                    ${isVectorizing
                      ? 'bg-primary-300 text-primary-700 cursor-wait'
                      : 'bg-primary-500 text-white hover:bg-primary-600 shadow-soft hover:shadow-bento'
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
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Toolbar */}
      <div className="flex justify-center">
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
      </div>

      {/* Color Switcher - Only show when multiple colors are selected */}
      {selectedColors.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-charcoal-700 uppercase tracking-wide">Preview Color</h4>
              <span className="text-xs text-charcoal-500 font-semibold">
                {selectedColors.length} colors selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedColors.map((color) => {
                const isActive = color === activeColor
                const colorImageUrl = garment?.color_images?.[color]
                
                return (
                  <motion.button
                    key={color}
                    onClick={() => onColorChange(color)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all
                      ${isActive
                        ? 'bg-primary-500 text-white shadow-bento ring-2 ring-primary-200'
                        : 'bg-surface-100 text-charcoal-700 hover:bg-surface-200 border-2 border-surface-300'
                      }
                    `}
                  >
                    {colorImageUrl && (
                      <div className="w-6 h-6 rounded-md overflow-hidden border border-white/20 flex-shrink-0">
                        <img
                          src={colorImageUrl}
                          alt={color}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <span>{color}</span>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-1"
                      >
                        ✓
                      </motion.span>
                    )}
                  </motion.button>
                )
              })}
            </div>
            <p className="text-xs text-charcoal-500 mt-3 font-semibold">
              Switch between colors to preview your design on each garment color
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
