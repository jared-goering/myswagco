/**
 * Google Analytics 4 Event Tracking Utilities
 * 
 * This module provides type-safe event tracking for Google Analytics 4.
 * Events are organized by category for easier maintenance.
 */

// GA4 Measurement ID - set this in your .env.local
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''

// Type definitions for gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

// Check if GA is available
const isGAAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

// Core gtag wrapper with safety check
const gtag = (...args: any[]) => {
  if (isGAAvailable()) {
    window.gtag(...args)
  }
}

/**
 * Track page views
 */
export const pageview = (url: string, title?: string) => {
  gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
    page_title: title,
  })
}

/**
 * Generic event tracking
 */
export const event = (
  action: string,
  params?: {
    category?: string
    label?: string
    value?: number
    [key: string]: any
  }
) => {
  gtag('event', action, params)
}

// ============================================
// E-COMMERCE EVENTS (GA4 Standard Events)
// ============================================

interface ProductItem {
  item_id: string
  item_name: string
  price?: number
  quantity?: number
  item_category?: string
  item_brand?: string
  item_variant?: string
}

/**
 * Track when a user views a product/garment
 */
export const trackViewItem = (item: ProductItem) => {
  gtag('event', 'view_item', {
    currency: 'USD',
    value: item.price || 0,
    items: [item],
  })
}

/**
 * Track when a user adds item to cart
 */
export const trackAddToCart = (item: ProductItem & { quantity: number }) => {
  gtag('event', 'add_to_cart', {
    currency: 'USD',
    value: (item.price || 0) * item.quantity,
    items: [item],
  })
}

/**
 * Track when a user removes item from cart
 */
export const trackRemoveFromCart = (item: ProductItem & { quantity: number }) => {
  gtag('event', 'remove_from_cart', {
    currency: 'USD',
    value: (item.price || 0) * item.quantity,
    items: [item],
  })
}

/**
 * Track when a user views their cart
 */
export const trackViewCart = (items: ProductItem[], totalValue: number) => {
  gtag('event', 'view_cart', {
    currency: 'USD',
    value: totalValue,
    items,
  })
}

/**
 * Track when a user begins checkout
 */
export const trackBeginCheckout = (items: ProductItem[], totalValue: number) => {
  gtag('event', 'begin_checkout', {
    currency: 'USD',
    value: totalValue,
    items,
  })
}

/**
 * Track when a user completes a purchase
 */
export const trackPurchase = (
  transactionId: string,
  items: ProductItem[],
  totalValue: number,
  tax?: number,
  shipping?: number
) => {
  gtag('event', 'purchase', {
    transaction_id: transactionId,
    currency: 'USD',
    value: totalValue,
    tax: tax || 0,
    shipping: shipping || 0,
    items,
  })
}

// ============================================
// CUSTOM EVENTS - Design Flow
// ============================================

/**
 * Track garment selection
 */
export const trackGarmentSelected = (garmentId: string, garmentName: string) => {
  gtag('event', 'garment_selected', {
    garment_id: garmentId,
    garment_name: garmentName,
  })
}

/**
 * Track color selection
 */
export const trackColorSelected = (colorName: string, hexCode: string) => {
  gtag('event', 'color_selected', {
    color_name: colorName,
    hex_code: hexCode,
  })
}

/**
 * Track artwork upload
 */
export const trackArtworkUploaded = (fileType: string, fileSize: number) => {
  gtag('event', 'artwork_uploaded', {
    file_type: fileType,
    file_size_kb: Math.round(fileSize / 1024),
  })
}

/**
 * Track AI design generation started
 */
export const trackAIDesignStarted = (prompt: string) => {
  gtag('event', 'ai_design_started', {
    prompt_length: prompt.length,
  })
}

/**
 * Track AI design generation completed
 */
export const trackAIDesignCompleted = (success: boolean, duration?: number) => {
  gtag('event', 'ai_design_completed', {
    success,
    duration_ms: duration,
  })
}

/**
 * Track design placement changes
 */
export const trackDesignPlacement = (position: 'front' | 'back', action: 'move' | 'resize' | 'rotate') => {
  gtag('event', 'design_placement', {
    position,
    action,
  })
}

// ============================================
// CUSTOM EVENTS - Campaign Flow
// ============================================

/**
 * Track campaign creation started
 */
export const trackCampaignStarted = () => {
  gtag('event', 'campaign_started', {})
}

/**
 * Track campaign creation completed
 */
export const trackCampaignCreated = (campaignId: string, productCount: number) => {
  gtag('event', 'campaign_created', {
    campaign_id: campaignId,
    product_count: productCount,
  })
}

/**
 * Track campaign page view
 */
export const trackCampaignViewed = (campaignSlug: string) => {
  gtag('event', 'campaign_viewed', {
    campaign_slug: campaignSlug,
  })
}

/**
 * Track campaign order placed
 */
export const trackCampaignOrder = (campaignSlug: string, orderValue: number, itemCount: number) => {
  gtag('event', 'campaign_order', {
    campaign_slug: campaignSlug,
    order_value: orderValue,
    item_count: itemCount,
  })
}

// ============================================
// CUSTOM EVENTS - User Engagement
// ============================================

/**
 * Track quote request
 */
export const trackQuoteRequested = (quantity: number, colors: number) => {
  gtag('event', 'quote_requested', {
    quantity,
    print_colors: colors,
  })
}

/**
 * Track pricing calculator used
 */
export const trackPricingCalculated = (quantity: number, pricePerUnit: number) => {
  gtag('event', 'pricing_calculated', {
    quantity,
    price_per_unit: pricePerUnit,
  })
}

/**
 * Track user sign-up
 */
export const trackSignUp = (method: 'email' | 'google') => {
  gtag('event', 'sign_up', {
    method,
  })
}

/**
 * Track user login
 */
export const trackLogin = (method: 'email' | 'google') => {
  gtag('event', 'login', {
    method,
  })
}

/**
 * Track search performed
 */
export const trackSearch = (searchTerm: string, resultsCount?: number) => {
  gtag('event', 'search', {
    search_term: searchTerm,
    results_count: resultsCount,
  })
}

// ============================================
// CUSTOM EVENTS - Funnel Tracking
// ============================================

/**
 * Track funnel step progression
 */
export const trackFunnelStep = (
  funnelName: 'custom_order' | 'campaign_creation' | 'campaign_purchase',
  stepNumber: number,
  stepName: string
) => {
  gtag('event', 'funnel_step', {
    funnel_name: funnelName,
    step_number: stepNumber,
    step_name: stepName,
  })
}

/**
 * Track funnel completion
 */
export const trackFunnelComplete = (
  funnelName: 'custom_order' | 'campaign_creation' | 'campaign_purchase',
  totalValue?: number
) => {
  gtag('event', 'funnel_complete', {
    funnel_name: funnelName,
    value: totalValue,
  })
}

// ============================================
// CONVERSION TRACKING
// ============================================

/**
 * Track key conversions for both GA4 and Google Ads
 */
export const trackConversion = (
  conversionType: 'deposit_paid' | 'campaign_created' | 'campaign_order',
  value: number,
  transactionId?: string
) => {
  // GA4 conversion event
  gtag('event', conversionType, {
    value,
    currency: 'USD',
    transaction_id: transactionId,
  })
  
  // Google Ads conversion tracking
  switch (conversionType) {
    case 'deposit_paid':
      // Purchase conversion for custom orders
      gtag('event', 'conversion', {
        send_to: 'AW-17766992287/OK46COecoMobEJ-T-5dC',
        value: value,
        currency: 'USD',
        transaction_id: transactionId,
      })
      break
    case 'campaign_order':
      // Purchase conversion for campaign orders
      gtag('event', 'conversion', {
        send_to: 'AW-17766992287/OK46COecoMobEJ-T-5dC',
        value: value,
        currency: 'USD',
        transaction_id: transactionId,
      })
      break
  }
}

/**
 * Track Google Ads purchase conversion directly
 */
export const trackGoogleAdsPurchase = (value: number, transactionId?: string) => {
  gtag('event', 'conversion', {
    send_to: 'AW-17766992287/OK46COecoMobEJ-T-5dC',
    value: value,
    currency: 'USD',
    transaction_id: transactionId || '',
  })
}

// ============================================
// DEBUG UTILITIES
// ============================================

/**
 * Enable debug mode for development
 */
export const enableDebugMode = () => {
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.gtag_debug = true
    console.log('🔍 GA Debug Mode Enabled')
  }
}

/**
 * Log all events to console in development
 */
export const logEvent = (eventName: string, params: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Analytics Event: ${eventName}`, params)
  }
}


