'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Garment, Campaign } from '@/types'

interface CartItem {
  garmentId: string
  garment: Garment
  color: string
  size: string
  quantity: number
  pricePerItem: number
}

interface CheckoutFormProps {
  items: CartItem[]
  campaign: Campaign
  onSubmit: (name: string, email: string) => Promise<void>
  onBack: () => void
  onRemoveItem: (index: number) => void
  onUpdateQuantity: (index: number, quantity: number) => void
  isSubmitting: boolean
  error: string | null
  isFree?: boolean // true when organizer_pays
}

export default function CheckoutForm({
  items,
  campaign,
  onSubmit,
  onBack,
  onRemoveItem,
  onUpdateQuantity,
  isSubmitting,
  error,
  isFree = false,
}: CheckoutFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [editingCart, setEditingCart] = useState(false)

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.pricePerItem * item.quantity, 0)

  const isValid = name.trim() && email.trim() && email.includes('@') && items.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isSubmitting) return
    await onSubmit(name, email)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/30"
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </motion.div>
        <h1 className="text-3xl font-black text-charcoal-800 mb-2">Checkout</h1>
        <p className="text-charcoal-500">Review your order and enter your details</p>
      </div>

      {/* Order summary card */}
      <div className="bg-white rounded-2xl shadow-xl border border-surface-200/50 overflow-hidden mb-6">
        <div className="p-4 sm:p-5 border-b border-surface-200 flex items-center justify-between bg-gradient-to-r from-surface-50 to-white">
          <h2 className="font-black text-charcoal-800 text-lg">Your Order</h2>
          <button
            onClick={() => setEditingCart(!editingCart)}
            className="text-sm font-bold text-teal-600 hover:text-teal-700 active:text-teal-800 transition-colors py-1.5 px-3 -mr-2 rounded-lg touch-manipulation"
          >
            {editingCart ? 'Done' : 'Edit'}
          </button>
        </div>

        <div className="divide-y divide-surface-100">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => {
              const colorImage = item.garment.color_images?.[item.color] || item.garment.thumbnail_url
              return (
                <motion.div
                  key={`${item.garmentId}-${item.color}-${item.size}-${index}`}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, x: -100 }}
                  className="p-4 sm:p-5 flex items-center gap-4"
                >
                  {/* Product image */}
                  <div className="w-18 h-18 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-surface-100 flex-shrink-0 relative" style={{ width: '4.5rem', height: '4.5rem' }}>
                    {colorImage ? (
                      <Image
                        src={colorImage}
                        alt={item.garment.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-surface-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-charcoal-700 truncate text-base">{item.garment.name}</h3>
                    <p className="text-sm text-charcoal-500">
                      {item.color} / {item.size}
                    </p>
                    
                    {editingCart ? (
                      <div className="flex items-center gap-2 mt-2.5">
                        <button
                          onClick={() => {
                            if (item.quantity === 1) {
                              onRemoveItem(index)
                            } else {
                              onUpdateQuantity(index, item.quantity - 1)
                            }
                          }}
                          className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg bg-surface-100 text-charcoal-600 font-bold hover:bg-surface-200 active:bg-surface-300 transition-colors flex items-center justify-center touch-manipulation text-lg sm:text-base"
                        >
                          −
                        </button>
                        <span className="text-base sm:text-sm font-bold text-charcoal-700 w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                          className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg bg-surface-100 text-charcoal-600 font-bold hover:bg-surface-200 active:bg-surface-300 transition-colors flex items-center justify-center touch-manipulation text-lg sm:text-base"
                        >
                          +
                        </button>
                        <button
                          onClick={() => onRemoveItem(index)}
                          className="ml-2 text-sm text-rose-500 hover:text-rose-600 active:text-rose-700 font-bold transition-colors py-1 touch-manipulation"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-charcoal-400 mt-1">Qty: {item.quantity}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    {isFree ? (
                      <p className="text-charcoal-400 line-through">
                        ${(item.pricePerItem * item.quantity).toFixed(2)}
                      </p>
                    ) : (
                      <>
                        <p className="font-black text-charcoal-800 text-lg sm:text-base">
                          ${(item.pricePerItem * item.quantity).toFixed(2)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-charcoal-400">
                            ${item.pricePerItem.toFixed(2)} each
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Total */}
        <div className={`p-4 sm:p-5 border-t border-surface-200 ${isFree ? 'bg-gradient-to-r from-emerald-50 to-teal-50' : 'bg-gradient-to-r from-teal-50 to-cyan-50'}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-charcoal-600">
              Total ({totalItems} {totalItems === 1 ? 'item' : 'items'})
            </span>
            {isFree ? (
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-charcoal-400 line-through">
                  ${totalPrice.toFixed(2)}
                </span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-black text-lg rounded-full">
                  Covered
                </span>
              </div>
            ) : (
              <span className="text-2xl font-black text-charcoal-800">
                ${totalPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl shadow-xl border border-surface-200/50 p-5 sm:p-6 mb-6">
          <h2 className="font-black text-charcoal-800 mb-4 text-lg">Your Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-charcoal-600 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full border-2 border-surface-200 rounded-xl px-4 py-3.5 sm:py-3 font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none text-base"
                required
                disabled={isSubmitting}
                autoComplete="name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-charcoal-600 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full border-2 border-surface-200 rounded-xl px-4 py-3.5 sm:py-3 font-medium text-charcoal-700 placeholder:text-charcoal-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none text-base"
                required
                disabled={isSubmitting}
                autoComplete="email"
                inputMode="email"
              />
              <p className="text-sm text-charcoal-400 mt-2">
                We'll send order updates to this email
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-3 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="px-5 sm:px-6 py-4 border-2 border-surface-300 rounded-xl font-bold text-charcoal-700 hover:bg-surface-50 active:bg-surface-100 transition-all disabled:opacity-50 touch-manipulation"
          >
            Back
          </button>
          <motion.button
            type="submit"
            disabled={!isValid || isSubmitting}
            whileTap={isValid && !isSubmitting ? { scale: 0.98 } : {}}
            className="flex-1 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-black rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation text-base sm:text-lg"
          >
            {isSubmitting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : campaign.payment_style === 'everyone_pays' ? (
              'Continue to Payment'
            ) : (
              'Place Order'
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  )
}

