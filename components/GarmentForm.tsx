'use client'

import { useState, useEffect } from 'react'
import { Garment, PricingTier } from '@/types'
import Toast from './Toast'

interface GarmentFormProps {
  mode: 'create' | 'edit'
  initialData?: Garment
  onSuccess?: (garment: Garment) => void
  onCancel?: () => void
}

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']

export default function GarmentForm({ mode, initialData, onSuccess, onCancel }: GarmentFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    description: initialData?.description || '',
    base_cost: initialData?.base_cost || 0,
    available_colors: initialData?.available_colors || [],
    color_images: initialData?.color_images || {},
    size_range: initialData?.size_range || [],
    pricing_tier_id: initialData?.pricing_tier_id || '',
    active: initialData?.active ?? true,
    thumbnail_url: initialData?.thumbnail_url || null
  })

  const [colorInput, setColorInput] = useState('')
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])
  const [colorImageFiles, setColorImageFiles] = useState<Record<string, File>>({})
  const [colorImagePreviews, setColorImagePreviews] = useState<Record<string, string>>(
    initialData?.color_images || {}
  )
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Import from URL state
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  })

  useEffect(() => {
    fetchPricingTiers()
  }, [])

  async function fetchPricingTiers() {
    try {
      const response = await fetch('/api/pricing-tiers')
      if (response.ok) {
        const data = await response.json()
        setPricingTiers(data)
        // Set default pricing tier if creating new garment
        if (mode === 'create' && data.length > 0 && !formData.pricing_tier_id) {
          setFormData(prev => ({ ...prev, pricing_tier_id: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching pricing tiers:', error)
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.brand.trim()) newErrors.brand = 'Brand is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (formData.base_cost <= 0) newErrors.base_cost = 'Base cost must be greater than 0'
    if (formData.available_colors.length === 0) newErrors.available_colors = 'At least one color is required'
    if (formData.size_range.length === 0) newErrors.size_range = 'At least one size is required'
    if (!formData.pricing_tier_id) newErrors.pricing_tier_id = 'Pricing tier is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleAddColor(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && colorInput.trim()) {
      e.preventDefault()
      const color = colorInput.trim()
      if (!formData.available_colors.includes(color)) {
        setFormData(prev => ({
          ...prev,
          available_colors: [...prev.available_colors, color]
        }))
      }
      setColorInput('')
    }
  }

  function handleRemoveColor(color: string) {
    setFormData(prev => {
      const newColorImages = { ...prev.color_images }
      delete newColorImages[color]
      return {
        ...prev,
        available_colors: prev.available_colors.filter(c => c !== color),
        color_images: newColorImages
      }
    })
    
    // Clean up preview and file for this color
    setColorImagePreviews(prev => {
      const newPreviews = { ...prev }
      delete newPreviews[color]
      return newPreviews
    })
    setColorImageFiles(prev => {
      const newFiles = { ...prev }
      delete newFiles[color]
      return newFiles
    })
  }

  function handleSizeToggle(size: string) {
    setFormData(prev => ({
      ...prev,
      size_range: prev.size_range.includes(size)
        ? prev.size_range.filter(s => s !== size)
        : [...prev.size_range, size]
    }))
  }

  function handleColorImageChange(color: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setColorImageFiles(prev => ({ ...prev, [color]: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setColorImagePreviews(prev => ({ ...prev, [color]: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  async function uploadColorImages(): Promise<Record<string, string>> {
    const uploadedImages: Record<string, string> = { ...formData.color_images }
    
    setIsUploading(true)
    try {
      // Upload each new color image
      for (const [color, file] of Object.entries(colorImageFiles)) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/garments/upload-image', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Failed to upload image for ${color}`)
        }

        const data = await response.json()
        uploadedImages[color] = data.url
      }
      
      return uploadedImages
    } catch (error) {
      console.error('Error uploading color images:', error)
      setToast({
        isVisible: true,
        message: error instanceof Error ? error.message : 'Failed to upload images',
        type: 'error'
      })
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  async function handleImportFromUrl() {
    if (!importUrl.trim()) {
      setToast({
        isVisible: true,
        message: 'Please enter a product URL',
        type: 'error'
      })
      return
    }

    setIsImporting(true)
    try {
      const response = await fetch('/api/garments/import-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: importUrl })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import product data')
      }

      const importedData = await response.json()

      // Pre-fill the form with imported data
      setFormData(prev => ({
        ...prev,
        name: importedData.name || prev.name,
        brand: importedData.brand || prev.brand,
        description: importedData.description || prev.description,
        available_colors: importedData.available_colors || prev.available_colors,
        size_range: importedData.size_range || prev.size_range,
        base_cost: importedData.base_cost || prev.base_cost,
        thumbnail_url: importedData.thumbnail_url || prev.thumbnail_url,
        color_images: importedData.color_images || prev.color_images
      }))

      // Update color image previews if color images were found
      if (importedData.color_images) {
        setColorImagePreviews(importedData.color_images)
      }

      // Build success message with details
      let successMessage = `Product data imported! Found ${importedData.available_colors?.length || 0} colors`
      if (importedData.color_images && Object.keys(importedData.color_images).length > 0) {
        successMessage += ` with ${Object.keys(importedData.color_images).length} color images`
      }
      successMessage += '. Review and adjust as needed.'

      setToast({
        isVisible: true,
        message: successMessage,
        type: 'success'
      })

      // Log color images for debugging
      if (importedData.color_images) {
        console.log('Color images extracted:', importedData.color_images)
      }

      // Clear the import URL
      setImportUrl('')

    } catch (error) {
      console.error('Error importing from URL:', error)
      setToast({
        isVisible: true,
        message: error instanceof Error ? error.message : 'Failed to import product data',
        type: 'error'
      })
    } finally {
      setIsImporting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) {
      setToast({
        isVisible: true,
        message: 'Please fix the errors in the form',
        type: 'error'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Upload color images if there are new ones
      let colorImages = formData.color_images
      if (Object.keys(colorImageFiles).length > 0) {
        try {
          colorImages = await uploadColorImages()
        } catch (uploadError) {
          // Upload failed, error already shown in uploadColorImages
          setIsSubmitting(false)
          return
        }
      }

      const payload = {
        ...formData,
        color_images: colorImages,
        // Keep thumbnail_url for backwards compatibility
        thumbnail_url: Object.values(colorImages)[0] || formData.thumbnail_url
      }

      const url = mode === 'create' 
        ? '/api/garments'
        : `/api/garments/${initialData?.id}`
      
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${mode} garment`)
      }

      const garment = await response.json()

      setToast({
        isVisible: true,
        message: `Garment ${mode === 'create' ? 'created' : 'updated'} successfully!`,
        type: 'success'
      })

      // Call onSuccess after a short delay to allow toast to show
      setTimeout(() => {
        onSuccess?.(garment)
      }, 1000)

    } catch (error) {
      console.error(`Error ${mode}ing garment:`, error)
      setToast({
        isVisible: true,
        message: error instanceof Error ? error.message : `Failed to ${mode} garment`,
        type: 'error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Import from URL Section */}
        {mode === 'create' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Quick Import from Supplier URL
            </h3>
            <p className="text-xs text-blue-700 mb-3">
              Paste a product URL from S&S Activewear or AS Colour to automatically fill in product details.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.ssactivewear.com/p/bella/3001cvc"
                className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isImporting}
              />
              <button
                type="button"
                onClick={handleImportFromUrl}
                disabled={isImporting || !importUrl.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
              >
                {isImporting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Importing...
                  </span>
                ) : (
                  'Import'
                )}
              </button>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Supported: ssactivewear.com, ascolour.com
            </p>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Comfort Colors 1717"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Brand */}
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
            Brand *
          </label>
          <input
            id="brand"
            type="text"
            value={formData.brand}
            onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.brand ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Comfort Colors"
          />
          {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe the garment's material, fit, and key features"
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>

        {/* Base Cost */}
        <div>
          <label htmlFor="base_cost" className="block text-sm font-medium text-gray-700 mb-1">
            Base Cost ($) *
          </label>
          <input
            id="base_cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.base_cost}
            onChange={(e) => setFormData(prev => ({ ...prev, base_cost: parseFloat(e.target.value) || 0 }))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.base_cost ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="8.50"
          />
          {errors.base_cost && <p className="mt-1 text-sm text-red-600">{errors.base_cost}</p>}
        </div>

        {/* Available Colors with Images */}
        <div>
          <label htmlFor="colors" className="block text-sm font-medium text-gray-700 mb-1">
            Available Colors *
          </label>
          <input
            id="colors"
            type="text"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            onKeyDown={handleAddColor}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.available_colors ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Type a color and press Enter"
          />
          {errors.available_colors && <p className="mt-1 text-sm text-red-600">{errors.available_colors}</p>}
          
          {/* Color list with image upload for each */}
          {formData.available_colors.length > 0 && (
            <div className="mt-4 space-y-3">
              {formData.available_colors.map((color) => (
                <div key={color} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  {/* Color preview image */}
                  <div className="flex-shrink-0">
                    {colorImagePreviews[color] ? (
                      <img
                        src={colorImagePreviews[color]}
                        alt={color}
                        className="w-20 h-20 object-cover rounded border border-gray-300"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded border border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center p-2">
                        No image
                      </div>
                    )}
                  </div>
                  
                  {/* Color info and upload */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{color}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(color)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleColorImageChange(color, e)}
                          className="hidden"
                        />
                        <span className="inline-block w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer text-center">
                          {colorImagePreviews[color] ? 'Change Image' : 'Upload Image'}
                        </span>
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">JPEG, PNG, WebP (max 5MB)</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Size Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Size Range *
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeToggle(size)}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                  formData.size_range.includes(size)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          {errors.size_range && <p className="mt-1 text-sm text-red-600">{errors.size_range}</p>}
        </div>

        {/* Pricing Tier */}
        <div>
          <label htmlFor="pricing_tier" className="block text-sm font-medium text-gray-700 mb-1">
            Pricing Tier *
          </label>
          <select
            id="pricing_tier"
            value={formData.pricing_tier_id}
            onChange={(e) => setFormData(prev => ({ ...prev, pricing_tier_id: e.target.value }))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.pricing_tier_id ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a pricing tier</option>
            {pricingTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name} (Markup: {tier.garment_markup_percentage}%)
              </option>
            ))}
          </select>
          {errors.pricing_tier_id && <p className="mt-1 text-sm text-red-600">{errors.pricing_tier_id}</p>}
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-3">
          <label htmlFor="active" className="relative inline-flex items-center cursor-pointer">
            <input
              id="active"
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-700">
            {formData.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting || isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isUploading ? 'Uploading...' : 'Saving...'}
              </span>
            ) : (
              `${mode === 'create' ? 'Create' : 'Update'} Garment`
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting || isUploading}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </>
  )
}

