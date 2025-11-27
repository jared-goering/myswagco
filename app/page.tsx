'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Accordion from '@radix-ui/react-accordion'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'
import { useOrderStore } from '@/lib/store/orderStore'
import { OrderDraft } from '@/types'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
}

export default function Home() {
  const router = useRouter()
  const [activeExample, setActiveExample] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated, customer, user, openAuthModal, signOut, isLoading } = useCustomerAuth()
  const { loadDraft } = useOrderStore()
  
  // Order drafts state
  const [drafts, setDrafts] = useState<OrderDraft[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null)

  // Handle OAuth redirect - if we receive a code parameter, redirect to auth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    
    if (code) {
      // OAuth code landed on home page - redirect to callback handler
      console.log('[Home] OAuth code detected, redirecting to callback handler')
      
      // Get the original path from sessionStorage
      const redirectPath = sessionStorage.getItem('auth_redirect_path') || '/'
      sessionStorage.removeItem('auth_redirect_path')
      
      window.location.href = `/auth/callback?code=${code}&next=${encodeURIComponent(redirectPath)}`
    }
  }, [])

  // Fetch order drafts when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchDrafts()
    }
  }, [isAuthenticated, isLoading])

  async function fetchDrafts() {
    setLoadingDrafts(true)
    try {
      const response = await fetch('/api/order-drafts')
      if (response.ok) {
        const data = await response.json()
        setDrafts(data)
      }
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoadingDrafts(false)
    }
  }

  function getRedirectPath(draft: OrderDraft): string {
    // Determine where to redirect based on draft state
    if (draft.garment_id && draft.selected_colors.length > 0 && Object.keys(draft.color_size_quantities).length > 0) {
      // Has garment, colors, and quantities - go to artwork
      return `/custom-shirts/configure/${draft.garment_id}/artwork`
    } else if (draft.garment_id && draft.selected_colors.length > 0) {
      // Has garment and colors - go to colors/quantities page
      return `/custom-shirts/configure/colors`
    } else if (draft.garment_id) {
      // Has garment only - go to garment config
      return `/custom-shirts/configure/${draft.garment_id}`
    } else if (draft.selected_garments && Object.keys(draft.selected_garments).length > 0) {
      // Multi-garment selection - go to artwork
      return `/custom-shirts/configure/artwork`
    }
    // Default: start from beginning
    return '/custom-shirts/configure'
  }

  async function handleResumeDraft(draft: OrderDraft) {
    setLoadingDraftId(draft.id)
    try {
      // Load draft into order store
      loadDraft(draft)
      
      // Close modal if open
      setShowDraftModal(false)
      
      // Redirect to appropriate step
      const path = getRedirectPath(draft)
      router.push(path)
    } catch (error) {
      console.error('Error loading draft:', error)
      setLoadingDraftId(null)
    }
  }

  function handleResumeClick() {
    if (drafts.length === 1) {
      // Single draft - load directly
      handleResumeDraft(drafts[0])
    } else {
      // Multiple drafts - show modal
      setShowDraftModal(true)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const aiExamples = [
    { prompt: "Vintage sunset with palm trees", style: "Retro" },
    { prompt: "Geometric wolf head", style: "Modern" },
    { prompt: "Hand-lettered 'Champions 2025'", style: "Typography" },
    { prompt: "Abstract mountain landscape", style: "Minimalist" },
  ]

  return (
    <main className="min-h-screen flex flex-col bg-surface-200">
      {/* Header */}
      <header className="bg-white py-4 px-6 sticky top-0 z-50 border-b border-surface-300 shadow-soft">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Image 
            src="/logo.png" 
            alt="My Swag Co" 
            width={200} 
            height={60}
            className="h-10 w-auto"
            priority
          />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-charcoal-600 hover:text-primary-500 font-semibold transition-colors">How It Works</a>
            <a href="#ai-generator" className="text-charcoal-600 hover:text-primary-500 font-semibold transition-colors">AI Design</a>
            <a href="#pricing" className="text-charcoal-600 hover:text-primary-500 font-semibold transition-colors">Pricing</a>
            <a href="#faq" className="text-charcoal-600 hover:text-primary-500 font-semibold transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-4">
            {/* Account Button */}
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-surface-200 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-100 transition-colors"
                >
                  {customer?.avatar_url ? (
                    <img 
                      src={customer.avatar_url} 
                      alt={customer?.name || 'Avatar'} 
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                      {(customer?.name || customer?.email || user?.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <span className="hidden lg:block text-sm font-bold text-charcoal-700 max-w-[100px] truncate">
                    {customer?.name || customer?.email?.split('@')[0] || user?.email?.split('@')[0] || 'Account'}
                  </span>
                  <svg className={`w-4 h-4 text-charcoal-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-surface-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-surface-100">
                      <p className="text-sm font-bold text-charcoal-700 truncate">
                        {customer?.name || 'Welcome!'}
                      </p>
                      <p className="text-xs text-charcoal-400 truncate">{customer?.email || user?.email || 'Signed in'}</p>
                    </div>
                    
                    <Link
                      href="/account"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Account
                    </Link>
                    
                    <Link
                      href="/account/designs"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      My Designs
                    </Link>
                    
                    <Link
                      href="/account/orders"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:bg-surface-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Order History
                    </Link>
                    
                    <div className="border-t border-surface-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          signOut()
                          setShowDropdown(false)
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal()}
                className="flex items-center gap-2 px-4 py-2 border-2 border-surface-300 rounded-xl font-bold text-charcoal-700 hover:border-primary-300 hover:bg-primary-50 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
            
            <Link
              href="/custom-shirts/configure"
              className="hidden sm:inline-flex items-center justify-center bg-primary-500 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-primary-600 transition-all"
            >
              Start Order
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#ff5722]">
        {/* Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px'
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-14 md:py-20 lg:py-24">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-block px-5 py-2 bg-white/15 backdrop-blur-sm text-white rounded-full text-sm font-semibold tracking-wide">
                Professional Screen Printing
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight max-w-4xl mb-6"
            >
              Custom Screen Printed Shirts<br />
              <span className="block">Designed & Ordered</span>
              <span className="block">Online</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              variants={fadeInUp}
              className="text-lg md:text-xl text-white/85 max-w-2xl mb-8 leading-relaxed font-medium"
            >
              Choose your favorite premium tee, upload your artwork, get instant pricing, and pay your deposit in minutes.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-4">
              <Link
                href="/custom-shirts/configure"
                className="inline-flex items-center justify-center bg-white text-[#ff5722] px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
              >
                Start Your Order
              </Link>
              
              {/* Resume Order Button - only show if authenticated with drafts */}
              {isAuthenticated && drafts.length > 0 && !loadingDrafts && (
                <button
                  onClick={handleResumeClick}
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border-2 border-white/40 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/20 hover:border-white/60 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Resume Order {drafts.length > 1 && `(${drafts.length})`}
                </button>
              )}
              
              <div className="inline-flex items-center justify-center px-6 py-3.5 border-2 border-white/40 text-white rounded-full font-medium text-base">
                Minimum 24 pieces
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-white border-b border-surface-300">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-16"
          >
            <div className="text-center">
              <div className="text-4xl font-black text-primary-500">2,500+</div>
              <div className="text-charcoal-500 font-semibold text-sm">Orders Completed</div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-surface-300" />
            <div className="text-center">
              <div className="text-4xl font-black text-primary-500">4.9★</div>
              <div className="text-charcoal-500 font-semibold text-sm">Customer Rating</div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-surface-300" />
            <div className="text-center">
              <div className="text-4xl font-black text-primary-500">~14</div>
              <div className="text-charcoal-500 font-semibold text-sm">Day Turnaround</div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-surface-300" />
            <div className="text-center">
              <div className="text-4xl font-black text-primary-500">100%</div>
              <div className="text-charcoal-500 font-semibold text-sm">Satisfaction Guaranteed</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-bold mb-4">
              Simple Process
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
              How It Works
            </h2>
            <p className="text-xl text-charcoal-500 max-w-2xl mx-auto">
              Four simple steps to custom perfection
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { step: 1, title: "Choose Your Garment", desc: "Select from our curated collection of premium blanks", color: "primary", icon: "👕" },
              { step: 2, title: "Configure & Design", desc: "Choose sizes, quantities, colors, and print locations", color: "blue", icon: "⚙️" },
              { step: 3, title: "Upload Artwork", desc: "Upload your design or create one with our AI generator", color: "purple", icon: "🎨" },
              { step: 4, title: "Pay & Approve", desc: "Pay your deposit and we'll handle the rest", color: "green", icon: "✓" },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                variants={fadeInUp}
                className="relative"
              >
                {/* Connector line */}
                {index < 3 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-surface-300 to-transparent" />
                )}
                <div className={`bento-card h-full bg-gradient-to-br ${
                  item.color === 'primary' ? 'from-primary-50 to-primary-100 border-primary-200' :
                  item.color === 'blue' ? 'from-data-blue/10 to-data-blue/20 border-data-blue/30' :
                  item.color === 'purple' ? 'from-data-purple/10 to-data-purple/20 border-data-purple/30' :
                  'from-data-green/10 to-data-green/20 border-data-green/30'
                } border-2 hover:shadow-soft-lg transition-all duration-300`}>
                  <div className={`inline-flex items-center justify-center w-14 h-14 ${
                    item.color === 'primary' ? 'bg-primary-500' :
                    item.color === 'blue' ? 'bg-data-blue' :
                    item.color === 'purple' ? 'bg-data-purple' :
                    'bg-data-green'
                  } text-white rounded-bento text-2xl font-black mb-4`}>
                    {item.icon}
                  </div>
                  <div className="text-sm font-bold text-charcoal-400 mb-2">Step {item.step}</div>
                  <h3 className="text-xl font-black text-charcoal-700 mb-2">{item.title}</h3>
                  <p className="text-charcoal-500 font-medium">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Design Generator Spotlight - HIGH PROMINENCE */}
      <section id="ai-generator" className="py-20 md:py-28 bg-gradient-to-br from-charcoal-800 via-charcoal-900 to-black relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-3xl" />
        </div>
        
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 backdrop-blur-sm border border-violet-400/30 rounded-full text-sm font-bold text-violet-300 mb-6">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                Powered by AI
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-[1.1]">
                No Artwork?<br />
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  No Problem.
                </span>
              </h2>

              <p className="text-xl text-white/70 mb-8 leading-relaxed">
                Describe your idea in words and watch our AI create print-ready artwork in seconds. 
                Perfect for teams, events, and businesses without a designer on hand.
              </p>

              <ul className="space-y-4 mb-10">
                {[
                  "Generate unlimited design concepts",
                  "Optimized for screen printing",
                  "Edit, refine, and iterate instantly",
                  "Auto-vectorization included"
                ].map((feature, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-white/80"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              <Link
                href="/custom-shirts/configure"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-bento-lg font-black text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span>Try AI Design Generator</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </motion.div>

            {/* Right: Interactive Demo */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-bento-lg p-6 shadow-2xl">
                {/* Mock AI Interface */}
                <div className="bg-charcoal-900/80 rounded-bento p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-error-500" />
                    <div className="w-3 h-3 rounded-full bg-warning-500" />
                    <div className="w-3 h-3 rounded-full bg-success-500" />
                    <span className="ml-2 text-xs text-white/40 font-mono">ai-design-generator</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Describe your design idea..."
                      className="w-full bg-charcoal-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500/50"
                      value={aiExamples[activeExample].prompt}
                      readOnly
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Generated Design Preview */}
                <div className="aspect-square bg-gradient-to-br from-charcoal-800 to-charcoal-900 rounded-bento flex items-center justify-center relative overflow-hidden mb-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      key={activeExample}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-center"
                    >
                      <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border-2 border-dashed border-violet-400/50 flex items-center justify-center">
                        <svg className="w-12 h-12 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-white/60 text-sm font-medium">AI-Generated Design Preview</div>
                      <div className="text-violet-400 text-xs font-bold mt-1">{aiExamples[activeExample].style} Style</div>
                    </motion.div>
                  </div>
                  
                  {/* Sparkle effects */}
                  <motion.div 
                    className="absolute top-4 right-4 text-violet-400"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    ✦
                  </motion.div>
                  <motion.div 
                    className="absolute bottom-8 left-8 text-fuchsia-400 text-lg"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ✦
                  </motion.div>
                </div>

                {/* Example prompts */}
                <div className="flex flex-wrap gap-2">
                  {aiExamples.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveExample(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        activeExample === i 
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white' 
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {example.style}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Showcase - Bento Grid */}
      <section id="features" className="py-20 md:py-28 bg-gradient-to-b from-surface-200 via-white to-surface-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-bold mb-4">
              Powerful Features
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
              Everything You Need
            </h2>
            <p className="text-xl text-charcoal-500 max-w-2xl mx-auto">
              Professional tools to create the perfect custom shirts
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-12 gap-5 auto-rows-[minmax(180px,auto)]"
          >
            {/* AI Generator - Hero Card */}
            <motion.div 
              variants={scaleIn}
              className="col-span-12 lg:col-span-7 row-span-2 rounded-[2rem] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 text-white relative overflow-hidden group p-8 shadow-2xl"
            >
              {/* Animated background orbs */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div 
                  className="absolute -top-20 -left-20 w-60 h-60 bg-white/20 rounded-full blur-3xl"
                  animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div 
                  className="absolute -bottom-20 -right-20 w-80 h-80 bg-pink-400/30 rounded-full blur-3xl"
                  animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              
              {/* Grid pattern */}
              <div 
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
                  backgroundSize: '30px 30px'
                }}
              />
              
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold border border-white/20">
                    <motion.svg 
                      className="w-4 h-4" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                    </motion.svg>
                    AI-Powered
                  </div>
                  
                  {/* Floating sparkles */}
                  <div className="flex gap-2">
                    <motion.span 
                      className="text-2xl"
                      animate={{ y: [0, -8, 0], rotate: [0, 15, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >✨</motion.span>
                  </div>
                </div>
                
                <h3 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                  AI Design<br />Generator
                </h3>
                <p className="text-white/80 text-lg mb-8 max-w-sm leading-relaxed">
                  Turn your ideas into screen print-ready artwork. Just describe what you want.
                </p>
                
                {/* Interactive prompt demo */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20">
                  <div className="flex items-center gap-3 text-white/60 text-sm mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="font-medium">Try a prompt</span>
                  </div>
                  <motion.div 
                    className="text-white font-medium"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    "Vintage sunset with palm trees..."
                  </motion.div>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 group/stat hover:bg-white/20 transition-all">
                    <div className="text-4xl font-black mb-1 group-hover/stat:scale-110 transition-transform origin-left">∞</div>
                    <div className="text-sm text-white/70 font-semibold">Unlimited Designs</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 group/stat hover:bg-white/20 transition-all">
                    <div className="text-4xl font-black mb-1 group-hover/stat:scale-110 transition-transform origin-left">&lt;30s</div>
                    <div className="text-sm text-white/70 font-semibold">Generation Time</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Live Quote Engine - Tall Card */}
            <motion.div 
              variants={scaleIn}
              className="col-span-12 sm:col-span-6 lg:col-span-5 row-span-1 rounded-[2rem] bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-100 border-2 border-emerald-200/50 p-6 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Decorative chart visualization */}
              <div className="absolute right-4 bottom-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="text-emerald-600">
                  <path d="M10 70 L30 50 L50 55 L70 30 L90 35 L110 15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <circle cx="110" cy="15" r="6" fill="currentColor" />
                </svg>
              </div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 mb-5">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-charcoal-800 mb-2">Live Quote Engine</h3>
                <p className="text-charcoal-600 font-medium mb-4 leading-relaxed">Real-time pricing as you configure. No surprises.</p>
                <div className="inline-flex items-center gap-2 text-emerald-600 font-bold text-sm group-hover:gap-3 transition-all">
                  <span>See instant pricing</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Design Editor */}
            <motion.div 
              variants={scaleIn}
              className="col-span-12 sm:col-span-6 lg:col-span-5 row-span-1 rounded-[2rem] bg-gradient-to-br from-sky-50 via-blue-100 to-indigo-100 border-2 border-blue-200/50 p-6 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Mini design editor visualization */}
              <div className="absolute right-4 bottom-4 opacity-30 group-hover:opacity-50 transition-opacity">
                <div className="w-20 h-24 border-2 border-dashed border-blue-400 rounded-lg relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-400/50 rounded-lg" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
                </div>
              </div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-5">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-charcoal-800 mb-2">Design Editor</h3>
                <p className="text-charcoal-600 font-medium mb-4 leading-relaxed">Position, scale, and rotate your artwork perfectly.</p>
                <div className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm group-hover:gap-3 transition-all">
                  <span>Pixel-perfect control</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Auto-Vectorization - Wide Card */}
            <motion.div 
              variants={scaleIn}
              className="col-span-12 sm:col-span-6 lg:col-span-4 row-span-1 rounded-[2rem] bg-gradient-to-br from-violet-50 via-purple-100 to-fuchsia-100 border-2 border-purple-200/50 p-6 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* PNG to SVG visualization */}
              <div className="absolute right-4 bottom-4 opacity-30 group-hover:opacity-50 transition-opacity flex items-center gap-2">
                <div className="w-10 h-10 bg-purple-300 rounded-lg flex items-center justify-center text-xs font-bold text-purple-700">PNG</div>
                <motion.svg 
                  className="w-6 h-6 text-purple-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </motion.svg>
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-xs font-bold text-white">SVG</div>
              </div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-200 mb-5">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-charcoal-800 mb-2">Auto-Vectorization</h3>
                <p className="text-charcoal-600 font-medium mb-4 leading-relaxed">Any image to print-ready vector format.</p>
                <div className="inline-flex items-center gap-2 text-purple-600 font-bold text-sm group-hover:gap-3 transition-all">
                  <span>PNG → SVG magic</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Multi-Color Orders */}
            <motion.div 
              variants={scaleIn}
              className="col-span-12 sm:col-span-6 lg:col-span-4 row-span-1 rounded-[2rem] bg-gradient-to-br from-amber-50 via-orange-100 to-rose-100 border-2 border-orange-200/50 p-6 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Color swatch visualization */}
              <div className="absolute right-4 bottom-4 opacity-40 group-hover:opacity-60 transition-opacity flex gap-1">
                <div className="w-6 h-6 bg-charcoal-700 rounded-full shadow-sm" />
                <div className="w-6 h-6 bg-white border-2 border-gray-200 rounded-full shadow-sm" />
                <div className="w-6 h-6 bg-red-500 rounded-full shadow-sm" />
                <div className="w-6 h-6 bg-blue-500 rounded-full shadow-sm" />
              </div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 mb-5">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-charcoal-800 mb-2">Multi-Color Orders</h3>
                <p className="text-charcoal-600 font-medium mb-4 leading-relaxed">Mix shirt colors and sizes in one order.</p>
                <div className="inline-flex items-center gap-2 text-orange-600 font-bold text-sm group-hover:gap-3 transition-all">
                  <span>Flexible options</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Secure Payments - Accent Card */}
            <motion.div 
              variants={scaleIn}
              className="col-span-12 lg:col-span-4 row-span-1 rounded-[2rem] bg-gradient-to-br from-charcoal-800 to-charcoal-900 text-white p-6 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Stripe badge visualization */}
              <div className="absolute right-4 bottom-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <svg className="w-20 h-8" viewBox="0 0 80 32" fill="currentColor">
                  <rect x="5" y="8" width="12" height="16" rx="2" />
                  <rect x="22" y="8" width="12" height="16" rx="2" />
                  <rect x="39" y="8" width="12" height="16" rx="2" />
                  <rect x="56" y="8" width="12" height="16" rx="2" />
                </svg>
              </div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 mb-5">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black mb-2">Secure Payments</h3>
                <p className="text-white/70 font-medium mb-4 leading-relaxed">50% deposit to start. Pay balance before shipping.</p>
                <div className="inline-flex items-center gap-2 text-primary-400 font-bold text-sm group-hover:gap-3 transition-all">
                  <span>Powered by Stripe</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-bold mb-4">
              Why Us
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
              The My Swag Co Difference
            </h2>
            <p className="text-xl text-charcoal-500 max-w-2xl mx-auto">
              Professional quality meets modern convenience
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              { icon: "💰", title: "Transparent Pricing", desc: "See your exact cost as you build your order. No hidden fees, no surprises." },
              { icon: "⚡", title: "Fast Turnaround", desc: "Most orders ship in ~14 business days after artwork approval." },
              { icon: "💎", title: "Premium Quality", desc: "Top-tier garments and professional screen printing you can trust." },
              { icon: "🎨", title: "AI Design Help", desc: "No designer? No problem. Generate artwork with our AI tools." },
              { icon: "🔄", title: "Easy Revisions", desc: "Need changes? Our team works with you until it's perfect." },
              { icon: "🛡️", title: "Satisfaction Guaranteed", desc: "We stand behind our work with a 100% satisfaction guarantee." },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="bento-card hover:shadow-soft-lg transition-all duration-300 group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h3 className="text-xl font-black text-charcoal-700 mb-2">{item.title}</h3>
                <p className="text-charcoal-500 font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-bold mb-4">
              Our Customers
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
              Who We Serve
            </h2>
            <p className="text-xl text-charcoal-500 max-w-2xl mx-auto">
              From sports teams to Fortune 500 companies
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {[
              { icon: "🏆", label: "Sports Teams" },
              { icon: "🏢", label: "Corporate" },
              { icon: "👨‍👩‍👧‍👦", label: "Family Events" },
              { icon: "🎓", label: "Schools" },
              { icon: "❤️", label: "Nonprofits" },
              { icon: "🎸", label: "Bands & Artists" },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className="bento-card text-center py-8 hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="text-charcoal-700 font-bold text-sm">{item.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Transparency */}
      <section id="pricing" className="py-20 md:py-28 bg-gradient-to-br from-primary-500 to-primary-600 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px'
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-white/20 text-white rounded-full text-sm font-bold mb-4">
              Simple Pricing
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              Transparent Pricing
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              The more you order, the more you save. See exactly what you'll pay upfront.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {[
              { qty: "24-47", label: "Small Run", price: "Starting at $12/shirt", popular: false },
              { qty: "48-99", label: "Medium Run", price: "Starting at $10/shirt", popular: true },
              { qty: "100+", label: "Large Run", price: "Starting at $8/shirt", popular: false },
            ].map((tier, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className={`rounded-bento-lg p-6 text-center relative ${
                  tier.popular 
                    ? 'bg-white text-charcoal-700 shadow-2xl scale-105' 
                    : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-500 text-white text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}
                <div className={`text-4xl font-black mb-2 ${tier.popular ? 'text-primary-500' : ''}`}>{tier.qty}</div>
                <div className={`text-sm font-bold mb-4 ${tier.popular ? 'text-charcoal-500' : 'text-white/70'}`}>{tier.label}</div>
                <div className={`text-lg font-bold ${tier.popular ? 'text-charcoal-700' : 'text-white'}`}>{tier.price}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center mt-12"
          >
            <p className="text-white/70 text-sm mb-6">
              Final price depends on garment selection, print locations, and ink colors.
              <br />Get your exact quote in seconds with our live pricing tool.
            </p>
            <Link
              href="/custom-shirts/configure"
              className="inline-flex items-center justify-center bg-white text-primary-500 px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              Get Your Free Quote
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-bold mb-4">
              FAQ
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion.Root type="single" collapsible className="space-y-4">
              {[
                { q: "What's the minimum order quantity?", a: "Our minimum order is 24 pieces. This allows us to keep setup costs reasonable while still offering competitive per-piece pricing." },
                { q: "How long does production take?", a: "Most orders ship within ~14 business days after artwork approval. Rush orders may be available—contact us for expedited options." },
                { q: "What file formats do you accept?", a: "We accept PNG, JPG, PDF, AI, EPS, and SVG files. Don't have vector artwork? Our auto-vectorization tool can convert your raster images, or use our AI to generate designs from scratch." },
                { q: "What if I need design changes?", a: "No problem! After you submit your order, our team reviews your artwork. If any changes are needed, we'll work with you until it's perfect—before production begins." },
                { q: "How does payment work?", a: "We require a 50% deposit to start production. The remaining balance is due before shipping. We accept all major credit cards through our secure Stripe checkout." },
                { q: "Can I order multiple shirt colors?", a: "Absolutely! You can mix different garment colors in a single order and allocate sizes across each color however you like." },
              ].map((item, i) => (
                <Accordion.Item 
                  key={i} 
                  value={`item-${i}`}
                  className="bento-card overflow-hidden data-[state=open]:shadow-soft-lg transition-all"
                >
                  <Accordion.Trigger className="w-full flex items-center justify-between p-6 text-left group">
                    <span className="font-black text-charcoal-700 text-lg pr-4">{item.q}</span>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-100 group-data-[state=open]:bg-primary-100 flex items-center justify-center transition-colors">
                      <svg 
                        className="w-4 h-4 text-charcoal-500 group-data-[state=open]:text-primary-500 group-data-[state=open]:rotate-180 transition-all" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </Accordion.Trigger>
                  <Accordion.Content className="overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
                    <div className="px-6 pb-6 text-charcoal-500 font-medium leading-relaxed">
                      {item.a}
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </motion.div>
          </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-charcoal-800 via-charcoal-900 to-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pattern-dots" />
        
        <div className="relative max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">
              Ready to Create?
            </h2>
            <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              Start your custom order today. Premium quality, instant pricing, and our AI design tools at your fingertips.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/custom-shirts/configure"
                className="inline-flex items-center justify-center bg-primary-500 text-white px-10 py-5 rounded-bento-lg font-black text-lg shadow-lg hover:bg-primary-600 hover:shadow-xl hover:scale-[1.02] transition-all"
              >
              Start Your Order
              </Link>
              <div className="text-white/50 font-medium">
                Minimum 24 pieces • ~14 day turnaround
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-charcoal-900 text-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <Image 
                src="/logo.png" 
                alt="My Swag Co" 
                width={180} 
                height={54}
                className="h-10 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-white/60 font-medium max-w-sm mb-6">
                Professional screen printing made easy. Custom shirts designed and ordered online in minutes.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <span className="sr-only">Instagram</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-black text-lg mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="#how-it-works" className="text-white/60 hover:text-white font-medium transition-colors">How It Works</a></li>
                <li><a href="#ai-generator" className="text-white/60 hover:text-white font-medium transition-colors">AI Design Generator</a></li>
                <li><a href="#pricing" className="text-white/60 hover:text-white font-medium transition-colors">Pricing</a></li>
                <li><a href="#faq" className="text-white/60 hover:text-white font-medium transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-black text-lg mb-4">Contact</h4>
              <ul className="space-y-3 text-white/60 font-medium">
                <li>hello@myswagco.com</li>
                <li>(555) 123-4567</li>
                <li>Mon-Fri 9am-5pm EST</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm font-medium">
              &copy; 2025 My Swag Co. All rights reserved.
          </p>
          <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full text-sm font-semibold transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin Portal
          </Link>
        </div>
        </div>
      </footer>

      {/* Draft Selection Modal */}
      <AnimatePresence>
        {showDraftModal && drafts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm"
            onClick={() => setShowDraftModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative gradient header */}
              <div className="h-2 bg-gradient-to-r from-primary-500 via-violet-500 to-fuchsia-500" />
              
              {/* Close button */}
              <button
                onClick={() => setShowDraftModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-100 transition-colors z-10"
              >
                <svg className="w-5 h-5 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal Header */}
              <div className="p-6 border-b border-surface-200">
                <h2 className="text-2xl font-black text-charcoal-700 tracking-tight">
                  Resume Your Order
                </h2>
                <p className="text-charcoal-500 mt-1">
                  Select a saved draft to continue where you left off
                </p>
              </div>

              {/* Drafts List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                  {drafts.map((draft) => {
                    const isLoading = loadingDraftId === draft.id
                    const totalQuantity = Object.values(draft.color_size_quantities).reduce((total, sizeQty) => {
                      return total + Object.values(sizeQty).reduce((sum, qty) => sum + (qty || 0), 0)
                    }, 0)
                    
                    return (
                      <button
                        key={draft.id}
                        onClick={() => handleResumeDraft(draft)}
                        disabled={isLoading}
                        className="w-full text-left p-4 rounded-xl border-2 border-surface-200 hover:border-primary-300 hover:bg-primary-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-start gap-4">
                          {/* Thumbnail */}
                          {draft.garment?.thumbnail_url ? (
                            <div className="w-20 h-20 flex-shrink-0 bg-surface-100 rounded-lg overflow-hidden">
                              <img 
                                src={draft.garment.thumbnail_url} 
                                alt={draft.garment.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 flex-shrink-0 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center">
                              <svg className="w-10 h-10 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                              </svg>
                            </div>
                          )}

                          {/* Draft Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-charcoal-700 mb-1 group-hover:text-primary-600 transition-colors">
                              {draft.name || draft.garment?.name || 'Order Draft'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal-500">
                              {draft.garment && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  {draft.garment.brand} {draft.garment.name}
                                </span>
                              )}
                              {draft.selected_colors.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                  </svg>
                                  {draft.selected_colors.join(', ')}
                                </span>
                              )}
                              {totalQuantity > 0 && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                  </svg>
                                  {totalQuantity} items
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-charcoal-400 mt-2">
                              Last updated {new Date(draft.updated_at).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Loading or Arrow */}
                          <div className="flex-shrink-0 self-center">
                            {isLoading ? (
                              <svg className="w-6 h-6 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="w-6 h-6 text-charcoal-300 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-surface-200 bg-surface-50">
                <p className="text-sm text-charcoal-500 text-center">
                  Want to start fresh?{' '}
                  <Link 
                    href="/custom-shirts/configure"
                    onClick={() => setShowDraftModal(false)}
                    className="font-bold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Create a new order
                  </Link>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
