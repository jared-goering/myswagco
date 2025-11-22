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
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="border-b border-surface-300 bg-white shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/custom-shirts" className="text-2xl font-black text-primary-600 hover:text-primary-700 transition-colors">
            My Swag Co
          </Link>
          <nav className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full text-sm font-black">1</span>
            <span className="text-sm font-bold text-charcoal-700">Choose Garment</span>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black text-charcoal-700 mb-4 tracking-tight">
            Choose Your Garment
          </h1>
          <p className="text-xl text-charcoal-400 max-w-2xl mx-auto">
            Select from our curated collection of premium blanks
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            <p className="mt-4 text-charcoal-500 font-medium">Loading garments...</p>
          </div>
        )}

        {error && (
          <div className="bento-card bg-error-50 border-2 border-error-200 text-error-700 mb-8">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bento-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {garments.map((garment) => (
              <div
                key={garment.id}
                className="bento-card-hover overflow-hidden group"
              >
                <div className="aspect-square bg-surface-100 rounded-bento mb-6 relative overflow-hidden">
                  {garment.thumbnail_url ? (
                    <Image
                      src={garment.thumbnail_url}
                      alt={garment.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                      <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-charcoal-700 mb-1">
                    {garment.name}
                  </h3>
                  <p className="text-sm text-charcoal-400 font-semibold mb-3">{garment.brand}</p>
                  <p className="text-charcoal-500 mb-4 line-clamp-2 leading-relaxed">
                    {garment.description}
                  </p>
                  <div className="mb-6">
                    <p className="text-sm text-charcoal-500 font-semibold mb-2">Available colors:</p>
                    <div className="flex flex-wrap gap-2">
                      {garment.available_colors.slice(0, 5).map((color) => (
                        <span key={color} className="text-xs bg-surface-100 px-3 py-1.5 rounded-full font-semibold text-charcoal-600">
                          {color}
                        </span>
                      ))}
                      {garment.available_colors.length > 5 && (
                        <span className="text-xs text-charcoal-400 font-semibold">
                          +{garment.available_colors.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectGarment(garment.id)}
                    className="w-full bg-primary-500 hover:bg-primary-600 text-white font-black py-4 rounded-bento-lg transition-all shadow-soft hover:shadow-bento"
                  >
                    Select This Garment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && garments.length === 0 && (
          <div className="bento-card text-center text-charcoal-500">
            <p className="text-lg">No garments available at this time. Please check back later.</p>
          </div>
        )}
      </div>
    </div>
  )
}

