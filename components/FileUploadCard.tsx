'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PrintLocation } from '@/types'
import QualityIndicator from './QualityIndicator'

interface FileUploadCardProps {
  location: PrintLocation
  label: string
  colors: number
  file: File | null
  onFileSelect: (file: File | null) => void
  onFileRemove: () => void
}

export default function FileUploadCard({
  location,
  label,
  colors,
  file,
  onFileSelect,
  onFileRemove
}: FileUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [showFullPreview, setShowFullPreview] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }

    // Generate preview for image files
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isImage = ['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(fileExtension || '')

    if (isImage) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      // For non-image files, show file type icon
      setPreview(null)
    }
  }, [file])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      onFileSelect(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      onFileSelect(selectedFile)
    }
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Remove this artwork?')) {
      onFileRemove()
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleReplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    inputRef.current?.click()
  }

  const fileExtension = file?.name.split('.').pop()?.toUpperCase()
  const fileSize = file ? (file.size / 1024 / 1024).toFixed(2) : null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
            <p className="text-sm text-gray-600">
              {colors} color{colors > 1 ? 's' : ''}
            </p>
          </div>
          {file && <QualityIndicator file={file} />}
        </div>

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="uploaded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative rounded-lg border-2 border-success-200 bg-success-50/50 p-4 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <div className="flex gap-4">
                {/* Preview Thumbnail */}
                <div 
                  className="flex-shrink-0 w-20 h-20 rounded-md bg-white border-2 border-success-200 overflow-hidden cursor-pointer hover:border-success-400 transition-colors"
                  onClick={() => preview && setShowFullPreview(true)}
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        <span className="font-medium">{fileExtension}</span>
                        <span>•</span>
                        <span>{fileSize} MB</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleReplaceClick}
                      className="text-xs font-medium text-primary-700 hover:text-primary-800 px-3 py-1.5 rounded-md hover:bg-primary-100 transition-colors"
                    >
                      Replace
                    </button>
                    {preview && (
                      <button
                        onClick={() => setShowFullPreview(true)}
                        className="text-xs font-medium text-gray-700 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        View Full Size
                      </button>
                    )}
                    <button
                      onClick={handleRemoveClick}
                      className="text-xs font-medium text-error-700 hover:text-error-800 px-3 py-1.5 rounded-md hover:bg-error-100 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.ai,.eps,.svg"
                onChange={handleFileChange}
                className="hidden"
              />
            </motion.div>
          ) : (
            <motion.label
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`
                block relative rounded-lg border-2 border-dashed p-8 text-center cursor-pointer
                transition-all duration-200 overflow-hidden
                ${isDragging 
                  ? 'border-primary-500 bg-primary-50 scale-[1.02]' 
                  : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50/30'
                }
              `}
            >
              {/* Background pattern */}
              <div className="absolute inset-0 pattern-dots opacity-50" />
              
              <div className="relative z-10">
                <motion.div
                  animate={{ y: isDragging ? -5 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg 
                    className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragging ? 'text-primary-500' : 'text-gray-400'}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                    />
                  </svg>
                </motion.div>

                <p className="text-gray-700 font-medium mb-1">
                  {isDragging ? 'Drop file here' : 'Drop file here or click to browse'}
                </p>
                <p className="text-sm text-gray-500">
                  PNG, JPG, PDF, AI, EPS, SVG (max 50MB)
                </p>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.ai,.eps,.svg"
                onChange={handleFileChange}
                className="hidden"
              />
            </motion.label>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Full Preview Modal */}
      <AnimatePresence>
        {showFullPreview && preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowFullPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowFullPreview(false)}
                className="absolute top-2 right-2 z-10 p-2 bg-gray-900/80 hover:bg-gray-900 text-white rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={preview}
                alt="Full preview"
                className="max-w-full max-h-[calc(90vh-2rem)] object-contain rounded-md"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

