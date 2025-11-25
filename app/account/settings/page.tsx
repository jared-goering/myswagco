'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { ShippingAddress } from '@/types'

export default function SettingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, customer, user, updateCustomerProfile, openAuthModal, signOut } = useCustomerAuth()
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [address, setAddress] = useState<ShippingAddress>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  })
  
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthModal({
        feature: 'view_orders',
        title: 'Sign in to manage your account',
        message: 'Access your profile and settings.',
      })
      router.push('/')
    }
  }, [isAuthenticated, isLoading, openAuthModal, router])

  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
      setOrganizationName(customer.organization_name || '')
      if (customer.default_shipping_address) {
        setAddress(customer.default_shipping_address)
      }
    }
  }, [customer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateError } = await updateCustomerProfile({
        name,
        phone,
        organization_name: organizationName,
        default_shipping_address: address,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm mb-6">
          <ol className="flex items-center gap-2 text-charcoal-500">
            <li><Link href="/account" className="hover:text-primary-600 transition-colors">Account</Link></li>
            <li><span className="text-charcoal-300">/</span></li>
            <li className="font-bold text-charcoal-700">Settings</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-charcoal-700 tracking-tight">Account Settings</h1>
          <p className="text-charcoal-500 mt-1">Manage your profile and default shipping information</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Section */}
          <div className="bento-card">
            <h2 className="text-xl font-black text-charcoal-700 mb-6">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={customer?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-400 bg-surface-50 cursor-not-allowed"
                />
                <p className="text-xs text-charcoal-400 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                  Organization / Company
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Acme Inc."
                  className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address Section */}
          <div className="bento-card">
            <h2 className="text-xl font-black text-charcoal-700 mb-6">Default Shipping Address</h2>
            <p className="text-sm text-charcoal-500 mb-4">This will be pre-filled at checkout</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  placeholder="123 Main St"
                  className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                  Apt, Suite, etc. (optional)
                </label>
                <input
                  type="text"
                  value={address.line2 || ''}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  placeholder="Suite 100"
                  className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="New York"
                    className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    placeholder="NY"
                    className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal-600 mb-1.5">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={address.postal_code}
                  onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                  placeholder="10001"
                  className="w-full px-4 py-3 border-2 border-surface-200 rounded-xl font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                />
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-emerald-700">Profile updated successfully!</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => signOut()}
              className="px-4 py-2 text-rose-600 hover:text-rose-700 font-bold transition-colors"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-bento-lg font-black transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

