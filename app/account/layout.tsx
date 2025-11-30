import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your My Swag Co account, view saved designs, and track orders.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}


