'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Text } from 'react-konva'
import { PrintLocation, ArtworkTransform } from '@/types'
import Konva from 'konva'
import useImage from 'use-image'

interface DesignEditorProps {
  artworkFile: File | null
  printLocation: PrintLocation
  transform: ArtworkTransform | null
  onTransformChange: (transform: ArtworkTransform) => void
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
// Shirt is ~22" wide × 30" long, print area is 11"×17" (half width, ~57% height)
// These represent the FULL printable area: Front/Back 11"x17", Chest 4"x4"
const PRINT_AREAS: Record<PrintLocation, { width: number; height: number; x: number; y: number }> = {
  front: { width: 165, height: 255, x: 167.5, y: 155 },
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

// Get shirt SVG based on print location
function getShirtSvgUrl(location: PrintLocation): string | null {
  if (location === 'front' || location === 'left_chest' || location === 'right_chest') {
    return '/shirt-front.svg'
  } else if (location === 'back' || location === 'full_back') {
    return '/shirt-back.svg'
  }
  return null
}

export default function DesignEditor({ 
  artworkFile, 
  printLocation, 
  transform, 
  onTransformChange 
}: DesignEditorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [isSelected, setIsSelected] = useState(false)
  const imageRef = useRef<Konva.Image>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  
  // Load shirt SVG
  const shirtSvgUrl = getShirtSvgUrl(printLocation)
  const [shirtImage] = useImage(shirtSvgUrl || '', 'anonymous')

  const printArea = PRINT_AREAS[printLocation]
  const maxDimensions = MAX_PRINT_DIMENSIONS[printLocation]
  const pixelsPerInch = getPixelsPerInch(printLocation)

  // Calculate current dimensions in inches
  function getCurrentDimensions(): { width: number; height: number } | null {
    if (!image || !transform) return null
    const widthPx = image.width * transform.scale
    const heightPx = image.height * transform.scale
    return {
      width: widthPx / pixelsPerInch.x,
      height: heightPx / pixelsPerInch.y,
    }
  }

  // Load image when file changes
  useEffect(() => {
    if (!artworkFile) {
      setImage(null)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
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
          
          onTransformChange({
            x: printArea.x + (printArea.width - scaledWidth) / 2,
            y: printArea.y + (printArea.height - scaledHeight) / 2,
            scale,
            rotation: 0,
          })
        }
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(artworkFile)
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
    if (!node || !image) return

    // Get the scale applied by the transformer
    const scaleX = node.scaleX()
    
    // Calculate new scale based on original image dimensions
    const currentWidth = image.width * transform.scale
    const newWidth = currentWidth * scaleX
    const newScale = newWidth / image.width

    // Reset the node scale back to 1 to prevent compounding
    node.scaleX(1)
    node.scaleY(1)

    onTransformChange({
      x: node.x(),
      y: node.y(),
      scale: newScale,
      rotation: node.rotation(),
    })
  }

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onTransformChange({
      x: e.target.x(),
      y: e.target.y(),
      scale: transform?.scale || 1,
      rotation: transform?.rotation || 0,
    })
  }

  if (!image || !transform) {
    return (
      <div className="relative bg-white rounded-lg border border-gray-300 overflow-hidden">
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
              />
            )}
            
            {/* Print area boundary */}
            <Rect
              x={printArea.x}
              y={printArea.y}
              width={printArea.width}
              height={printArea.height}
              stroke="#9ca3af"
              strokeWidth={1}
              dash={[5, 5]}
              listening={false}
            />
            
            {/* Print area label */}
            <Text
              x={printArea.x}
              y={printArea.y + printArea.height + 8}
              width={printArea.width}
              text="Print Area"
              fontSize={10}
              fill="#6b7280"
              align="center"
              listening={false}
            />
          </Layer>
        </Stage>
        
        {/* Upload message overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-8 bg-white/90 rounded-lg border border-gray-200">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 font-medium">Upload artwork to preview</p>
            <p className="text-gray-500 text-sm mt-2">Your design will appear here</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-white rounded-lg border border-gray-300 overflow-hidden shadow-sm">
      {/* Instructions */}
      <div className="absolute top-3 left-3 right-3 bg-blue-50 border border-blue-200 rounded px-3 py-2 text-xs text-blue-800 z-10 shadow-sm">
        <strong>Click</strong> to select • <strong>Drag</strong> to move • <strong>Corners</strong> to resize • <strong>Top handle</strong> to rotate
      </div>

      <Stage 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT}
        className="cursor-move bg-gray-50"
        onClick={(e) => {
          // Click on empty area deselects
          if (e.target === e.target.getStage()) {
            setIsSelected(false)
          }
        }}
      >
        <Layer>
          {/* Shirt SVG background - centered */}
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

          {/* Print area boundary */}
          <Rect
            x={printArea.x}
            y={printArea.y}
            width={printArea.width}
            height={printArea.height}
            stroke="#9ca3af"
            strokeWidth={1}
            dash={[5, 5]}
            listening={false}
          />

          {/* Print area label */}
          <Text
            x={printArea.x}
            y={printArea.y + printArea.height + 8}
            width={printArea.width}
            text="Print Area"
            fontSize={10}
            fill="#6b7280"
            align="center"
            listening={false}
          />

          {/* Artwork image */}
          <KonvaImage
            ref={imageRef}
            image={image}
            x={transform.x}
            y={transform.y}
            width={image.width * transform.scale}
            height={image.height * transform.scale}
            rotation={transform.rotation}
            draggable
            onClick={() => setIsSelected(true)}
            onTap={() => setIsSelected(true)}
            onDragEnd={handleDragEnd}
            onTransformEnd={handleTransformEnd}
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
            />
          )}
        </Layer>
      </Stage>

      {/* Dimension display */}
      {image && transform && (
        <div className="absolute bottom-3 left-3 z-10 bg-white border border-gray-300 px-3 py-2 rounded-lg text-xs font-medium shadow-md">
          {(() => {
            const dims = getCurrentDimensions()
            if (!dims) return null
            const isOversize = dims.width > maxDimensions.width || dims.height > maxDimensions.height
            return (
              <div className={isOversize ? 'text-red-600' : 'text-gray-700'}>
                <div className="font-semibold mb-0.5">Design Size:</div>
                <div>{dims.width.toFixed(1)}" × {dims.height.toFixed(1)}"</div>
                <div className="text-gray-500 mt-0.5">Max: {maxDimensions.width}" × {maxDimensions.height}"</div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Reset button */}
      <div className="absolute bottom-3 right-3 z-10">
        <button
          onClick={() => {
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
            setIsSelected(false)
          }}
          className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
        >
          Reset Position
        </button>
      </div>
    </div>
  )
}

