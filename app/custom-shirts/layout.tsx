import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Custom Screen Printed Shirts',
  description: 'Browse our collection of premium blank t-shirts and apparel. Choose your garments, customize quantities and colors, upload your artwork, and get instant pricing.',
  keywords: [
    'custom t-shirts',
    'screen printing',
    'blank t-shirts',
    'wholesale apparel',
    'custom apparel',
    'bulk t-shirts',
  ],
  openGraph: {
    title: 'Custom Screen Printed Shirts | My Swag Co',
    description: 'Browse premium blank t-shirts, customize your order, and get instant pricing.',
    type: 'website',
  },
}

export default function CustomShirtsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

