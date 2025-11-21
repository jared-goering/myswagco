'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Garment } from '@/types'

export default function GarmentSelection() {
  const router = useRouter()
  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGarments()
  }, [])

  async function fetchGarments() {
    try {
      const response = await fetch('/api/garments')
      if (!response.ok) throw new Error('Failed to fetch garments')
      const data = await response.json()
      setGarments(data)
    } catch (err) {
      setError('Failed to load garments. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectGarment(garmentId: string) {
    router.push(`/custom-shirts/configure/${garmentId}`)
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
            <span className="font-semibold text-primary-600">Step 1</span> / Choose Garment
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Garment
          </h1>
          <p className="text-lg text-gray-600">
            Select from our curated collection of premium blanks
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading garments...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {garments.map((garment) => (
              <div
                key={garment.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
              >
                <div className="aspect-square bg-gray-100 relative">
                  {garment.thumbnail_url ? (
                    <Image
                      src={garment.thumbnail_url}
                      alt={garment.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {garment.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{garment.brand}</p>
                  <p className="text-gray-700 mb-4 line-clamp-2">
                    {garment.description}
                  </p>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Available colors:</p>
                    <div className="flex flex-wrap gap-1">
                      {garment.available_colors.slice(0, 5).map((color) => (
                        <span key={color} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {color}
                        </span>
                      ))}
                      {garment.available_colors.length > 5 && (
                        <span className="text-xs text-gray-500">
                          +{garment.available_colors.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectGarment(garment.id)}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    Select This Garment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && garments.length === 0 && (
          <div className="text-center py-12 text-gray-600">
            <p>No garments available at this time. Please check back later.</p>
          </div>
        )}
      </div>
    </div>
  )
}

