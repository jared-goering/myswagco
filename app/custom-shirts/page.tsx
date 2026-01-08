'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CustomShirtsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the configure page
    router.replace('/custom-shirts/configure')
  }, [router])

  return (
    <div className="min-h-screen bg-surface-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  )
}





