'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PrintLocation, ArtworkFile } from '@/types'
import QualityIndicator from './QualityIndicator'

interface FileUploadCardProps {
  location: PrintLocation
  label: string
  colors: number
  file: File | null
  artworkFileRecord?: ArtworkFile | null
  onFileSelect: (file: File | null) => void
  onFileRemove: () => void
}

export default function FileUploadCard({
  location,
  label,
  colors,
  file,
  artworkFileRecord,
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
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-charcoal-700 tracking-tight">{label}</h3>
              {artworkFileRecord && (
                <span className={`
                  inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                  ${artworkFileRecord.is_vector
                    ? 'bg-success-100 text-success-700 border border-success-300'
                    : artworkFileRecord.vectorization_status === 'completed'
                    ? 'bg-success-100 text-success-700 border border-success-300'
                    : 'bg-warning-100 text-warning-700 border border-warning-300'
                  }
                `}>
                  {artworkFileRecord.is_vector ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Vector
                    </>
                  ) : artworkFileRecord.vectorization_status === 'completed' ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Vectorized
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Raster
                    </>
                  )}
                </span>
              )}
            </div>
            <p className="text-sm text-charcoal-500 font-bold mt-1">
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
              className="relative rounded-bento-lg border-2 border-data-green/40 bg-data-green/10 p-6 shadow-bento hover:shadow-soft-lg transition-all duration-200"
            >
              <div className="flex gap-4">
                {/* Preview Thumbnail */}
                <div 
                  className="flex-shrink-0 w-24 h-24 rounded-bento bg-white border-2 border-data-green/40 overflow-hidden cursor-pointer hover:border-data-green transition-colors"
                  onClick={() => preview && setShowFullPreview(true)}
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-100">
                      <svg className="w-10 h-10 text-charcoal-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-charcoal-700 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-charcoal-500">
                        <span className="font-bold px-2 py-1 bg-white rounded-full">{fileExtension}</span>
                        <span className="font-bold">{fileSize} MB</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-7 h-7 text-data-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleReplaceClick}
                      className="text-xs font-black text-primary-700 hover:text-primary-800 px-4 py-2 rounded-xl hover:bg-white transition-colors"
                    >
                      Replace
                    </button>
                    {preview && (
                      <button
                        onClick={() => setShowFullPreview(true)}
                        className="text-xs font-black text-charcoal-700 hover:text-charcoal-800 px-4 py-2 rounded-xl hover:bg-white transition-colors"
                      >
                        View Full
                      </button>
                    )}
                    <button
                      onClick={handleRemoveClick}
                      className="text-xs font-black text-error-700 hover:text-error-800 px-4 py-2 rounded-xl hover:bg-error-100 transition-colors"
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
                block relative rounded-bento-lg border-2 border-dashed p-10 text-center cursor-pointer
                transition-all duration-200 overflow-hidden
                ${isDragging 
                  ? 'border-primary-500 bg-primary-100 scale-[1.02] shadow-bento' 
                  : 'border-surface-300 hover:border-primary-400 hover:bg-primary-50/30'
                }
              `}
            >
              {/* Background pattern */}
              <div className="absolute inset-0 pattern-dots opacity-30" />
              
              <div className="relative z-10">
                <motion.div
                  animate={{ y: isDragging ? -5 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg 
                    className={`w-14 h-14 mx-auto mb-4 transition-colors ${isDragging ? 'text-primary-500' : 'text-charcoal-400'}`}
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

                <p className="text-charcoal-700 font-black mb-2 text-lg">
                  {isDragging ? 'Drop file here' : 'Drop file here or click to browse'}
                </p>
                <p className="text-sm text-charcoal-500 font-semibold">
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
              className="relative max-w-4xl max-h-[90vh] bg-white rounded-bento-lg p-6 shadow-bento"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowFullPreview(false)}
                className="absolute top-4 right-4 z-10 p-2.5 bg-charcoal-700/90 hover:bg-charcoal-700 text-white rounded-bento transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={preview}
                alt="Full preview"
                className="max-w-full max-h-[calc(90vh-3rem)] object-contain rounded-bento"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

