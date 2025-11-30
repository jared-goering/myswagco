'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Garment } from '@/types'

interface CartItem {
  garmentId: string
  garment: Garment
  color: string
  size: string
  quantity: number
  pricePerItem: number
}

interface CartWidgetProps {
  items: CartItem[]
  onRemoveItem: (index: number) => void
  onUpdateQuantity: (index: number, quantity: number) => void
  onCheckout: () => void
  isFree?: boolean // true when organizer_pays
}

export default function CartWidget({
  items,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
  isFree = false,
}: CartWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.pricePerItem * item.quantity, 0)

  if (items.length === 0) {
    return null
  }

  return (
    <>
      {/* Overlay when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop floating widget - bottom right */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-full right-0 mb-3 w-96 bg-white rounded-2xl shadow-2xl border border-surface-200 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-surface-200 bg-gradient-to-r from-teal-50 to-cyan-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-charcoal-800 text-lg">Your Bag</h3>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-charcoal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="max-h-80 overflow-y-auto p-4 space-y-3">
                {items.map((item, index) => (
                  <CartItemRow
                    key={`${item.garmentId}-${item.color}-${item.size}-${index}`}
                    item={item}
                    onRemove={() => onRemoveItem(index)}
                    onUpdateQuantity={(qty) => onUpdateQuantity(index, qty)}
                    isFree={isFree}
                  />
                ))}
              </div>

              {/* Footer with total */}
              <div className="p-4 border-t border-surface-200 bg-surface-50">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-charcoal-600">Total ({totalItems} items)</span>
                  {isFree ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-charcoal-400 line-through">${totalPrice.toFixed(2)}</span>
                      <span className="text-xl font-black text-emerald-600">Free</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-black text-charcoal-800">${totalPrice.toFixed(2)}</span>
                  )}
                </div>
                <button
                  onClick={onCheckout}
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  {isFree ? 'Continue' : 'Checkout'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating button */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-charcoal-800 to-charcoal-900 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-shadow"
        >
          {/* Bag icon */}
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {/* Badge */}
            <span className={`absolute -top-2 -right-2 w-5 h-5 text-white text-xs font-black rounded-full flex items-center justify-center ${isFree ? 'bg-emerald-500' : 'bg-teal-500'}`}>
              {totalItems}
            </span>
          </div>

          {/* Total */}
          {isFree ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-white/50 line-through text-base">${totalPrice.toFixed(2)}</span>
              <span className="font-black text-emerald-400">Free</span>
            </div>
          ) : (
            <span className="font-black text-lg">${totalPrice.toFixed(2)}</span>
          )}

          {/* Expand icon */}
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="w-4 h-4 text-white/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </motion.svg>
        </motion.button>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl shadow-2xl border-t border-surface-200 max-h-[80vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-surface-300 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="px-5 pb-4 pt-2 border-b border-surface-200 flex items-center justify-between">
                <h3 className="font-black text-charcoal-800 text-xl">Your Bag ({totalItems})</h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2.5 hover:bg-surface-100 active:bg-surface-200 rounded-xl transition-colors touch-manipulation"
                >
                  <svg className="w-6 h-6 text-charcoal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
                {items.map((item, index) => (
                  <CartItemRow
                    key={`${item.garmentId}-${item.color}-${item.size}-${index}`}
                    item={item}
                    onRemove={() => onRemoveItem(index)}
                    onUpdateQuantity={(qty) => onUpdateQuantity(index, qty)}
                    isMobile={true}
                    isFree={isFree}
                  />
                ))}
              </div>

              {/* Footer with safe area */}
              <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-surface-200 bg-surface-50">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-charcoal-600">Total</span>
                  {isFree ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-charcoal-400 line-through">${totalPrice.toFixed(2)}</span>
                      <span className="text-xl font-black text-emerald-600">Free</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-black text-charcoal-800">${totalPrice.toFixed(2)}</span>
                  )}
                </div>
                <button
                  onClick={onCheckout}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-black rounded-xl transition-all shadow-lg active:scale-[0.98] touch-manipulation"
                >
                  {isFree ? 'Continue' : 'Checkout'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed bar with safe area */}
        {!isExpanded && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-gradient-to-r from-charcoal-800 to-charcoal-900 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl"
          >
            <div className="flex items-center gap-3 max-w-lg mx-auto">
              {/* Item thumbnails */}
              <button
                onClick={() => setIsExpanded(true)}
                className="flex -space-x-2 touch-manipulation"
              >
                {items.slice(0, 3).map((item, idx) => {
                  const colorImage = item.garment.color_images?.[item.color] || item.garment.thumbnail_url
                  return (
                    <div
                      key={idx}
                      className="w-11 h-11 rounded-xl overflow-hidden bg-white/10 border-2 border-charcoal-800 flex-shrink-0"
                      style={{ zIndex: 3 - idx }}
                    >
                      {colorImage ? (
                        <Image src={colorImage} alt={item.garment.name} width={44} height={44} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-white/10" />
                      )}
                    </div>
                  )
                })}
                {items.length > 3 && (
                  <div className="w-11 h-11 rounded-xl bg-teal-500 border-2 border-charcoal-800 flex items-center justify-center text-white text-xs font-black">
                    +{items.length - 3}
                  </div>
                )}
              </button>

              {/* Info - tappable to expand */}
              <button
                onClick={() => setIsExpanded(true)}
                className="flex-1 min-w-0 text-left touch-manipulation"
              >
                <p className="text-white font-black text-base">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </p>
                {isFree ? (
                  <p className="text-sm font-medium flex items-center gap-2">
                    <span className="text-white/50 line-through">${totalPrice.toFixed(2)}</span>
                    <span className="text-emerald-400 font-bold">Covered</span>
                  </p>
                ) : (
                  <p className="text-white/60 text-sm font-medium">
                    ${totalPrice.toFixed(2)} · Tap to view
                  </p>
                )}
              </button>

              {/* Checkout button */}
              <motion.button
                onClick={onCheckout}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-black text-sm shadow-lg shadow-teal-500/20 touch-manipulation"
              >
                {isFree ? 'Continue' : 'Checkout'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </>
  )
}

// Individual cart item row
function CartItemRow({
  item,
  onRemove,
  onUpdateQuantity,
  isMobile = false,
  isFree = false,
}: {
  item: CartItem
  onRemove: () => void
  onUpdateQuantity: (qty: number) => void
  isMobile?: boolean
  isFree?: boolean
}) {
  const colorImage = item.garment.color_images?.[item.color] || item.garment.thumbnail_url

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-center gap-3 p-3 bg-surface-50 rounded-xl ${isMobile ? 'p-4' : ''}`}
    >
      {/* Thumbnail */}
      <div className={`rounded-xl overflow-hidden bg-surface-100 flex-shrink-0 relative ${isMobile ? 'w-20 h-20' : 'w-16 h-16'}`}>
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

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-bold text-charcoal-700 truncate ${isMobile ? 'text-base' : 'text-sm'}`}>
          {item.garment.name}
        </h4>
        <p className={`text-charcoal-500 ${isMobile ? 'text-sm' : 'text-xs'}`}>
          {item.color} / {item.size}
        </p>
        <div className={`flex items-center gap-2 ${isMobile ? 'mt-2.5' : 'mt-1.5'}`}>
          <button
            onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
            className={`rounded-lg bg-surface-200 text-charcoal-600 font-bold hover:bg-surface-300 active:bg-surface-400 transition-colors flex items-center justify-center touch-manipulation ${
              isMobile ? 'w-9 h-9 text-lg' : 'w-6 h-6 text-sm'
            }`}
          >
            −
          </button>
          <span className={`font-bold text-charcoal-700 w-6 text-center ${isMobile ? 'text-base' : 'text-sm'}`}>
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.quantity + 1)}
            className={`rounded-lg bg-surface-200 text-charcoal-600 font-bold hover:bg-surface-300 active:bg-surface-400 transition-colors flex items-center justify-center touch-manipulation ${
              isMobile ? 'w-9 h-9 text-lg' : 'w-6 h-6 text-sm'
            }`}
          >
            +
          </button>
        </div>
      </div>

      {/* Price & remove */}
      <div className="text-right flex-shrink-0">
        {isFree ? (
          <p className={`${isMobile ? 'text-base' : 'text-sm'}`}>
            <span className="text-charcoal-400 line-through">${(item.pricePerItem * item.quantity).toFixed(2)}</span>
          </p>
        ) : (
          <p className={`font-black text-charcoal-800 ${isMobile ? 'text-lg' : ''}`}>
            ${(item.pricePerItem * item.quantity).toFixed(2)}
          </p>
        )}
        <button
          onClick={onRemove}
          className={`text-rose-500 hover:text-rose-600 active:text-rose-700 font-bold mt-1 transition-colors touch-manipulation ${
            isMobile ? 'text-sm py-1' : 'text-xs'
          }`}
        >
          Remove
        </button>
      </div>
    </motion.div>
  )
}

