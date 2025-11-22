'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface QualityIndicatorProps {
  file: File
  className?: string
}

type QualityLevel = 'excellent' | 'good' | 'poor'

export default function QualityIndicator({ file, className = '' }: QualityIndicatorProps) {
  const [quality, setQuality] = React.useState<QualityLevel | null>(null)
  const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(null)

  React.useEffect(() => {
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
      
      // Assume target print size is around 12"x14" at 300 DPI
      // That's 3600x4200 pixels
      const minGoodDimension = 2400 // 8" at 300 DPI
      const minExcellentDimension = 3600 // 12" at 300 DPI
      
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
  }, [file])

  if (!quality) return null

  const config = {
    excellent: {
      color: 'success',
      label: 'Excellent',
      icon: '✓',
      bgColor: 'bg-success-100',
      textColor: 'text-success-800',
      borderColor: 'border-success-300',
      description: 'Perfect quality for printing'
    },
    good: {
      color: 'primary',
      label: 'Good',
      icon: '✓',
      bgColor: 'bg-primary-100',
      textColor: 'text-primary-800',
      borderColor: 'border-primary-300',
      description: 'Good quality, suitable for printing'
    },
    poor: {
      color: 'warning',
      label: 'Low Quality',
      icon: '!',
      bgColor: 'bg-warning-100',
      textColor: 'text-warning-800',
      borderColor: 'border-warning-300',
      description: 'May appear pixelated when printed'
    }
  }

  const current = config[quality]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${current.bgColor} ${current.textColor} border ${current.borderColor} ${className}`}
    >
      <span className="font-bold">{current.icon}</span>
      <span>{current.label}</span>
      {dimensions && (
        <span className="opacity-75">• {dimensions.width}×{dimensions.height}px</span>
      )}
    </motion.div>
  )
}

