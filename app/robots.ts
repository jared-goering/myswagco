import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://myswagco.co'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/admin/*',
          '/api/',
          '/api/*',
          '/auth/',
          '/auth/*',
          '/account/',
          '/account/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}





