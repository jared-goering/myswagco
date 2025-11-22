'use client'

import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import GarmentForm from '@/components/GarmentForm'

export default function NewGarmentPage() {
  const router = useRouter()

  function handleSuccess() {
    // Navigate back to garments list
    router.push('/admin/garments')
  }

  function handleCancel() {
    router.push('/admin/garments')
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Garments
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Add New Garment</h1>
          <p className="mt-2 text-gray-600">
            Create a new garment that customers can choose for their custom orders.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <GarmentForm
            mode="create"
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </AdminLayout>
  )
}

