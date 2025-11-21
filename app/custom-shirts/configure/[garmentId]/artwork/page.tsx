'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useOrderStore } from '@/lib/store/orderStore'
import { PrintLocation, ArtworkTransform } from '@/types'
import DesignEditor from '@/components/DesignEditor'

export default function ArtworkUpload() {
  const router = useRouter()
  const params = useParams()
  const garmentId = params.garmentId as string

  const { printConfig, artworkFiles, setArtworkFile, artworkTransforms, setArtworkTransform } = useOrderStore()
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<PrintLocation | null>(null)

  const enabledLocations = Object.entries(printConfig.locations)
    .filter(([, config]) => config?.enabled)
    .map(([location]) => location as PrintLocation)

  // Set initial active tab to first enabled location
  useEffect(() => {
    if (enabledLocations.length > 0 && !activeTab) {
      setActiveTab(enabledLocations[0])
    }
  }, [enabledLocations])

  function handleFileSelect(location: PrintLocation, file: File | null) {
    setArtworkFile(location, file)
    // Switch to the tab of the uploaded file
    if (file) {
      setActiveTab(location)
    }
  }

  function handleTransformChange(location: PrintLocation, transform: ArtworkTransform) {
    setArtworkTransform(location, transform)
  }

  // Maximum print dimensions in inches per location
  const MAX_DIMENSIONS: Record<PrintLocation, { width: number; height: number }> = {
    front: { width: 11, height: 17 },
    back: { width: 11, height: 17 },
    left_chest: { width: 4, height: 4 },
    right_chest: { width: 4, height: 4 },
    full_back: { width: 13, height: 19 },
  }

  // Print area dimensions in pixels (must match DesignEditor.tsx)
  const PRINT_AREA_PIXELS: Record<PrintLocation, { width: number; height: number }> = {
    front: { width: 165, height: 255 },
    back: { width: 165, height: 255 },
    left_chest: { width: 60, height: 60 },
    right_chest: { width: 60, height: 60 },
    full_back: { width: 195, height: 285 },
  }

  // Validation functions
  function getValidationWarnings(location: PrintLocation): string[] {
    const warnings: string[] = []
    const file = artworkFiles[location]
    const transform = artworkTransforms[location]

    if (!file || !transform) return warnings

    // Calculate dimensions in inches (estimate based on pixels)
    const maxDims = MAX_DIMENSIONS[location]
    const printAreaPx = PRINT_AREA_PIXELS[location]
    
    // Create temporary image to get dimensions
    const img = new Image()
    img.src = URL.createObjectURL(file)
    const widthPx = img.width * transform.scale
    const heightPx = img.height * transform.scale
    const widthInches = (widthPx / printAreaPx.width) * maxDims.width
    const heightInches = (heightPx / printAreaPx.height) * maxDims.height

    // Check if artwork exceeds maximum print area
    if (widthInches > maxDims.width || heightInches > maxDims.height) {
      warnings.push(`Design exceeds maximum print area of ${maxDims.width}" × ${maxDims.height}". Please resize.`)
    }

    // Check if artwork is too small (scale less than 0.3)
    if (transform.scale < 0.3) {
      warnings.push('Design appears very small. Consider using a larger design for better print quality.')
    }

    // Check if significantly rotated
    const normalizedRotation = Math.abs(transform.rotation % 360)
    if (normalizedRotation > 15 && normalizedRotation < 345) {
      warnings.push('Design is rotated. Rotated designs may have different pricing or printing considerations.')
    }

    return warnings
  }

  function hasAnyWarnings(): boolean {
    return enabledLocations.some(location => getValidationWarnings(location).length > 0)
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

  function canContinue(): boolean {
    return enabledLocations.every(location => artworkFiles[location] !== null && artworkFiles[location] !== undefined)
  }

  function handleContinue() {
    if (canContinue()) {
      router.push(`/custom-shirts/configure/${garmentId}/checkout`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/custom-shirts" className="text-2xl font-bold text-primary-600">
            My Swag Co
          </Link>
          <nav className="text-sm text-gray-600">
            <span className="font-semibold text-primary-600">Step 3</span> / Upload Artwork
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Upload Your Artwork
          </h1>
          <p className="text-gray-600">
            Upload high-resolution files for each print location and position your design
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-6">
          {/* Left Column: File Uploads */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">File Requirements</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Accepted formats: PNG, JPG, PDF, AI, EPS, SVG</li>
                  <li>• Maximum file size: 50MB</li>
                  <li>• High resolution (300dpi) gives best results</li>
                  <li>• Vector files (AI, EPS, SVG) are preferred for best quality</li>
                </ul>
              </div>

              <div className="space-y-6">
                {enabledLocations.map((location) => {
                  const colors = printConfig.locations[location]?.num_colors || 1
                  const file = artworkFiles[location]

                  return (
                    <div key={location} className="border border-gray-200 rounded-lg p-6">
                      <h3 className="font-semibold text-lg mb-2">
                        {getLocationLabel(location)}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {colors} color{colors > 1 ? 's' : ''}
                      </p>

                      {file ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="font-medium text-green-900">{file.name}</p>
                                <p className="text-sm text-green-700">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleFileSelect(location, null)}
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 cursor-pointer transition-colors">
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.pdf,.ai,.eps,.svg"
                            onChange={(e) => {
                              const selectedFile = e.target.files?.[0]
                              if (selectedFile) {
                                handleFileSelect(location, selectedFile)
                              }
                            }}
                            className="hidden"
                          />
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-gray-700 font-medium mb-1">
                            Drop file here or click to browse
                          </p>
                          <p className="text-sm text-gray-500">
                            PNG, JPG, PDF, AI, EPS, SVG (max 50MB)
                          </p>
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Text-Only Design Option */}
              <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-2">Don't have artwork?</h3>
                <p className="text-gray-600 text-sm mb-3">
                  If you just need text printed on your shirts, you can work with our team to create a simple text-based design. 
                  Upload a text file or document describing what you want, and we'll follow up with you.
                </p>
                <label className="inline-block bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg cursor-pointer text-sm font-medium">
                  <input
                    type="file"
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0]
                      if (selectedFile && enabledLocations.length > 0) {
                        handleFileSelect(enabledLocations[0], selectedFile)
                      }
                    }}
                    className="hidden"
                  />
                  Upload Text Description
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Design Preview */}
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4">Design Preview</h2>

            {/* Tabs for print locations */}
            {enabledLocations.length > 0 && (
              <div className="mb-4 border-b border-gray-200">
                <div className="flex flex-wrap -mb-px">
                  {enabledLocations.map((location) => (
                    <button
                      key={location}
                      onClick={() => setActiveTab(location)}
                      className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === location
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {getLocationLabel(location)}
                      {artworkFiles[location] && (
                        <span className="ml-2 text-green-600">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Design Editor */}
            {activeTab && (
              <div className="mt-4">
                <div className="flex justify-center">
                  <DesignEditor
                    artworkFile={artworkFiles[activeTab]}
                    printLocation={activeTab}
                    transform={artworkTransforms[activeTab] || null}
                    onTransformChange={(transform) => handleTransformChange(activeTab, transform)}
                  />
                </div>

                {/* Validation Warnings */}
                {getValidationWarnings(activeTab).length > 0 && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-900 mb-1">Design Warnings</h4>
                        <ul className="text-sm text-yellow-800 space-y-1">
                          {getValidationWarnings(activeTab).map((warning, idx) => (
                            <li key={idx}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Design Tips */}
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Design Tips</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Keep important elements within the print area boundaries</li>
                    <li>• Designs should be at least 300dpi at the desired print size</li>
                    <li>• Allow at least 0.5" margin from the print area edges</li>
                    <li>• Vector files (AI, EPS, SVG) provide the best quality</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between max-w-7xl mx-auto">
          <Link
            href={`/custom-shirts/configure/${garmentId}`}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
          >
            Back
          </Link>
          <div className="flex flex-col items-end">
            <button
              onClick={handleContinue}
              disabled={!canContinue()}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Checkout
            </button>
            {hasAnyWarnings() && (
              <p className="text-xs text-yellow-600 mt-2">
                ⚠️ There are design warnings. You can still proceed.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

