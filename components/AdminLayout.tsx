'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="bg-white border-b border-surface-300 shadow-soft sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/admin" className="text-2xl font-black text-primary-600 hover:text-primary-700 transition-colors">
              My Swag Co Admin
            </Link>
            <nav className="hidden md:flex space-x-2">
              <Link href="/admin" className="text-charcoal-600 hover:text-primary-600 hover:bg-primary-50 font-bold px-4 py-2 rounded-xl transition-all">
                Dashboard
              </Link>
              <Link href="/admin/orders" className="text-charcoal-600 hover:text-primary-600 hover:bg-primary-50 font-bold px-4 py-2 rounded-xl transition-all">
                Orders
              </Link>
              <Link href="/admin/garments" className="text-charcoal-600 hover:text-primary-600 hover:bg-primary-50 font-bold px-4 py-2 rounded-xl transition-all">
                Garments
              </Link>
              <Link href="/admin/pricing" className="text-charcoal-600 hover:text-primary-600 hover:bg-primary-50 font-bold px-4 py-2 rounded-xl transition-all">
                Pricing
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-charcoal-500 hover:text-charcoal-700 font-bold text-sm px-4 py-2 hover:bg-surface-100 rounded-xl transition-all">
              View Store
            </Link>
            <button
              onClick={handleLogout}
              className="bg-surface-100 hover:bg-surface-200 text-charcoal-700 px-5 py-2.5 rounded-xl font-black text-sm transition-all border-2 border-surface-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

