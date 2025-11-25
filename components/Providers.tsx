'use client'

import { ReactNode } from 'react'
import { CustomerAuthProvider } from '@/lib/auth/CustomerAuthContext'
import CustomerAuthModal from './CustomerAuthModal'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <CustomerAuthProvider>
      {children}
      <CustomerAuthModal />
    </CustomerAuthProvider>
  )
}

