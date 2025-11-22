'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import GarmentForm from '@/components/GarmentForm'
import FormProgress from '@/components/admin/FormProgress'
import GarmentPreview from '@/components/admin/GarmentPreview'
import { PricingTier } from '@/types'

export default function NewGarmentPage() {
  const router = useRouter()
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
    fetchPricingTiers()
  }, [])

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
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-bento-lg flex items-center justify-center shadow-soft">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h1 className="text-5xl font-black text-charcoal-700 tracking-tight">Add New Garment</h1>
              <p className="mt-2 text-lg text-charcoal-500 font-semibold">
                Create a new garment that customers can choose for their custom orders
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
              mode="create"
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
