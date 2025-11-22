'use client'

import { useState, useEffect, useMemo } from 'react'
import { Garment, PricingTier } from '@/types'
import Toast from './Toast'
import ColorGrid from './admin/ColorGrid'
import PricingTierCard from './admin/PricingTierCard'

interface GarmentFormProps {
  mode: 'create' | 'edit'
  initialData?: Garment
  onSuccess?: (garment: Garment) => void
  onCancel?: () => void
  onChange?: (formData: any, colorImagePreviews: Record<string, string>) => void
}

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']

const CATEGORY_OPTIONS = [
  'T-Shirt',
  'Hoodie',
  'Sweatshirt',
  'Long Sleeve',
  'Tank Top',
  'Headwear',
  'Outerwear',
  'Bottoms',
  'Bag',
  'Other'
]

export default function GarmentForm({ mode, initialData, onSuccess, onCancel, onChange }: GarmentFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    base_cost: initialData?.base_cost || 0,
    available_colors: initialData?.available_colors || [],
    color_images: initialData?.color_images || {},
    color_back_images: initialData?.color_back_images || {},
    size_range: initialData?.size_range || [],
    pricing_tier_id: initialData?.pricing_tier_id || '',
    active: initialData?.active ?? true,
    thumbnail_url: initialData?.thumbnail_url || null
  })

  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])
  const [colorImageFiles, setColorImageFiles] = useState<Record<string, File>>({})
  const [colorImagePreviews, setColorImagePreviews] = useState<Record<string, string>>(
    initialData?.color_images || {}
  )
  const [colorBackImageFiles, setColorBackImageFiles] = useState<Record<string, File>>({})
  const [colorBackImagePreviews, setColorBackImagePreviews] = useState<Record<string, string>>(
    initialData?.color_back_images || {}
  )
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  
  // Import from URL state
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [useAdvancedImport, setUseAdvancedImport] = useState(true)
  
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  })

  useEffect(() => {
    fetchPricingTiers()
  }, [])

  // Notify parent of form data changes for live preview
  useEffect(() => {
    if (onChange) {
      onChange(formData, colorImagePreviews)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, colorImagePreviews])

  async function fetchPricingTiers() {
    try {
      const response = await fetch('/api/pricing-tiers')
      if (response.ok) {
        const data = await response.json()
        setPricingTiers(data)
        if (mode === 'create' && data.length > 0 && !formData.pricing_tier_id) {
          setFormData(prev => ({ ...prev, pricing_tier_id: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching pricing tiers:', error)
    }
  }

  // Real-time validation
  function validateField(field: string, value: any): string | null {
    switch (field) {
      case 'name':
        return !value.trim() ? 'Name is required' : null
      case 'brand':
        return !value.trim() ? 'Brand is required' : null
      case 'description':
        return !value.trim() ? 'Description is required' : null
      case 'category':
        return !value ? 'Category is required' : null
      case 'base_cost':
        return value <= 0 ? 'Base cost must be greater than 0' : null
      case 'available_colors':
        return value.length === 0 ? 'At least one color is required' : null
      case 'size_range':
        return value.length === 0 ? 'At least one size is required' : null
      case 'pricing_tier_id':
        return !value ? 'Pricing tier is required' : null
      default:
        return null
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {}
    const fields = ['name', 'brand', 'description', 'category', 'base_cost', 'available_colors', 'size_range', 'pricing_tier_id']
    
    fields.forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData])
      if (error) newErrors[field] = error
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleFieldChange(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }))
    setTouchedFields(prev => new Set(prev).add(field))
    
    // Real-time validation for touched fields
    const error = validateField(field, value)
    setErrors(prev => {
      const newErrors = { ...prev }
      if (error) {
        newErrors[field] = error
      } else {
        delete newErrors[field]
      }
      return newErrors
    })
  }

  function handleBlur(field: string) {
    setTouchedFields(prev => new Set(prev).add(field))
    const error = validateField(field, formData[field as keyof typeof formData])
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  function handleAddColor(color: string) {
    if (!formData.available_colors.includes(color)) {
      handleFieldChange('available_colors', [...formData.available_colors, color])
    }
  }

  function handleRemoveColor(color: string) {
    const newColors = formData.available_colors.filter(c => c !== color)
    const newColorImages = { ...formData.color_images }
    delete newColorImages[color]
    
    setFormData(prev => ({
      ...prev,
      available_colors: newColors,
      color_images: newColorImages
    }))
    
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
    
    handleFieldChange('available_colors', newColors)
  }

  function handleColorImageChange(color: string, file: File) {
    setColorImageFiles(prev => ({ ...prev, [color]: file }))
    const reader = new FileReader()
    reader.onloadend = () => {
      setColorImagePreviews(prev => ({ ...prev, [color]: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  function handleColorBackImageChange(color: string, file: File) {
    setColorBackImageFiles(prev => ({ ...prev, [color]: file }))
    const reader = new FileReader()
    reader.onloadend = () => {
      setColorBackImagePreviews(prev => ({ ...prev, [color]: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  function handleSizeToggle(size: string) {
    const newSizes = formData.size_range.includes(size)
      ? formData.size_range.filter(s => s !== size)
      : [...formData.size_range, size]
    handleFieldChange('size_range', newSizes)
  }

  async function uploadColorImages(): Promise<{
    frontImages: Record<string, string>
    backImages: Record<string, string>
  }> {
    const uploadedFrontImages: Record<string, string> = { ...formData.color_images }
    const uploadedBackImages: Record<string, string> = { ...formData.color_back_images }
    
    setIsUploading(true)
    try {
      // Upload front images
      for (const [color, file] of Object.entries(colorImageFiles)) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/garments/upload-image', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Failed to upload front image for ${color}`)
        }

        const data = await response.json()
        uploadedFrontImages[color] = data.url
      }

      // Upload back images
      for (const [color, file] of Object.entries(colorBackImageFiles)) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/garments/upload-image', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Failed to upload back image for ${color}`)
        }

        const data = await response.json()
        uploadedBackImages[color] = data.url
      }
      
      return {
        frontImages: uploadedFrontImages,
        backImages: uploadedBackImages
      }
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
      const endpoint = '/api/garments/import-from-url-smart'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          url: importUrl,
          strategy: useAdvancedImport ? 'auto' : 'standard'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        
        if (response.status === 429) {
          const retrySeconds = error.retry_after || 120
          throw new Error(`Rate limit reached. Please wait ${Math.ceil(retrySeconds / 60)} minutes and try again.`)
        }
        
        throw new Error(error.error || 'Failed to import product data')
      }

      const importedData = await response.json()

      setFormData(prev => ({
        ...prev,
        name: importedData.name || prev.name,
        brand: importedData.brand || prev.brand,
        description: importedData.description || prev.description,
        category: importedData.category || prev.category,
        available_colors: importedData.available_colors || prev.available_colors,
        size_range: importedData.size_range || prev.size_range,
        base_cost: importedData.base_cost || prev.base_cost,
        thumbnail_url: importedData.thumbnail_url || prev.thumbnail_url,
        color_images: importedData.color_images || prev.color_images,
        color_back_images: importedData.color_back_images || prev.color_back_images
      }))

      if (importedData.color_images) {
        setColorImagePreviews(importedData.color_images)
      }

      if (importedData.color_back_images) {
        setColorBackImagePreviews(importedData.color_back_images)
      }

      let successMessage = `Product data imported! Found ${importedData.available_colors?.length || 0} colors`
      if (importedData.color_images && Object.keys(importedData.color_images).length > 0) {
        successMessage += ` with ${Object.keys(importedData.color_images).length} front images`
      }
      if (importedData.color_back_images && Object.keys(importedData.color_back_images).length > 0) {
        successMessage += ` and ${Object.keys(importedData.color_back_images).length} back images`
      }
      successMessage += '. Review and adjust as needed.'

      setToast({
        isVisible: true,
        message: successMessage,
        type: 'success'
      })

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
      let colorImages = formData.color_images
      let colorBackImages = formData.color_back_images
      if (Object.keys(colorImageFiles).length > 0 || Object.keys(colorBackImageFiles).length > 0) {
        try {
          const uploadedImages = await uploadColorImages()
          colorImages = uploadedImages.frontImages
          colorBackImages = uploadedImages.backImages
        } catch (uploadError) {
          setIsSubmitting(false)
          return
        }
      }

      const payload = {
        ...formData,
        color_images: colorImages,
        color_back_images: colorBackImages,
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

      // Set success state and keep the garment data for the Done button
      setIsSuccess(true)
      setIsSubmitting(false)
      
      // Store garment for Done button callback
      ;(window as any).__lastCreatedGarment = garment

    } catch (error) {
      console.error(`Error ${mode}ing garment:`, error)
      setToast({
        isVisible: true,
        message: error instanceof Error ? error.message : `Failed to ${mode} garment`,
        type: 'error'
      })
      setIsSubmitting(false)
    }
  }

  function handleDone() {
    const garment = (window as any).__lastCreatedGarment
    delete (window as any).__lastCreatedGarment
    onSuccess?.(garment)
  }

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const totalFields = 8
    let completed = 0
    if (formData.name.trim()) completed++
    if (formData.brand.trim()) completed++
    if (formData.description.trim()) completed++
    if (formData.category) completed++
    if (formData.base_cost > 0) completed++
    if (formData.available_colors.length > 0) completed++
    if (formData.size_range.length > 0) completed++
    if (formData.pricing_tier_id) completed++
    return Math.round((completed / totalFields) * 100)
  }, [formData])

  // Field validation helpers
  function getFieldStatus(field: string) {
    const value = formData[field as keyof typeof formData]
    const error = errors[field]
    const touched = touchedFields.has(field)
    
    if (error && touched) return 'error'
    if (!error && touched && value) return 'success'
    return 'default'
  }

  function getInputClassName(field: string) {
    const status = getFieldStatus(field)
    const baseClasses = 'w-full px-4 py-3 border-2 rounded-xl font-bold text-charcoal-700 transition-all duration-200 outline-none'
    
    if (status === 'error') {
      return `${baseClasses} border-error-300 bg-error-50 focus:border-error-500 focus:ring-4 focus:ring-error-100`
    }
    if (status === 'success') {
      return `${baseClasses} border-success-300 bg-success-50 focus:border-success-500 focus:ring-4 focus:ring-success-100`
    }
    return `${baseClasses} border-surface-300 bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100`
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Import from URL Section */}
        {mode === 'create' && (
          <div className="bento-card bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary-500 rounded-bento flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-primary-900">Quick Import from Supplier URL</h3>
                <p className="text-sm text-primary-700 font-semibold">
                  Paste a product URL to automatically fill in product details
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.ascolour.com/staple-tee-5001"
                className="flex-1 px-4 py-3 border-2 border-primary-300 rounded-xl focus:ring-4 focus:ring-primary-200 focus:border-primary-500 transition-all outline-none font-bold text-charcoal-700 bg-white"
                disabled={isImporting}
              />
              <button
                type="button"
                onClick={handleImportFromUrl}
                disabled={isImporting || !importUrl.trim()}
                className="px-8 py-3 bg-primary-600 text-white rounded-xl font-black hover:bg-primary-700 disabled:bg-surface-400 disabled:cursor-not-allowed transition-all shadow-soft hover:shadow-soft-md whitespace-nowrap"
              >
                {isImporting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Importing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Import
                  </span>
                )}
              </button>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl">
              <input
                id="useAdvancedImport"
                type="checkbox"
                checked={useAdvancedImport}
                onChange={(e) => setUseAdvancedImport(e.target.checked)}
                disabled={isImporting}
                className="mt-1 h-5 w-5 text-primary-600 focus:ring-primary-500 border-primary-300 rounded"
              />
              <label htmlFor="useAdvancedImport" className="flex-1">
                <span className="font-black text-primary-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Advanced Import (Recommended)
                </span>
                <p className="text-sm text-primary-700 font-semibold mt-1">
                  Uses Claude AI with web_fetch to extract <strong>all 50-80 colors with images</strong>. 
                  Takes 10-15 seconds but gets complete data.
                </p>
              </label>
            </div>
            
            <p className="mt-3 text-xs text-primary-700 font-bold flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Supported: ssactivewear.com, ascolour.com
            </p>
          </div>
        )}

        {/* Basic Information Section */}
        <div className="bento-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-charcoal-700 rounded-bento flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-charcoal-700">Basic Information</h2>
          </div>

          <div className="space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="name" className="flex items-center gap-2 text-sm font-black text-charcoal-700 mb-2 uppercase tracking-wide">
                Garment Name
                <span className="text-error-600">*</span>
                {getFieldStatus('name') === 'success' && (
                  <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className={getInputClassName('name')}
                placeholder="e.g., Comfort Colors 1717"
              />
              {errors.name && touchedFields.has('name') && (
                <p className="mt-2 text-sm font-bold text-error-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Brand */}
            <div>
              <label htmlFor="brand" className="flex items-center gap-2 text-sm font-black text-charcoal-700 mb-2 uppercase tracking-wide">
                Brand
                <span className="text-error-600">*</span>
                {getFieldStatus('brand') === 'success' && (
                  <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
              <input
                id="brand"
                type="text"
                value={formData.brand}
                onChange={(e) => handleFieldChange('brand', e.target.value)}
                onBlur={() => handleBlur('brand')}
                className={getInputClassName('brand')}
                placeholder="e.g., Comfort Colors"
              />
              {errors.brand && touchedFields.has('brand') && (
                <p className="mt-2 text-sm font-bold text-error-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errors.brand}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="flex items-center gap-2 text-sm font-black text-charcoal-700 mb-2 uppercase tracking-wide">
                Category
                <span className="text-error-600">*</span>
                {getFieldStatus('category') === 'success' && (
                  <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleFieldChange('category', e.target.value)}
                onBlur={() => handleBlur('category')}
                className={getInputClassName('category')}
              >
                <option value="">Select a category</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && touchedFields.has('category') && (
                <p className="mt-2 text-sm font-bold text-error-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errors.category}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="flex items-center gap-2 text-sm font-black text-charcoal-700 mb-2 uppercase tracking-wide">
                Description
                <span className="text-error-600">*</span>
                {getFieldStatus('description') === 'success' && (
                  <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                onBlur={() => handleBlur('description')}
                rows={4}
                className={getInputClassName('description')}
                placeholder="Describe the garment's material, fit, and key features"
              />
              {errors.description && touchedFields.has('description') && (
                <p className="mt-2 text-sm font-bold text-error-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errors.description}
                </p>
              )}
            </div>

            {/* Base Cost */}
            <div>
              <label htmlFor="base_cost" className="flex items-center gap-2 text-sm font-black text-charcoal-700 mb-2 uppercase tracking-wide">
                Base Cost ($)
                <span className="text-error-600">*</span>
                {getFieldStatus('base_cost') === 'success' && (
                  <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
              <input
                id="base_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.base_cost}
                onChange={(e) => handleFieldChange('base_cost', parseFloat(e.target.value) || 0)}
                onBlur={() => handleBlur('base_cost')}
                className={getInputClassName('base_cost')}
                placeholder="8.50"
              />
              {errors.base_cost && touchedFields.has('base_cost') && (
                <p className="mt-2 text-sm font-bold text-error-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errors.base_cost}
                </p>
              )}
              <p className="mt-2 text-xs text-charcoal-500 font-semibold">
                This is your cost from the supplier before markup
              </p>
            </div>
          </div>
        </div>

        {/* Colors & Images Section */}
        <div className="bento-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-data-purple rounded-bento flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-charcoal-700">Colors & Images</h2>
              <p className="text-sm text-charcoal-500 font-semibold">Add all available color options with photos</p>
            </div>
          </div>

          <ColorGrid
            colors={formData.available_colors}
            colorImages={formData.color_images}
            colorBackImages={formData.color_back_images}
            colorImagePreviews={colorImagePreviews}
            colorBackImagePreviews={colorBackImagePreviews}
            onAddColor={handleAddColor}
            onRemoveColor={handleRemoveColor}
            onImageChange={handleColorImageChange}
            onBackImageChange={handleColorBackImageChange}
            onReorder={(colors) => handleFieldChange('available_colors', colors)}
            errors={errors.available_colors && touchedFields.has('available_colors') ? errors.available_colors : undefined}
          />
        </div>

        {/* Size Range Section */}
        <div className="bento-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-data-blue rounded-bento flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-charcoal-700">Size Range</h2>
              <p className="text-sm text-charcoal-500 font-semibold">Select all sizes available for this garment</p>
            </div>
          </div>

          {errors.size_range && touchedFields.has('size_range') && (
            <div className="mb-4 p-3 bg-error-50 border-2 border-error-200 rounded-xl">
              <p className="text-sm font-bold text-error-700 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {errors.size_range}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {AVAILABLE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeToggle(size)}
                className={`px-8 py-4 rounded-bento-lg border-2 font-black text-lg transition-all shadow-soft hover:shadow-soft-md ${
                  formData.size_range.includes(size)
                    ? 'bg-primary-500 text-white border-primary-500 hover:bg-primary-600'
                    : 'bg-white text-charcoal-700 border-surface-300 hover:border-primary-400 hover:bg-primary-50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {formData.size_range.length > 0 && (
            <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-xl">
              <p className="text-sm font-bold text-success-700">
                Selected: {formData.size_range.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Pricing Tier Section */}
        <div className="bento-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-data-yellow rounded-bento flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-charcoal-700">Pricing</h2>
              <p className="text-sm text-charcoal-500 font-semibold">Choose the pricing tier for customer markup</p>
            </div>
          </div>

          <PricingTierCard
            tiers={pricingTiers}
            selectedTierId={formData.pricing_tier_id}
            onSelect={(tierId) => handleFieldChange('pricing_tier_id', tierId)}
            baseCost={formData.base_cost}
            error={errors.pricing_tier_id && touchedFields.has('pricing_tier_id') ? errors.pricing_tier_id : undefined}
          />
        </div>

        {/* Active Status Section */}
        <div className="bento-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-bento flex items-center justify-center ${
                formData.active ? 'bg-success-500' : 'bg-surface-400'
              }`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-charcoal-700">Availability Status</h2>
                <p className="text-sm text-charcoal-500 font-semibold">
                  {formData.active 
                    ? 'This garment will be visible to customers' 
                    : 'This garment will be hidden from customers'
                  }
                </p>
              </div>
            </div>
            <label htmlFor="active" className="relative inline-flex items-center cursor-pointer">
              <input
                id="active"
                type="checkbox"
                checked={formData.active}
                onChange={(e) => handleFieldChange('active', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-16 h-8 bg-surface-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-200 rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-400 after:border-2 after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-success-500"></div>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="sticky bottom-0 bg-white border-t-2 border-surface-300 pt-6 pb-4 -mx-8 px-8 shadow-soft-lg rounded-t-bento-lg">
          <div className="flex gap-4">
            {isSuccess ? (
              <button
                type="button"
                onClick={handleDone}
                className="flex-1 btn-primary bg-success-600 hover:bg-success-700 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Done - Back to Garments
              </button>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="flex-1 btn-primary flex items-center justify-center gap-3"
                >
                  {isSubmitting || isUploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {isUploading ? 'Uploading Images...' : 'Saving Garment...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {mode === 'create' ? 'Create Garment' : 'Update Garment'}
                    </>
                  )}
                </button>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting || isUploading}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
          
          {/* Progress Indicator in Footer */}
          {!isSuccess && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-sm font-black text-charcoal-600">
                {completionPercentage}% Complete
              </span>
            </div>
          )}
          
          {/* Success Message */}
          {isSuccess && (
            <div className="mt-4 p-4 bg-success-50 border-2 border-success-200 rounded-xl flex items-center gap-3">
              <svg className="w-6 h-6 text-success-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-black text-success-700">
                  Garment {mode === 'create' ? 'created' : 'updated'} successfully!
                </p>
                <p className="text-xs font-semibold text-success-600 mt-1">
                  Click Done to return to the garments list
                </p>
              </div>
            </div>
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
