'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage } from 'react-konva'
import { PrintLocation, ArtworkTransform, Garment } from '@/types'
import useImage from 'use-image'

interface CampaignMockupRendererProps {
  garment: Garment | null
  activeColor: string
  artworkUrl: string | null
  transform: ArtworkTransform | null
  location: PrintLocation
}

// Canvas dimensions - MUST match DesignEditor.tsx exactly
const CANVAS_WIDTH = 500
const CANVAS_HEIGHT = 550
const ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT

// Shirt positioning (centered with padding)
const SHIRT_PADDING = 28
const SHIRT_WIDTH = CANVAS_WIDTH - (SHIRT_PADDING * 2)
const SHIRT_HEIGHT = CANVAS_HEIGHT - (SHIRT_PADDING * 2)

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

// Artwork image component with useImage hook
function ArtworkImage({ 
  url, 
  transform 
}: { 
  url: string
  transform: ArtworkTransform 
}) {
  const [image] = useImage(url, 'anonymous')
  
  if (!image) return null
  
  // Use loaded image dimensions directly
  // The caller should pass the cropped_file_url to ensure correct image is loaded
  return (
    <KonvaImage
      image={image}
      x={transform.x}
      y={transform.y}
      width={image.width * transform.scale}
      height={image.height * transform.scale}
      rotation={transform.rotation}
      listening={false}
    />
  )
}

export default function CampaignMockupRenderer({
  garment,
  activeColor,
  artworkUrl,
  transform,
  location,
}: CampaignMockupRendererProps) {
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
  
  // Load shirt image
  const shirtImageUrl = getShirtImageUrl(location, garment, activeColor)
  const [shirtImage] = useImage(shirtImageUrl || '', 'anonymous')
  
  // Calculate display dimensions maintaining aspect ratio
  const displayWidth = containerWidth
  const displayHeight = displayWidth / ASPECT_RATIO
  const scale = displayWidth / CANVAS_WIDTH
  
  return (
    <div 
      ref={containerRef}
      className="relative bg-gradient-to-br from-surface-100 to-surface-200 overflow-hidden w-full"
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
          {/* Shirt image background */}
          {shirtImage && (
            <KonvaImage
              image={shirtImage}
              x={SHIRT_PADDING}
              y={SHIRT_PADDING}
              width={SHIRT_WIDTH}
              height={SHIRT_HEIGHT}
              listening={false}
            />
          )}

          {/* Artwork overlay */}
          {artworkUrl && transform && (
            <ArtworkImage url={artworkUrl} transform={transform} />
          )}
        </Layer>
      </Stage>
    </div>
  )
}
