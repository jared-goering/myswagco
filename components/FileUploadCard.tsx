'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PrintLocation, ArtworkFile } from '@/types'
import QualityIndicator from './QualityIndicator'
import TooltipHelp from './TooltipHelp'

interface FileUploadCardProps {
  location: PrintLocation
  label: string
  colors: number
  file: File | null
  artworkFileRecord?: ArtworkFile | null
  onFileSelect: (file: File | null) => void
  onFileRemove: () => void
  showVectorized?: boolean
  onToggleVectorized?: () => void
  onEditWithAI?: () => void
  onRemoveBackground?: () => void
  isRemovingBackground?: boolean
}

export default function FileUploadCard({
  location,
  label,
  colors,
  file,
  artworkFileRecord,
  onFileSelect,
  onFileRemove,
  showVectorized = true,
  onToggleVectorized,
  onEditWithAI,
  onRemoveBackground,
  isRemovingBackground = false
}: FileUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [originalPreview, setOriginalPreview] = useState<string | null>(null)
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [showEditDropdown, setShowEditDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const editDropdownRef = useRef<HTMLDivElement>(null)
  
  // Check if vectorization is available for this file
  const hasVectorized = artworkFileRecord?.vectorization_status === 'completed' && !!artworkFileRecord?.vectorized_file_url
  const canToggle = hasVectorized && !!onToggleVectorized

  // Determine if we have artwork (either a File or a persisted record)
  const hasArtwork = !!file || (!!artworkFileRecord && (!!artworkFileRecord.file_url || !!artworkFileRecord.vectorized_file_url))

  // Set up original preview URL
  React.useEffect(() => {
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const isImage = ['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(fileExtension || '')

      if (isImage) {
        const url = URL.createObjectURL(file)
        setOriginalPreview(url)
        return () => URL.revokeObjectURL(url)
      } else {
        setOriginalPreview(null)
      }
    } else if (artworkFileRecord?.file_url) {
      // Check if it's a valid URL (not an expired blob URL)
      // blob: URLs are valid during the current session, http/data: URLs persist across sessions
      const isValidUrl = artworkFileRecord.file_url.startsWith('http') || 
                         artworkFileRecord.file_url.startsWith('data:') ||
                         artworkFileRecord.file_url.startsWith('blob:')
      if (isValidUrl) {
        setOriginalPreview(artworkFileRecord.file_url)
      } else {
        // Fallback to vectorized if URL is invalid
        setOriginalPreview(artworkFileRecord.vectorized_file_url || null)
      }
    } else {
      setOriginalPreview(null)
    }
  }, [file, artworkFileRecord?.file_url, artworkFileRecord?.vectorized_file_url])

  // Check if we have access to the original file (not just vectorized)
  // blob: URLs work during current session, http/data: URLs work across sessions
  const hasOriginalAccess = !!file || 
    (artworkFileRecord?.file_url && 
     (artworkFileRecord.file_url.startsWith('http') || 
      artworkFileRecord.file_url.startsWith('data:') ||
      artworkFileRecord.file_url.startsWith('blob:')))

  // Update the displayed preview based on showVectorized toggle
  React.useEffect(() => {
    if (hasVectorized && showVectorized) {
      // Show vectorized version
      setPreview(artworkFileRecord?.vectorized_file_url || null)
    } else if (hasOriginalAccess) {
      // Show original version
      setPreview(originalPreview)
    } else {
      // Fallback to vectorized if original not available
      setPreview(artworkFileRecord?.vectorized_file_url || originalPreview)
    }
  }, [hasVectorized, showVectorized, artworkFileRecord?.vectorized_file_url, originalPreview, hasOriginalAccess])

  // Close edit dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editDropdownRef.current && !editDropdownRef.current.contains(event.target as Node)) {
        setShowEditDropdown(false)
      }
    }
    if (showEditDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEditDropdown])

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

  // Get file info from File object or persisted record
  const fileName = file?.name || artworkFileRecord?.file_name || 'Uploaded artwork'
  const fileExtension = fileName.split('.').pop()?.toUpperCase()
  const fileSize = file 
    ? (file.size / 1024 / 1024).toFixed(2) 
    : artworkFileRecord?.file_size 
      ? (artworkFileRecord.file_size / 1024 / 1024).toFixed(2)
      : null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group mb-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-charcoal-700 tracking-tight">{label}</h3>
              {artworkFileRecord && (
                <TooltipHelp
                  content={
                    artworkFileRecord.is_vector
                      ? "Perfect! Vector files are print-ready and produce crisp, scalable prints."
                      : artworkFileRecord.vectorization_status === 'completed'
                      ? "Great! This file has been vectorized and is ready for screen printing."
                      : "PNG/JPG files need vectorization for crisp prints. Use the 'Vectorize for Print' button in the preview."
                  }
                  side="top"
                >
                  <span className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-help
                    ${artworkFileRecord.is_vector
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : artworkFileRecord.vectorization_status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : artworkFileRecord.vectorization_status === 'processing'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-amber-100 text-amber-700 border border-amber-300'
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
                    ) : artworkFileRecord.vectorization_status === 'processing' ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing
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
                </TooltipHelp>
              )}
            </div>
            <p className="text-sm text-charcoal-500 font-semibold mt-1">
              {colors} color{colors > 1 ? 's' : ''}
            </p>
          </div>
          {hasArtwork && <QualityIndicator file={file} artworkFileRecord={artworkFileRecord} />}
        </div>

        <AnimatePresence mode="wait">
          {hasArtwork ? (
            <motion.div
              key="uploaded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative rounded-bento-lg border-2 border-emerald-300 bg-emerald-50 p-6 shadow-soft hover:shadow-bento transition-all duration-200"
            >
              <div className="flex gap-4">
                {/* Preview Thumbnail */}
                <TooltipHelp
                  content={hasVectorized 
                    ? 'Click to view and compare versions'
                    : 'Click to view full size'
                  }
                  side="top"
                >
                  <div 
                    className={`
                      relative flex-shrink-0 w-24 h-24 rounded-bento bg-white border-2 overflow-hidden cursor-pointer hover:scale-105 transition-all
                      ${hasVectorized 
                        ? 'border-emerald-300 hover:border-emerald-500 ring-2 ring-emerald-100' 
                        : 'border-emerald-300 hover:border-emerald-500'
                      }
                    `}
                    onClick={() => setShowFullPreview(true)}
                  >
                    {(preview || artworkFileRecord?.vectorized_file_url) ? (
                      <img
                        src={preview || artworkFileRecord?.vectorized_file_url || ''}
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
                    
                    
                    {/* Zoom icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all group/zoom">
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="opacity-0 group-hover/zoom:opacity-100 transition-opacity"
                      >
                        <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </motion.div>
                    </div>
                  </div>
                </TooltipHelp>

                {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-charcoal-700 truncate" title={fileName}>
                          {fileName}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-charcoal-500">
                          {fileExtension && <span className="font-semibold px-2 py-1 bg-white rounded-full border border-emerald-200">{fileExtension}</span>}
                          {fileSize && <span className="font-semibold">{fileSize} MB</span>}
                          {!file && artworkFileRecord && (
                            <span className="font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                              Restored
                            </span>
                          )}
                        </div>
                      </div>
                    <motion.div 
                      className="flex-shrink-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={handleReplaceClick}
                      className="text-xs font-bold text-primary-700 hover:text-primary-800 px-4 py-2 rounded-xl hover:bg-white transition-all hover:shadow-sm"
                    >
                      Replace
                    </button>
                    {(preview || artworkFileRecord?.vectorized_file_url) && (
                      <button
                        onClick={() => setShowFullPreview(true)}
                        className="text-xs font-bold text-charcoal-700 hover:text-charcoal-800 px-4 py-2 rounded-xl hover:bg-white transition-all hover:shadow-sm"
                      >
                        View Full
                      </button>
                    )}
                    {(onEditWithAI || onRemoveBackground) && (
                      <div className="relative" ref={editDropdownRef}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowEditDropdown(!showEditDropdown)
                          }}
                          disabled={isRemovingBackground}
                          className="text-xs font-bold text-teal-700 hover:text-teal-800 px-4 py-2 rounded-xl hover:bg-teal-100 transition-all hover:shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isRemovingBackground ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Removing...
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                        {showEditDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-surface-200 py-1 z-20 min-w-[160px]">
                            {onEditWithAI && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowEditDropdown(false)
                                  onEditWithAI()
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-charcoal-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Edit with AI
                              </button>
                            )}
                            {onRemoveBackground && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowEditDropdown(false)
                                  onRemoveBackground()
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-charcoal-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                </svg>
                                Remove Background
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={handleRemoveClick}
                      className="text-xs font-bold text-red-700 hover:text-red-800 px-4 py-2 rounded-xl hover:bg-red-100 transition-all hover:shadow-sm"
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
        {showFullPreview && (
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
              className="relative max-w-4xl max-h-[90vh] bg-white rounded-bento-lg shadow-bento overflow-hidden"
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
              
              {/* Tab header when vectorized version is available */}
              {hasVectorized && (
                <div className="flex border-b border-surface-200 bg-surface-50">
                  <button
                    onClick={() => {
                      if (showVectorized && hasOriginalAccess) {
                        onToggleVectorized?.()
                      }
                    }}
                    disabled={!hasOriginalAccess}
                    className={`flex-1 px-6 py-3 text-sm font-bold transition-all ${
                      !showVectorized 
                        ? 'text-charcoal-700 bg-white border-b-2 border-amber-500' 
                        : hasOriginalAccess 
                          ? 'text-charcoal-500 hover:text-charcoal-700 hover:bg-surface-100'
                          : 'text-charcoal-300 cursor-not-allowed'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      Original
                      {!hasOriginalAccess && (
                        <span className="text-[10px] text-charcoal-400">(not available)</span>
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (!showVectorized) {
                        onToggleVectorized?.()
                      }
                    }}
                    className={`flex-1 px-6 py-3 text-sm font-bold transition-all ${
                      showVectorized 
                        ? 'text-charcoal-700 bg-white border-b-2 border-emerald-500' 
                        : 'text-charcoal-500 hover:text-charcoal-700 hover:bg-surface-100'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Vectorized
                    </span>
                  </button>
                </div>
              )}
              
              <div className="p-6">
                {(preview || artworkFileRecord?.vectorized_file_url) ? (
                  <img
                    src={showVectorized 
                      ? (artworkFileRecord?.vectorized_file_url || preview || '') 
                      : (hasOriginalAccess ? (originalPreview || '') : (artworkFileRecord?.vectorized_file_url || ''))
                    }
                    alt={showVectorized ? "Vectorized preview" : "Original preview"}
                    className="max-w-full max-h-[calc(90vh-8rem)] object-contain rounded-bento mx-auto"
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-charcoal-400">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                      </svg>
                      <p className="font-semibold">Preview not available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer info */}
              {hasVectorized && (
                <div className="px-6 pb-4 text-center">
                  <p className="text-xs text-charcoal-500">
                    {showVectorized 
                      ? 'Viewing vectorized version (print-ready)' 
                      : hasOriginalAccess 
                        ? 'Viewing original uploaded file'
                        : 'Original file not available - showing vectorized version'
                    }
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

