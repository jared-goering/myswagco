'use client'

import React from 'react'
import { motion } from 'framer-motion'
import TooltipHelp from './TooltipHelp'
import { ArtworkFile } from '@/types'

interface QualityIndicatorProps {
  file?: File | null
  artworkFileRecord?: ArtworkFile | null
  className?: string
}

type QualityLevel = 'excellent' | 'good' | 'poor' | 'vectorized'

export default function QualityIndicator({ file, artworkFileRecord, className = '' }: QualityIndicatorProps) {
  const [quality, setQuality] = React.useState<QualityLevel | null>(null)
  const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(null)

  // Check if file has been vectorized - this takes priority
  const isVectorized = artworkFileRecord?.vectorization_status === 'completed' || artworkFileRecord?.is_vector

  React.useEffect(() => {
    // If vectorized, always show excellent quality (vectors are resolution-independent)
    if (isVectorized) {
      setQuality('vectorized')
      
      // Try to get dimensions from the image URL (either from file or persisted record)
      const imageUrl = file 
        ? URL.createObjectURL(file)
        : artworkFileRecord?.vectorized_file_url || artworkFileRecord?.file_url
      
      if (imageUrl) {
        const img = new Image()
        const isObjectUrl = file && imageUrl.startsWith('blob:')
        img.onload = () => {
          setDimensions({ width: img.width, height: img.height })
          if (isObjectUrl) {
            URL.revokeObjectURL(imageUrl)
          }
        }
        img.onerror = () => {
          // If image fails to load (e.g., expired blob URL), just show quality without dimensions
          if (isObjectUrl) {
            URL.revokeObjectURL(imageUrl)
          }
        }
        img.src = imageUrl
      }
      return
    }

    // If no file and no URL available, we can't determine quality from file properties
    // Use persisted record info if available
    if (!file) {
      if (artworkFileRecord) {
        // Determine quality based on persisted file info
        const fileName = artworkFileRecord.file_name || ''
        const fileExtension = fileName.split('.').pop()?.toLowerCase()
        const isVector = ['svg', 'ai', 'eps'].includes(fileExtension || '')
        
        if (isVector) {
          setQuality('excellent')
        } else {
          // For persisted raster files without the original File object,
          // try to load the image to get dimensions
          const imageUrl = artworkFileRecord.file_url || artworkFileRecord.vectorized_file_url
          if (imageUrl) {
            const img = new Image()
            img.onload = () => {
              const width = img.width
              const height = img.height
              setDimensions({ width, height })
              
              const minGoodDimension = 1200
              const minExcellentDimension = 2000
              const smallerDimension = Math.min(width, height)
              
              if (smallerDimension >= minExcellentDimension) {
                setQuality('excellent')
              } else if (smallerDimension >= minGoodDimension) {
                setQuality('good')
              } else {
                setQuality('poor')
              }
            }
            img.onerror = () => {
              // Fallback: can't determine quality without image dimensions
              setQuality('good') // Assume good since they uploaded something
            }
            img.src = imageUrl
          } else {
            // No URL available, show a neutral state
            setQuality('good')
          }
        }
      }
      return
    }

    // Determine quality based on file type and size
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isVector = ['svg', 'ai', 'eps'].includes(fileExtension || '')
    
    if (isVector) {
      setQuality('excellent')
      return
    }

    // For raster images, check dimensions
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      const width = img.width
      const height = img.height
      setDimensions({ width, height })
      
      // Adjusted thresholds for screen printing (150-200 DPI is typical)
      // Good threshold: suitable for designs up to 6" at 200 DPI, or 8" at 150 DPI
      const minGoodDimension = 1200
      // Excellent threshold: suitable for designs up to 10" at 200 DPI, or 13" at 150 DPI
      const minExcellentDimension = 2000
      
      const smallerDimension = Math.min(width, height)
      
      if (smallerDimension >= minExcellentDimension) {
        setQuality('excellent')
      } else if (smallerDimension >= minGoodDimension) {
        setQuality('good')
      } else {
        setQuality('poor')
      }
      
      URL.revokeObjectURL(url)
    }
    
    img.src = url
  }, [file, isVectorized, artworkFileRecord])

  if (!quality) return null

  const config = {
    vectorized: {
      color: 'success',
      label: 'Vectorized',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-800',
      borderColor: 'border-emerald-300',
      tooltip: dimensions 
        ? `Vectorized! Original was ${dimensions.width}×${dimensions.height}px but has been converted to vector format. Vector graphics are resolution-independent and will print perfectly crisp at any size.`
        : 'This file has been vectorized and will print perfectly at any size!'
    },
    excellent: {
      color: 'success',
      label: 'Excellent Quality',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-800',
      borderColor: 'border-emerald-300',
      tooltip: dimensions 
        ? `Perfect! Your image is ${dimensions.width}×${dimensions.height}px, which is excellent for screen printing. Suitable for large designs (10"+ at 200 DPI). Will produce crisp, detailed prints.`
        : 'Vector files produce perfect quality at any size. Ideal for screen printing!'
    },
    good: {
      color: 'primary',
      label: 'Good Quality',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300',
      tooltip: dimensions
        ? `Good! Your image is ${dimensions.width}×${dimensions.height}px, which works well for screen printing. Suitable for designs up to 6-8" at good quality. Perfect for most t-shirt prints.`
        : 'Good quality for printing.'
    },
    poor: {
      color: 'warning',
      label: 'Low Quality',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-300',
      tooltip: dimensions
        ? `Your image is ${dimensions.width}×${dimensions.height}px. This is low resolution for screen printing and may appear pixelated. Vectorize this file to convert it to a scalable format that prints perfectly at any size.`
        : 'Low resolution may result in pixelated prints. Vectorize this file for best results.'
    }
  }

  const current = config[quality]

  return (
    <TooltipHelp content={current.tooltip} side="left">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border-2 cursor-help transition-all hover:scale-105 ${current.bgColor} ${current.textColor} ${current.borderColor} ${className}`}
      >
        {current.icon}
        <span>{current.label}</span>
        {dimensions && (
          <span className="opacity-70 font-semibold">• {dimensions.width}×{dimensions.height}</span>
        )}
      </motion.div>
    </TooltipHelp>
  )
}

