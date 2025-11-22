'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import Toast from '@/components/Toast'
import { Garment } from '@/types'

export default function AdminGarments() {
  const router = useRouter()
  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
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

      // Update the garment in the local state immediately for instant feedback
      setGarments(prevGarments => 
        prevGarments.map(g => 
          g.id === garment.id ? { ...g, active: !g.active } : g
        )
      )

      // If deactivating and viewing only active, switch to 'all' view
      if (garment.active && filterStatus === 'active') {
        setFilterStatus('all')
      }

      setToast({
        isVisible: true,
        message: `Garment ${!garment.active ? 'activated' : 'deactivated'} successfully`,
        type: 'success'
      })
    } catch (error) {
      console.error('Error toggling garment:', error)
      setToast({
        isVisible: true,
        message: 'Failed to update garment status',
        type: 'error'
      })
      // Refresh on error to ensure data consistency
      fetchGarments()
    }
  }

  async function handleDelete(garment: Garment) {
    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${garment.name}"?\n\n` +
      `This action CANNOT be undone. The garment and all its data will be permanently removed.\n\n` +
      `Consider using "Deactivate" instead if you might want to restore it later.`
    )
    
    if (!confirmed) return

    try {
      const response = await fetch(`/api/garments/${garment.id}?permanent=true`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete garment')
      }

      // Remove from local state immediately
      setGarments(prevGarments => prevGarments.filter(g => g.id !== garment.id))

      setToast({
        isVisible: true,
        message: `"${garment.name}" has been permanently deleted`,
        type: 'success'
      })
    } catch (error) {
      console.error('Error deleting garment:', error)
      setToast({
        isVisible: true,
        message: 'Failed to delete garment',
        type: 'error'
      })
      // Refresh on error
      fetchGarments()
    }
  }

  // Filter garments based on search and status
  const filteredGarments = garments.filter(garment => {
    const matchesSearch = searchQuery === '' || 
      garment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      garment.brand.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && garment.active) ||
      (filterStatus === 'inactive' && !garment.active)
    
    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const stats = {
    total: garments.length,
    active: garments.filter(g => g.active).length,
    inactive: garments.filter(g => !g.active).length,
    totalColors: garments.reduce((sum, g) => sum + g.available_colors.length, 0)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mb-4"></div>
          <p className="text-lg font-bold text-charcoal-600">Loading garments...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-data-purple to-primary-600 rounded-bento-lg flex items-center justify-center shadow-soft">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-5xl font-black text-charcoal-700 tracking-tight">Garments</h1>
              <p className="mt-1 text-lg text-charcoal-500 font-semibold">
                Manage your product catalog
              </p>
            </div>
          </div>
          <Link
            href="/admin/garments/new"
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add New Garment
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bento-card border-2 border-surface-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wide mb-2">Total Garments</p>
                <p className="text-4xl font-black text-charcoal-700">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-charcoal-700 rounded-bento flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bento-card bg-gradient-to-br from-success-50 to-success-100 border-2 border-success-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-success-700 uppercase tracking-wide mb-2">Active</p>
                <p className="text-4xl font-black text-success-700">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-success-500 rounded-bento flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bento-card bg-gradient-to-br from-surface-100 to-surface-200 border-2 border-surface-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wide mb-2">Inactive</p>
                <p className="text-4xl font-black text-charcoal-600">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-surface-400 rounded-bento flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bento-card bg-gradient-to-br from-data-purple/20 to-data-purple/10 border-2 border-data-purple/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-data-purple uppercase tracking-wide mb-2">Total Colors</p>
                <p className="text-4xl font-black text-data-purple">{stats.totalColors}</p>
              </div>
              <div className="w-12 h-12 bg-data-purple rounded-bento flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bento-card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search garments by name or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-surface-300 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-bold text-charcoal-700"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                  filterStatus === 'all'
                    ? 'bg-primary-500 text-white shadow-soft'
                    : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                  filterStatus === 'active'
                    ? 'bg-success-500 text-white shadow-soft'
                    : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                  filterStatus === 'inactive'
                    ? 'bg-surface-400 text-white shadow-soft'
                    : 'bg-surface-100 text-charcoal-600 hover:bg-surface-200'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* Garments Grid */}
        {filteredGarments.length === 0 ? (
          <div className="bento-card text-center py-16">
            <div className="w-20 h-20 bg-surface-200 rounded-bento-lg flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-charcoal-600 mb-2">No garments found</h3>
            <p className="text-charcoal-500 font-semibold mb-6">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first garment'
              }
            </p>
            {garments.length === 0 && (
              <Link href="/admin/garments/new" className="btn-primary inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Your First Garment
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGarments.map((garment) => (
              <div
                key={garment.id}
                className={`bento-card hover:shadow-soft-lg transition-all duration-200 ${
                  !garment.active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {garment.color_images && Object.values(garment.color_images)[0] ? (
                      <img
                        src={Object.values(garment.color_images)[0]}
                        alt={garment.name}
                        className="w-32 h-32 object-cover rounded-xl border-2 border-surface-200"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-surface-200 rounded-xl border-2 border-surface-300 flex items-center justify-center">
                        <svg className="w-12 h-12 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-black text-charcoal-700">{garment.name}</h3>
                          {garment.active ? (
                            <span className="inline-flex items-center gap-1 bg-success-100 text-success-700 px-3 py-1 rounded-full text-xs font-black">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-surface-200 text-charcoal-600 px-3 py-1 rounded-full text-xs font-black">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-primary-600 uppercase tracking-wide mb-2">
                          {garment.brand}
                        </p>
                        <p className="text-sm text-charcoal-600 leading-relaxed line-clamp-2">
                          {garment.description}
                        </p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      {/* Base Cost */}
                      <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
                        <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wide mb-1">Base Cost</p>
                        <p className="text-xl font-black text-charcoal-700">${garment.base_cost.toFixed(2)}</p>
                      </div>

                      {/* Colors */}
                      <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
                        <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wide mb-2">
                          Colors ({garment.available_colors.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {garment.available_colors.slice(0, 6).map((color) => (
                            <div key={color} className="group relative">
                              {garment.color_images && garment.color_images[color] ? (
                                <img
                                  src={garment.color_images[color]}
                                  alt={color}
                                  className="w-8 h-8 object-cover rounded border-2 border-surface-300"
                                  title={color}
                                />
                              ) : (
                                <div
                                  className="w-8 h-8 bg-surface-200 rounded border-2 border-surface-300 flex items-center justify-center"
                                  title={color}
                                >
                                  <span className="text-[8px] font-bold text-charcoal-500 leading-tight text-center">
                                    {color.substring(0, 2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                          {garment.available_colors.length > 6 && (
                            <div className="w-8 h-8 bg-primary-100 rounded border-2 border-primary-300 flex items-center justify-center">
                              <span className="text-xs font-black text-primary-600">
                                +{garment.available_colors.length - 6}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sizes */}
                      <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
                        <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wide mb-2">Sizes</p>
                        <div className="flex flex-wrap gap-1">
                          {garment.size_range.map((size) => (
                            <span
                              key={size}
                              className="px-2 py-1 bg-white border border-surface-300 rounded text-xs font-bold text-charcoal-700"
                            >
                              {size}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2 justify-end items-end">
                    <button
                      onClick={() => router.push(`/admin/garments/${garment.id}/edit`)}
                      className="px-4 py-2 bg-white border-2 border-surface-300 text-charcoal-700 rounded-lg font-bold text-sm transition-all hover:border-surface-400 hover:bg-surface-50 flex items-center justify-center gap-1.5 whitespace-nowrap min-w-[120px]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(garment)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap min-w-[120px] flex items-center justify-center ${
                        garment.active
                          ? 'bg-surface-200 text-charcoal-700 hover:bg-surface-300'
                          : 'bg-success-500 text-white hover:bg-success-600'
                      }`}
                    >
                      {garment.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(garment)}
                      className="px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap min-w-[120px] border-2 border-error-500 text-error-500 hover:bg-error-500 hover:text-white flex items-center justify-center gap-1.5"
                      title="Permanently delete this garment"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
