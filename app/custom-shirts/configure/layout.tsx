import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Choose Your Styles',
  description: 'Select from our curated collection of premium blank t-shirts and apparel. Browse by brand, category, fit type, and color to find the perfect garments for your custom order.',
  keywords: [
    'premium blanks',
    'Gildan',
    'Bella+Canvas',
    'AS Colour',
    'custom t-shirts',
    'bulk order',
  ],
  openGraph: {
    title: 'Choose Your Styles | My Swag Co',
    description: 'Select premium blank t-shirts for your custom screen printing order.',
    type: 'website',
  },
}

export default function ConfigureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}


