'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'

interface ArtworkGalleryProps {
  isOpen: boolean
  onClose: () => void
}

const examples = [
  {
    title: 'Center Aligned Logo',
    description: 'Clean and professional - center your logo for maximum impact',
    image: '/examples/centered-logo.jpg',
    tips: ['Keep logo centered', 'Leave breathing room', 'Consider shirt color contrast']
  },
  {
    title: 'Full Chest Design',
    description: 'Bold statement piece that fills the print area effectively',
    image: '/examples/full-chest.jpg',
    tips: ['Use full print area', 'Maintain safe margins', 'High resolution required']
  },
  {
    title: 'Text-Based Design',
    description: 'Typography-focused designs work great for events and teams',
    image: '/examples/text-design.jpg',
    tips: ['Use readable fonts', 'Consider reading distance', 'Bold works better than thin']
  },
  {
    title: 'Small Chest Logo',
    description: 'Subtle branding on the chest area for a professional look',
    image: '/examples/chest-logo.jpg',
    tips: ['Keep it small (3-4 inches)', 'Place on left or right chest', 'Works great for corporate']
  },
]

export default function ArtworkGallery({ isOpen, onClose }: ArtworkGalleryProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25 }}
                className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
              >
                <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl pointer-events-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <Dialog.Title className="text-2xl font-bold text-gray-900">
                        Design Examples
                      </Dialog.Title>
                      <Dialog.Description className="text-gray-600 mt-1">
                        Get inspired by these well-positioned designs
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                        aria-label="Close"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {examples.map((example, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group card-hover overflow-hidden border border-gray-200 rounded-lg"
                      >
                        {/* Placeholder for example image */}
                        <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <div className="text-center p-8">
                            <svg className="w-16 h-16 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm text-gray-500 font-medium">{example.title}</p>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">{example.title}</h3>
                          <p className="text-sm text-gray-600 mb-3">{example.description}</p>
                          
                          <div className="space-y-1.5">
                            {example.tips.map((tip, tipIndex) => (
                              <div key={tipIndex} className="flex items-start gap-2 text-xs text-gray-600">
                                <svg className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>{tip}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* General Tips */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6 p-6 bg-primary-50 border border-primary-200 rounded-lg"
                  >
                    <h3 className="font-semibold text-primary-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      General Best Practices
                    </h3>
                    <ul className="space-y-2 text-sm text-primary-900">
                      <li className="flex items-start gap-2">
                        <span className="text-primary-600">•</span>
                        <span>Use high-resolution artwork (300 DPI minimum for best results)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-600">•</span>
                        <span>Vector files (AI, EPS, SVG) provide the sharpest prints</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-600">•</span>
                        <span>Keep important elements within the safe area (0.5&quot; from edges)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-600">•</span>
                        <span>Consider shirt color when choosing your design colors</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-600">•</span>
                        <span>Test positioning by viewing your design at actual size</span>
                      </li>
                    </ul>
                  </motion.div>
                </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
