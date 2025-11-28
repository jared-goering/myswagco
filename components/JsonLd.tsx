'use client'

import { useMemo } from 'react'

type JsonLdProps = {
  data: object | object[]
}

/**
 * JSON-LD Structured Data Component
 * Renders schema.org structured data for SEO
 */
export function JsonLd({ data }: JsonLdProps) {
  const jsonLdString = useMemo(() => {
    return JSON.stringify(data)
  }, [data])

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString }}
    />
  )
}

/**
 * Generate Organization Schema
 */
export function generateOrganizationSchema(baseUrl: string) {
  return {
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'My Swag Co',
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/logo.png`,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'hello@myswagco.co',
      availableLanguage: 'English',
    },
  }
}

/**
 * Generate LocalBusiness Schema
 */
export function generateLocalBusinessSchema(baseUrl: string) {
  return {
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}/#localbusiness`,
    name: 'My Swag Co',
    description: 'Custom screen printing service offering premium t-shirts, AI-powered design generation, and fast turnaround times.',
    url: baseUrl,
    priceRange: '$$',
    image: `${baseUrl}/og-image.png`,
    email: 'hello@myswagco.co',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '2500',
    },
  }
}

/**
 * Generate Product Schema for a garment
 */
export function generateProductSchema(
  baseUrl: string,
  product: {
    id: string
    name: string
    brand: string
    description: string
    price: number
    imageUrl?: string
    category?: string
    sku?: string
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
  }
) {
  return {
    '@type': 'Product',
    '@id': `${baseUrl}/custom-shirts/configure/${product.id}`,
    name: `${product.brand} ${product.name}`,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    image: product.imageUrl || `${baseUrl}/og-image.png`,
    sku: product.sku || product.id,
    category: product.category || 'T-Shirts',
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/custom-shirts/configure/${product.id}`,
      priceCurrency: 'USD',
      price: product.price.toFixed(2),
      availability: `https://schema.org/${product.availability || 'InStock'}`,
      seller: {
        '@type': 'Organization',
        name: 'My Swag Co',
      },
    },
  }
}

/**
 * Generate FAQ Schema
 */
export function generateFAQSchema(
  faqs: Array<{ q: string; a: string }>
) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }
}

/**
 * Generate Breadcrumb Schema
 */
export function generateBreadcrumbSchema(
  baseUrl: string,
  items: Array<{ name: string; url: string }>
) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  }
}

/**
 * Generate full JSON-LD graph with all schemas
 */
export function generateFullSchema(baseUrl: string, additionalSchemas?: object[]) {
  const graph = [
    generateOrganizationSchema(baseUrl),
    generateLocalBusinessSchema(baseUrl),
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: 'My Swag Co',
      description: 'Custom screen printed shirts designed and ordered online',
      publisher: {
        '@id': `${baseUrl}/#organization`,
      },
    },
    ...(additionalSchemas || []),
  ]

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export default JsonLd

