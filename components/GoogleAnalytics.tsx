'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { pageview, GA_MEASUREMENT_ID } from '@/lib/analytics'

/**
 * Inner component that handles page view tracking
 * Separated to properly use useSearchParams within Suspense boundary
 */
function GoogleAnalyticsInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return

    // Construct full URL with search params
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    
    // Track page view
    pageview(url)
  }, [pathname, searchParams])

  return null
}

/**
 * Google Analytics component that tracks page views
 * 
 * This component should be placed in the root layout to track all page views.
 * It automatically tracks route changes in Next.js App Router.
 */
export default function GoogleAnalytics() {
  // Don't render anything if GA is not configured
  if (!GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner />
    </Suspense>
  )
}





