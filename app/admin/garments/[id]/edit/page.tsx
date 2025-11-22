'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Garment, PricingTier } from '@/types'
import AdminLayout from '@/components/AdminLayout'
import GarmentForm from '@/components/GarmentForm'
import FormProgress from '@/components/admin/FormProgress'
import GarmentPreview from '@/components/admin/GarmentPreview'

export default function EditGarmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [garment, setGarment] = useState<Garment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    name: '',
    brand: '',
    description: '',
    category: '',
    base_cost: 0,
    available_colors: [] as string[],
    color_images: {} as Record<string, string>,
    size_range: [] as string[],
    pricing_tier_id: '',
    active: true
  })
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])

  useEffect(() => {
    fetchGarment()
    fetchPricingTiers()
  }, [params.id])

  async function fetchGarment() {
    try {
      const response = await fetch(`/api/garments/${params.id}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Garment not found')
        } else {
          setError('Failed to load garment')
        }
        return
      }
      const data = await response.json()
      setGarment(data)
      setFormState({
        name: data.name,
        brand: data.brand,
        description: data.description,
        category: data.category,
        base_cost: data.base_cost,
        available_colors: data.available_colors,
        color_images: data.color_images || {},
        size_range: data.size_range,
        pricing_tier_id: data.pricing_tier_id,
        active: data.active
      })
    } catch (error) {
      console.error('Error fetching garment:', error)
      setError('Failed to load garment')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPricingTiers() {
    try {
      const response = await fetch('/api/pricing-tiers')
      if (response.ok) {
        const data = await response.json()
        setPricingTiers(data)
      }
    } catch (error) {
      console.error('Error fetching pricing tiers:', error)
    }
  }

  // Calculate completion percentage and sections
  const { completionPercentage, sections } = useMemo(() => {
    const sectionsList = [
      {
        id: 'basic',
        label: 'Basic Info',
        completed: !!(formState.name && formState.brand && formState.description && formState.category),
        required: true
      },
      {
        id: 'cost',
        label: 'Base Cost',
        completed: formState.base_cost > 0,
        required: true
      },
      {
        id: 'colors',
        label: 'Colors',
        completed: formState.available_colors.length > 0,
        required: true
      },
      {
        id: 'sizes',
        label: 'Sizes',
        completed: formState.size_range.length > 0,
        required: true
      },
      {
        id: 'pricing',
        label: 'Pricing Tier',
        completed: !!formState.pricing_tier_id,
        required: true
      }
    ]

    const totalRequired = sectionsList.filter(s => s.required).length
    const completedRequired = sectionsList.filter(s => s.required && s.completed).length
    const percentage = Math.round((completedRequired / totalRequired) * 100)

    return {
      completionPercentage: percentage,
      sections: sectionsList,
      totalRequired,
      completedRequired
    }
  }, [formState])

  const selectedPricingTier = pricingTiers.find(t => t.id === formState.pricing_tier_id)

  const handleFormChange = useCallback((data: any, previews: Record<string, string>) => {
    setFormState({
      ...data,
      color_images: previews
    })
  }, [])

  function handleSuccess() {
    console.log('Navigating to garments list')
    router.push('/admin/garments')
    router.refresh()
  }

  function handleCancel() {
    console.log('Cancel clicked, navigating back')
    router.push('/admin/garments')
    router.refresh()
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mb-4"></div>
          <p className="text-lg font-bold text-charcoal-600">Loading garment...</p>
        </div>
      </AdminLayout>
    )
  }

  if (error || !garment) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bento-card bg-error-50 border-2 border-error-200 text-center">
            <div className="w-16 h-16 bg-error-500 rounded-bento-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-error-900 mb-3">
              {error || 'Garment not found'}
            </h2>
            <p className="text-error-700 font-semibold mb-6">
              The garment you're looking for doesn't exist or couldn't be loaded.
            </p>
            <button
              onClick={handleCancel}
              className="btn-primary bg-error-600 hover:bg-error-700"
            >
              Back to Garments
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/garments"
            className="inline-flex items-center gap-2 text-charcoal-600 hover:text-primary-600 font-bold mb-6 px-4 py-2 rounded-xl hover:bg-primary-50 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Garments
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-data-blue to-data-purple rounded-bento-lg flex items-center justify-center shadow-soft">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h1 className="text-5xl font-black text-charcoal-700 tracking-tight">Edit Garment</h1>
              <p className="mt-2 text-lg text-charcoal-500 font-semibold">
                Update the details for <span className="text-primary-600 font-black">{garment.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <FormProgress
          completionPercentage={completionPercentage}
          sections={sections}
          totalRequired={sections.filter(s => s.required).length}
          completedRequired={sections.filter(s => s.required && s.completed).length}
        />

        {/* Two Column Layout: Form + Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-2">
            <GarmentForm
              mode="edit"
              initialData={garment}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              onChange={handleFormChange}
            />
          </div>

          {/* Preview Column (Sticky) */}
          <div className="lg:col-span-1">
            <GarmentPreview
              name={formState.name}
              brand={formState.brand}
              description={formState.description}
              category={formState.category}
              baseCost={formState.base_cost}
              colors={formState.available_colors}
              colorImages={formState.color_images}
              sizes={formState.size_range}
              pricingTier={selectedPricingTier}
              active={formState.active}
              completionPercentage={completionPercentage}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
