import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

// Site configuration
const siteConfig = {
  name: 'My Swag Co',
  description: 'Custom screen printed shirts designed and ordered online. Choose from premium blank t-shirts, upload your artwork or use our AI design generator, get instant pricing, and pay your deposit in minutes. Minimum 24 pieces.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://myswagco.co',
  ogImage: '/og-image.png',
  keywords: [
    'custom screen printing',
    'custom t-shirts',
    'screen printed shirts',
    'bulk t-shirt printing',
    'custom apparel',
    'team shirts',
    'corporate apparel',
    'event t-shirts',
    'AI design generator',
    'custom merchandise',
    'wholesale t-shirts',
    'print shop',
    'screen print service',
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ff5722' },
    { media: '(prefers-color-scheme: dark)', color: '#ff5722' },
  ],
}

export const metadata: Metadata = {
  // Basic metadata
  title: {
    default: 'My Swag Co - Custom Screen Printing | Premium T-Shirts & Apparel',
    template: '%s | My Swag Co',
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: 'My Swag Co' }],
  creator: 'My Swag Co',
  publisher: 'My Swag Co',
  
  // Canonical URL
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: '/',
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: 'My Swag Co - Custom Screen Printing',
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: 'My Swag Co - Custom Screen Printed Shirts',
        type: 'image/png',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'My Swag Co - Custom Screen Printing',
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@myswagco',
  },
  
  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  
  // Manifest
  manifest: '/manifest.json',
  
  // Verification (add your verification codes when ready)
  // verification: {
  //   google: 'your-google-verification-code',
  //   yandex: 'your-yandex-verification-code',
  // },
  
  // Category
  category: 'business',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

