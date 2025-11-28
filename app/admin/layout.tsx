import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Portal',
  description: 'My Swag Co admin dashboard',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

