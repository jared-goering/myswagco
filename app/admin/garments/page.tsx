'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import Toast from '@/components/Toast'
import { Garment } from '@/types'

export default function AdminGarments() {
  const router = useRouter()
  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  })

  useEffect(() => {
    fetchGarments()
  }, [])

  async function fetchGarments() {
    try {
      // Add admin=true to fetch all garments (not just active)
      const response = await fetch('/api/garments?admin=true')
      if (response.ok) {
        const data = await response.json()
        setGarments(data)
      }
    } catch (error) {
      console.error('Error fetching garments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(garment: Garment) {
    try {
      const response = await fetch(`/api/garments/${garment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !garment.active })
      })

      if (!response.ok) {
        throw new Error('Failed to update garment')
      }

      setToast({
        isVisible: true,
        message: `Garment ${!garment.active ? 'activated' : 'deactivated'} successfully`,
        type: 'success'
      })

      // Refresh garments list
      fetchGarments()
    } catch (error) {
      console.error('Error toggling garment:', error)
      setToast({
        isVisible: true,
        message: 'Failed to update garment status',
        type: 'error'
      })
    }
  }

  function handleEdit(garmentId: string) {
    router.push(`/admin/garments/${garmentId}/edit`)
  }

  function handleAddNew() {
    router.push('/admin/garments/new')
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Garments</h1>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Garment
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Colors
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sizes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {garments.map((garment) => (
                    <tr key={garment.id} className={!garment.active ? 'bg-gray-50 opacity-75' : ''}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{garment.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{garment.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {garment.brand}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${garment.base_cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex flex-wrap gap-1">
                          {garment.available_colors.slice(0, 3).map((color) => (
                            <span key={color} className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {color}
                            </span>
                          ))}
                          {garment.available_colors.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{garment.available_colors.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {garment.size_range.join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          garment.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {garment.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(garment.id)}
                            className="text-primary-600 hover:text-primary-900 font-medium"
                            title="Edit garment"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(garment)}
                            className={`font-medium ${
                              garment.active
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={garment.active ? 'Deactivate garment' : 'Activate garment'}
                          >
                            {garment.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </AdminLayout>
  )
}

