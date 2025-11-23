'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Text, Group } from 'react-konva'
import { PrintLocation, ArtworkTransform, Garment, ArtworkFile } from '@/types'
import Konva from 'konva'
import useImage from 'use-image'
import { motion, AnimatePresence } from 'framer-motion'
import DesignToolbar from './DesignToolbar'
import PrintAreaGuides from './PrintAreaGuides'

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
  detectedColors = 0
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
  useEffect(() => {
    if (!artworkFile) {
      setImage(null)
      setOriginalImageUrl(null)
      return
    }

    // Create a stable blob URL for the original file
    const blobUrl = URL.createObjectURL(artworkFile)
    setOriginalImageUrl(blobUrl)

    const img = new window.Image()
    img.onload = () => {
      setImage(img)
      
      // Set default transform if not already set
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
    }
    img.src = blobUrl
    
    // Cleanup blob URL on unmount
    return () => URL.revokeObjectURL(blobUrl)
  }, [artworkFile, printLocation])

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
  useEffect(() => {
    const imageUrl = displayImageUrl
    if (!imageUrl) return

    const img = new window.Image()
    img.onload = () => {
      // Only adjust scale if the image dimensions actually changed
      const oldImage = image
      const dimensionsChanged = oldImage && (oldImage.width !== img.width || oldImage.height !== img.height)
      
      setImage(img)
      
      // If dimensions changed and we have a transform, adjust scale to maintain visual size
      if (dimensionsChanged && transform && oldImage) {
        const scaleRatio = oldImage.width / img.width
        const newScale = transform.scale * scaleRatio
        
        // Update transform with new scale to maintain visual size
        onTransformChange({
          ...transform,
          scale: newScale
        })
      }
    }
    img.src = imageUrl
  }, [displayImageUrl])

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
          className="flex items-center justify-center gap-2 mb-2"
        >
          <div className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold
            ${artworkFileRecord.is_vector
              ? 'bg-success-100 text-success-700 border-2 border-success-300'
              : 'bg-warning-100 text-warning-700 border-2 border-warning-300'
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
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Raster - Needs Vectorization
              </>
            )}
          </div>
          
          {/* Toggle between original and vectorized */}
          {artworkFileRecord.vectorization_status === 'completed' && artworkFileRecord.vectorized_file_url && (
            <button
              onClick={() => setShowVectorized(!showVectorized)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-100 hover:bg-surface-200 text-charcoal-700 border-2 border-surface-300 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {showVectorized ? 'Show Original' : 'Show Vectorized'}
            </button>
          )}
          
          {/* Color count warning */}
          {detectedColors > maxInkColors && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-warning-100 text-warning-700 border-2 border-warning-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {detectedColors} colors (max: {maxInkColors})
            </div>
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
                <h3 className="text-lg font-black text-charcoal-700 mb-1">Convert to Vector Format</h3>
                <p className="text-sm text-charcoal-600 font-semibold mb-4">
                  Your PNG file needs to be converted to vector format (SVG) for screen printing. This ensures crisp, clean prints at any size.
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
