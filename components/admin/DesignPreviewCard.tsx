'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage } from 'react-konva'
import { PrintLocation, ArtworkFile, Garment, ArtworkTransform } from '@/types'
import useImage from 'use-image'
import { motion } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'

interface DesignPreviewCardProps {
  artworkFiles: ArtworkFile[]
  garment: Garment | null
  orderColors?: string[] // For multi-color orders
  // Multi-garment support
  orderGarments?: Record<string, Garment>
  selectedGarments?: Record<string, { selectedColors: string[]; colorSizeQuantities: Record<string, any> }>
}

// Canvas dimensions (match DesignEditor)
const CANVAS_WIDTH = 500
const CANVAS_HEIGHT = 550
const ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT

// Shirt positioning
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

// Print area dimensions in pixels
const PRINT_AREAS: Record<PrintLocation, { width: number; height: number; x: number; y: number }> = {
  front: { width: 165, height: 255, x: 167.5, y: 135 },
  back: { width: 165, height: 255, x: 167.5, y: 130 },
  left_chest: { width: 60, height: 60, x: 290, y: 165 },
  right_chest: { width: 60, height: 60, x: 150, y: 165 },
  full_back: { width: 195, height: 285, x: 152.5, y: 125 },
}

// Get shirt image URL
function getShirtImageUrl(location: PrintLocation, garment: Garment | null, color: string): string | null {
  if (garment && color) {
    // For back locations, try back image first, then front image as fallback
    if (location === 'back' || location === 'full_back') {
      if (garment.color_back_images?.[color]) {
        return garment.color_back_images[color]
      }
      if (garment.color_images?.[color]) {
        return garment.color_images[color]
      }
    }
    // For front locations, use front image
    else if (garment.color_images?.[color]) {
      return garment.color_images[color]
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

// Calculate dimensions in inches from transform
function calculateDimensions(
  imageWidth: number,
  imageHeight: number,
  transform: ArtworkTransform,
  location: PrintLocation
): { width: number; height: number } {
  const printArea = PRINT_AREAS[location]
  const maxDimensions = MAX_PRINT_DIMENSIONS[location]
  
  const widthPx = imageWidth * transform.scale
  const heightPx = imageHeight * transform.scale
  
  const pixelsPerInchX = printArea.width / maxDimensions.width
  const pixelsPerInchY = printArea.height / maxDimensions.height
  
  return {
    width: widthPx / pixelsPerInchX,
    height: heightPx / pixelsPerInchY,
  }
}

// Determine position descriptor
function getPositionDescriptor(transform: ArtworkTransform, location: PrintLocation): string {
  const printArea = PRINT_AREAS[location]
  const centerX = printArea.x + printArea.width / 2
  const centerY = printArea.y + printArea.height / 2
  
  const tolerance = 10 // pixels tolerance for "centered"
  
  const isHCenter = Math.abs(transform.x - centerX) < tolerance
  const isVCenter = Math.abs(transform.y - centerY) < tolerance
  
  if (isHCenter && isVCenter) return 'Centered'
  
  let position = ''
  
  // Vertical position
  if (transform.y < centerY - tolerance) {
    position = 'Top'
  } else if (transform.y > centerY + tolerance) {
    position = 'Bottom'
  }
  
  // Horizontal position
  if (transform.x < centerX - tolerance) {
    position = position ? `${position}-Left` : 'Left'
  } else if (transform.x > centerX + tolerance) {
    position = position ? `${position}-Right` : 'Right'
  }
  
  return position || 'Centered'
}

interface PreviewCanvasProps {
  artworkFile: ArtworkFile
  garment: Garment | null
  activeColor: string
}

function PreviewCanvas({ artworkFile, garment, activeColor }: PreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(CANVAS_WIDTH)
  
  // Track container width for responsive scaling
  useEffect(() => {
    if (!containerRef.current) return
    
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    
    // Initial measurement
    updateWidth()
    
    // Use ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(containerRef.current)
    
    return () => resizeObserver.disconnect()
  }, [])
  
  const shirtImageUrl = getShirtImageUrl(artworkFile.location, garment, activeColor)
  const [shirtImage] = useImage(shirtImageUrl || '', 'anonymous')
  const [artworkImage] = useImage(artworkFile.file_url, 'anonymous')
  
  const transform = artworkFile.transform
  
  // Calculate display dimensions maintaining aspect ratio
  const displayWidth = containerWidth
  const displayHeight = displayWidth / ASPECT_RATIO
  const scale = displayWidth / CANVAS_WIDTH
  
  if (!transform || !artworkImage) {
    return (
      <div 
        ref={containerRef}
        className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg w-full"
        style={{ 
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        }}
      >
        <Stage 
          width={displayWidth} 
          height={displayHeight}
          scaleX={scale}
          scaleY={scale}
        >
          <Layer>
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
          </Layer>
        </Stage>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 font-semibold">No artwork data</p>
        </div>
      </div>
    )
  }
  
  const printArea = PRINT_AREAS[artworkFile.location]
  const dimensions = calculateDimensions(artworkImage.width, artworkImage.height, transform, artworkFile.location)
  const position = getPositionDescriptor(transform, artworkFile.location)
  const maxDimensions = MAX_PRINT_DIMENSIONS[artworkFile.location]
  const isOversize = dimensions.width > maxDimensions.width || dimensions.height > maxDimensions.height
  
  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg w-full"
        style={{ 
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        }}
      >
        <Stage 
          width={displayWidth} 
          height={displayHeight}
          scaleX={scale}
          scaleY={scale}
        >
          <Layer>
            {/* Shirt background */}
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
            
            {/* Print area guide */}
            <KonvaImage
              image={(() => {
                const rect = document.createElement('canvas')
                rect.width = printArea.width
                rect.height = printArea.height
                const ctx = rect.getContext('2d')
                if (ctx) {
                  ctx.strokeStyle = '#3b82f6'
                  ctx.lineWidth = 2
                  ctx.setLineDash([5, 5])
                  ctx.strokeRect(0, 0, printArea.width, printArea.height)
                }
                return rect
              })()}
              x={printArea.x}
              y={printArea.y}
              listening={false}
              opacity={0.3}
            />
            
            {/* Artwork image */}
            <KonvaImage
              image={artworkImage}
              x={transform.x}
              y={transform.y}
              width={artworkImage.width * transform.scale}
              height={artworkImage.height * transform.scale}
              rotation={transform.rotation}
              listening={false}
            />
          </Layer>
        </Stage>
        
        {/* Dimension display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            absolute bottom-4 left-4 z-10 px-4 py-3 rounded-lg text-sm font-medium shadow-lg backdrop-blur-md
            ${isOversize 
              ? 'bg-red-100/90 border-2 border-red-300 text-red-900' 
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
              <div className="text-lg">{dimensions.width.toFixed(1)}" × {dimensions.height.toFixed(1)}"</div>
              <div className="text-xs opacity-75 mt-0.5">Max: {maxDimensions.width}" × {maxDimensions.height}"</div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Design Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Position</p>
            <p className="text-sm font-semibold text-gray-900">{position}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Rotation</p>
            <p className="text-sm font-semibold text-gray-900">
              {transform.rotation === 0 ? 'None' : `${transform.rotation.toFixed(1)}°`}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">File Name</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{artworkFile.file_name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">File Size</p>
            <p className="text-sm font-semibold text-gray-900">
              {(artworkFile.file_size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DesignPreviewCard({ artworkFiles, garment, orderColors, orderGarments, selectedGarments }: DesignPreviewCardProps) {
  const [activeLocation, setActiveLocation] = useState<PrintLocation>(artworkFiles[0]?.location || 'front')
  
  // Determine available garments for multi-garment orders
  const garmentIds = selectedGarments ? Object.keys(selectedGarments) : []
  const hasMultipleGarments = garmentIds.length > 1 && orderGarments && Object.keys(orderGarments).length > 1
  
  const [activeGarmentId, setActiveGarmentId] = useState<string>(garmentIds[0] || '')
  
  // Get colors for the active garment
  const getColorsForGarment = (garmentId: string) => {
    if (selectedGarments?.[garmentId]?.selectedColors) {
      return selectedGarments[garmentId].selectedColors
    }
    return orderColors || []
  }
  
  const currentGarment = hasMultipleGarments && activeGarmentId 
    ? orderGarments?.[activeGarmentId] || garment 
    : garment
  
  const currentColors = hasMultipleGarments && activeGarmentId 
    ? getColorsForGarment(activeGarmentId)
    : orderColors || []
  
  const [activeColor, setActiveColor] = useState<string>(currentColors[0] || garment?.available_colors[0] || '')
  
  // Update active color when garment changes
  React.useEffect(() => {
    const colors = hasMultipleGarments && activeGarmentId 
      ? getColorsForGarment(activeGarmentId)
      : orderColors || []
    if (colors.length > 0 && !colors.includes(activeColor)) {
      setActiveColor(colors[0])
    }
  }, [activeGarmentId, hasMultipleGarments])
  
  if (!artworkFiles || artworkFiles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
        <div className="flex items-center mb-6">
          <svg className="w-5 h-5 text-gray-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Design Preview</h2>
        </div>
        <p className="text-gray-500">No artwork files uploaded yet</p>
      </div>
    )
  }
  
  const currentArtwork = artworkFiles.find(f => f.location === activeLocation) || artworkFiles[0]
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-gray-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Design Preview</h2>
        </div>
        <span className="text-sm text-gray-500">As designed by customer</span>
      </div>
      
      {/* Location Tabs */}
      {artworkFiles.length > 1 && (
        <Tabs.Root value={activeLocation} onValueChange={(val) => setActiveLocation(val as PrintLocation)}>
          <Tabs.List className="flex flex-wrap gap-2 mb-6">
            {artworkFiles.map((file) => (
              <Tabs.Trigger
                key={file.location}
                value={file.location}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all
                  ${activeLocation === file.location
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {getLocationLabel(file.location)}
                {file.transform && (
                  <span className={activeLocation === file.location ? 'text-white' : 'text-green-600'}>
                    ✓
                  </span>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      )}
      
      {/* Garment Selector - Only show for multi-garment orders */}
      {hasMultipleGarments && orderGarments && (
        <div className="mb-6 bg-purple-50 rounded-lg border border-purple-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Preview Garment</h4>
            <span className="text-xs text-purple-500">
              {garmentIds.length} styles in order
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {garmentIds.map((garmentId) => {
              const gmt = orderGarments[garmentId]
              const isActive = garmentId === activeGarmentId
              
              return (
                <button
                  key={garmentId}
                  onClick={() => setActiveGarmentId(garmentId)}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all
                    ${isActive
                      ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-200'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300'
                    }
                  `}
                >
                  <span>{gmt?.name || garmentId}</span>
                  {isActive && <span>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Color Switcher - Only show for multi-color orders */}
      {currentColors && currentColors.length > 1 && (
        <div className="mb-6 bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Preview Color</h4>
            <span className="text-xs text-gray-500">
              {currentColors.length} colors in order
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentColors.map((color) => {
              const isActive = color === activeColor
              const colorImageUrl = currentGarment?.color_images?.[color]
              
              return (
                <button
                  key={color}
                  onClick={() => setActiveColor(color)}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300'
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
                  {isActive && <span>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Preview Canvas */}
      <PreviewCanvas
        artworkFile={currentArtwork}
        garment={currentGarment}
        activeColor={activeColor}
      />
    </div>
  )
}

