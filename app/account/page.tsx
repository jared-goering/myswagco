'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'

export default function AccountPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, customer, user, signOut, openAuthModal } = useCustomerAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthModal({
        feature: 'view_orders',
        title: 'Sign in to view your account',
        message: 'Access your saved designs, order history, and account settings.',
      })
      router.push('/')
    }
  }, [isAuthenticated, isLoading, openAuthModal, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/custom-shirts/configure" className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="My Swag Co" 
                width={120} 
                height={36}
                className="h-8 w-auto"
              />
            </Link>
            
            <div className="flex items-center gap-4">
              <Link
                href="/custom-shirts"
                className="text-sm font-bold text-charcoal-600 hover:text-primary-600 transition-colors"
              >
                Shop
              </Link>
              <div className="h-4 w-px bg-surface-300" />
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
                <span className="text-sm font-bold text-charcoal-700 hidden sm:block">
                  {customer?.name || customer?.email || user?.email?.split('@')[0] || 'Account'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-charcoal-700 tracking-tight">My Account</h1>
          <p className="text-charcoal-500 mt-2">Manage your designs, orders, and settings</p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link href="/account/designs" className="bento-card hover:shadow-bento transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-charcoal-700 text-lg">My Designs</h3>
                <p className="text-sm text-charcoal-500">Saved artwork & AI creations</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-primary-600 font-bold text-sm">
              View all
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/account/orders" className="bento-card hover:shadow-bento transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-charcoal-700 text-lg">Order History</h3>
                <p className="text-sm text-charcoal-500">Track and view past orders</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-primary-600 font-bold text-sm">
              View all
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/account/settings" className="bento-card hover:shadow-bento transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-charcoal-700 text-lg">Settings</h3>
                <p className="text-sm text-charcoal-500">Profile & shipping info</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-primary-600 font-bold text-sm">
              Manage
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bento-card">
          <h2 className="text-xl font-black text-charcoal-700 mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/custom-shirts"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-surface-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="font-bold text-charcoal-700">Start New Order</span>
            </Link>

            <Link
              href="/account/designs"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-surface-200 hover:border-pink-300 hover:bg-pink-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-bold text-charcoal-700">Upload Artwork</span>
            </Link>

            <Link
              href="/account/orders"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-surface-200 hover:border-violet-300 hover:bg-violet-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="font-bold text-charcoal-700">Track Order</span>
            </Link>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-surface-200 hover:border-rose-300 hover:bg-rose-50 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="font-bold text-charcoal-700">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

