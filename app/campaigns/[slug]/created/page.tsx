'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Campaign } from '@/types'

export default function CampaignCreatedPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  
  // Fetch campaign data
  useEffect(() => {
    async function fetchCampaign() {
      try {
        const response = await fetch(`/api/campaigns/${slug}`)
        if (response.ok) {
          const data = await response.json()
          setCampaign(data)
        }
      } catch (error) {
        console.error('Error fetching campaign:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCampaign()
  }, [slug])
  
  const campaignUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/c/${slug}`
    : `/c/${slug}`
  
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(campaignUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }
  
  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-charcoal-700 mb-4">Campaign not found</h1>
          <Link href="/" className="text-teal-600 font-bold hover:underline">
            Go home
          </Link>
        </div>
      </div>
    )
  }
  
  const formattedDeadline = new Date(campaign.deadline).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] via-[#f2f4f7] to-[#eef0f4]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-surface-200 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="My Swag Co" 
              width={150} 
              height={45}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <Link
            href="/account/campaigns"
            className="text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
          >
            My Campaigns
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl"
        >
          <motion.svg
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </motion.svg>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-black text-charcoal-700 mb-4 tracking-tight">
            Your Group Campaign is live! 🎉
          </h1>
          <p className="text-xl text-charcoal-500">
            Share this link with your group so they can order:
          </p>
        </motion.div>

        {/* Shareable Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-soft border border-surface-200/50 p-6 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="flex-1 bg-surface-100 rounded-xl px-4 py-3 font-mono text-charcoal-700 text-sm overflow-x-auto">
              {campaignUrl}
            </div>
            <button
              onClick={copyLink}
              className={`px-6 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Campaign Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 p-6 mb-8"
        >
          <h2 className="text-lg font-black text-charcoal-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Campaign Overview
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-charcoal-500 font-medium">Name</span>
              <span className="font-bold text-charcoal-700">{campaign.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-charcoal-500 font-medium">Deadline</span>
              <span className="font-bold text-charcoal-700">{formattedDeadline}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-charcoal-500 font-medium">Payment</span>
              <span className="font-bold text-charcoal-700">
                {campaign.payment_style === 'organizer_pays' ? 'Organizer pays' : 'Everyone pays for themselves'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-charcoal-500 font-medium">Orders placed so far</span>
              <span className="font-bold text-charcoal-700">{campaign.order_count || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href={`/c/${slug}`}
            className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-surface-300 rounded-xl font-bold text-charcoal-700 hover:bg-surface-50 hover:border-surface-400 transition-all text-center"
          >
            View Campaign Page
          </Link>
          <Link
            href={`/account/campaigns/${slug}`}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:from-teal-600 hover:to-cyan-600 shadow-lg transition-all text-center"
          >
            Go to Organizer Dashboard
          </Link>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 p-6 bg-white rounded-2xl shadow-soft border border-surface-200/50"
        >
          <h3 className="font-bold text-charcoal-700 mb-4">What's next?</h3>
          <ul className="space-y-3 text-charcoal-600">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm flex-shrink-0">1</span>
              <span>Share the campaign link with your group via email, text, or social media</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm flex-shrink-0">2</span>
              <span>Each person visits the link and picks their size</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm flex-shrink-0">3</span>
              <span>Track orders on your dashboard until the deadline</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm flex-shrink-0">4</span>
              <span>We'll batch everything into one production run and ship together</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}

