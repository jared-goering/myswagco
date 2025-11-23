'use client'

import { useState } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { DocumentIcon } from '@heroicons/react/24/solid'

interface ArtworkFile {
  id: string
  location: string
  file_name: string
  file_size: number
  file_url: string
  vectorized_file_url?: string | null
  is_vector: boolean
  vectorization_status: string
}

interface ArtworkPreviewCardProps {
  files: ArtworkFile[]
}

export default function ArtworkPreviewCard({ files }: ArtworkPreviewCardProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageLoadError, setImageLoadError] = useState<Record<string, boolean>>({})

  if (!files || files.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center mb-4">
          <DocumentIcon className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Artwork Files</h2>
        </div>
        <div className="text-center py-8">
          <DocumentIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No artwork files uploaded</p>
        </div>
      </div>
    )
  }

  const handleDownload = (file: ArtworkFile) => {
    window.open(file.file_url, '_blank')
  }

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const isImageFile = (filename: string) => {
    const ext = getFileExtension(filename)
    return ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center mb-6">
          <DocumentIcon className="w-5 h-5 text-gray-700 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Artwork Files</h2>
          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        <div className="grid gap-4">
          {files.map((file) => {
            const isImage = isImageFile(file.file_name)
            const hasError = imageLoadError[file.id]

            return (
              <div 
                key={file.id} 
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-gray-50"
              >
                <div className="flex">
                  {/* Preview/Icon Section */}
                  <div className="relative w-32 h-32 flex-shrink-0 bg-gray-100 border-r border-gray-200">
                    {isImage && !hasError ? (
                      <div className="relative w-full h-full group">
                        <img
                          src={file.file_url}
                          alt={file.file_name}
                          className="w-full h-full object-contain p-2"
                          onError={() => setImageLoadError(prev => ({ ...prev, [file.id]: true }))}
                        />
                        <button
                          onClick={() => setSelectedImage(file.file_url)}
                          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center"
                        >
                          <MagnifyingGlassIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <DocumentIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* File Details Section */}
                  <div className="flex-1 p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2 gap-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {file.location.replace('_', ' ').toUpperCase()}
                        </span>
                        {file.is_vector ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Vector
                          </span>
                        ) : file.vectorization_status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Vectorized
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Raster
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 text-sm mb-1 truncate">
                        {file.file_name}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 space-x-3">
                        <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>•</span>
                        <span className="uppercase">{getFileExtension(file.file_name)}</span>
                      </div>
                      {file.vectorized_file_url && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          ✓ Vectorized version available for production
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex flex-col gap-2">
                      <div className="flex items-center space-x-2">
                        {isImage && !hasError && (
                          <button
                            onClick={() => setSelectedImage(file.file_url)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Preview Original"
                          >
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(file)}
                          className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                          title="Download Original"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                          Original
                        </button>
                      </div>
                      {file.vectorized_file_url && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedImage(file.vectorized_file_url!)}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                            title="Preview Vectorized"
                          >
                            <MagnifyingGlassIcon className="w-5 h-5 text-green-600" />
                          </button>
                          <button
                            onClick={() => window.open(file.vectorized_file_url!, '_blank')}
                            className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                            title="Download Vectorized (Production)"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                            Vector
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
          <div className="max-w-6xl max-h-full">
            <img
              src={selectedImage}
              alt="Artwork preview"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}

