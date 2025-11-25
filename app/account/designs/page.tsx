'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { SavedArtwork } from '@/types'

export default function DesignsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, customer, user, openAuthModal } = useCustomerAuth()
  const [designs, setDesigns] = useState<SavedArtwork[]>([])
  const [loadingDesigns, setLoadingDesigns] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthModal({
        feature: 'save_artwork',
        title: 'Sign in to view your designs',
        message: 'Access your saved artwork and AI-generated designs.',
      })
      router.push('/')
    }
  }, [isAuthenticated, isLoading, openAuthModal, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchDesigns()
    }
  }, [isAuthenticated])

  async function fetchDesigns() {
    try {
      console.log('[DesignsPage] Fetching designs, isAuthenticated:', isAuthenticated, 'user:', user?.email)
      const response = await fetch('/api/saved-artwork', {
        credentials: 'include', // Ensure cookies are sent
      })
      console.log('[DesignsPage] Response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('[DesignsPage] Fetched designs count:', data.length)
        setDesigns(data)
      } else {
        const error = await response.json()
        console.error('[DesignsPage] Error response:', error)
      }
    } catch (error) {
      console.error('Error fetching designs:', error)
    } finally {
      setLoadingDesigns(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const response = await fetch(`/api/saved-artwork/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setDesigns(designs.filter(d => d.id !== id))
      }
    } catch (error) {
      console.error('Error deleting design:', error)
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/account" className="text-charcoal-400 hover:text-charcoal-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <Link href="/custom-shirts/configure" className="flex items-center">
                <Image 
                  src="/logo.png" 
                  alt="My Swag Co" 
                  width={120} 
                  height={36}
                  className="h-8 w-auto"
                />
              </Link>
            </div>
            
            <div className="flex items-center gap-2">
              {customer?.avatar_url ? (
                <img 
                  src={customer.avatar_url} 
                  alt={customer?.name || 'Avatar'} 
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  {(customer?.name || customer?.email || user?.email)?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm mb-6">
          <ol className="flex items-center gap-2 text-charcoal-500">
            <li><Link href="/account" className="hover:text-primary-600 transition-colors">Account</Link></li>
            <li><span className="text-charcoal-300">/</span></li>
            <li className="font-bold text-charcoal-700">My Designs</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-charcoal-700 tracking-tight">My Designs</h1>
            <p className="text-charcoal-500 mt-1">Your saved artwork and AI-generated designs</p>
          </div>
          <Link
            href="/custom-shirts"
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-bento font-bold transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New
          </Link>
        </div>

        {/* Designs Grid */}
        {loadingDesigns ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : designs.length === 0 ? (
          <div className="bento-card text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-charcoal-700 mb-2">No designs yet</h3>
            <p className="text-charcoal-500 mb-6 max-w-md mx-auto">
              Start creating custom designs with our AI generator or upload your own artwork.
            </p>
            <Link
              href="/custom-shirts"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-violet-500 text-white rounded-bento-lg font-black hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Start Creating
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {designs.map((design, index) => (
                <motion.div
                  key={design.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-white rounded-xl overflow-hidden shadow-soft hover:shadow-bento transition-all"
                >
                  {/* Image */}
                  <div 
                    className="aspect-square bg-surface-100 flex items-center justify-center p-4"
                    style={{
                      background: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 16px 16px'
                    }}
                  >
                    <img
                      src={design.image_url}
                      alt={design.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* AI Badge */}
                  {design.is_ai_generated && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      AI
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/custom-shirts?artwork=${design.id}`}
                        className="px-4 py-2 bg-white text-charcoal-700 rounded-lg font-bold text-sm hover:bg-primary-50 transition-colors"
                      >
                        Use Design
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm(design.id)}
                        className="p-2 bg-white/20 hover:bg-rose-500 text-white rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-charcoal-700 truncate">{design.name}</h3>
                    <p className="text-xs text-charcoal-400 mt-1">
                      {new Date(design.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Delete Confirmation */}
                  {deleteConfirm === design.id && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="text-center">
                        <p className="font-bold text-charcoal-700 mb-4">Delete this design?</p>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 border-2 border-surface-300 rounded-lg font-bold text-charcoal-600 hover:bg-surface-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(design.id)}
                            disabled={deleting}
                            className="px-4 py-2 bg-rose-500 text-white rounded-lg font-bold hover:bg-rose-600 transition-colors disabled:opacity-50"
                          >
                            {deleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

