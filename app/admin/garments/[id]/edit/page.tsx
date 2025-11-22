'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Garment } from '@/types'
import AdminLayout from '@/components/AdminLayout'
import GarmentForm from '@/components/GarmentForm'

export default function EditGarmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [garment, setGarment] = useState<Garment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGarment()
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
    } catch (error) {
      console.error('Error fetching garment:', error)
      setError('Failed to load garment')
    } finally {
      setLoading(false)
    }
  }

  function handleSuccess() {
    router.push('/admin/garments')
  }

  function handleCancel() {
    router.push('/admin/garments')
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !garment) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-red-900 mb-2">
              {error || 'Garment not found'}
            </h2>
            <p className="text-red-700 mb-4">
              The garment you're looking for doesn't exist or couldn't be loaded.
            </p>
            <button
              onClick={handleCancel}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
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
          <h1 className="text-3xl font-bold text-gray-900">Edit Garment</h1>
          <p className="mt-2 text-gray-600">
            Update the details for <span className="font-semibold">{garment.name}</span>.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <GarmentForm
            mode="edit"
            initialData={garment}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </AdminLayout>
  )
}

