'use client'

import React, { useState } from 'react'
import { PrintLocation } from '@/types'
import { motion } from 'framer-motion'

interface ShirtMockupProps {
  printLocation: PrintLocation
  className?: string
  showColorPicker?: boolean
}

export default function ShirtMockup({ printLocation, className = '', showColorPicker = false }: ShirtMockupProps) {
  const [shirtColor, setShirtColor] = useState('#f3f4f6')

  const colors = [
    { name: 'Gray', value: '#f3f4f6' },
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#1f2937' },
    { name: 'Navy', value: '#1e3a8a' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Green', value: '#16a34a' },
  ]
  const renderFrontView = () => (
    <svg viewBox="0 0 400 500" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <defs>
        <filter id="softShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
          <feOffset dx="0" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Shirt outline - front view */}
      <path
        d="M 100 50 L 80 100 L 80 500 L 320 500 L 320 100 L 300 50 L 280 30 Q 270 20 260 20 L 250 20 Q 240 10 200 10 Q 160 10 150 20 L 140 20 Q 130 20 120 30 Z"
        fill={shirtColor}
        stroke="#d1d5db"
        strokeWidth="2"
        filter="url(#softShadow)"
      />
      
      {/* Neck opening */}
      <ellipse cx="200" cy="50" rx="40" ry="30" fill="white" stroke="#d1d5db" strokeWidth="2" />
      
      {/* Print area boundary */}
      <rect
        x="125"
        y="120"
        width="150"
        height="180"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.5"
      />
      
      {/* Print area label */}
      <text x="200" y="315" textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="Arial">
        Front Print Area
      </text>
      <text x="200" y="330" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="Arial">
        12" x 14"
      </text>
    </svg>
  )

  const renderBackView = () => (
    <svg viewBox="0 0 400 500" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <defs>
        <filter id="softShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
          <feOffset dx="0" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Shirt outline - back view */}
      <path
        d="M 100 50 L 80 100 L 80 500 L 320 500 L 320 100 L 300 50 L 280 30 Q 270 20 260 20 L 240 20 Q 230 20 220 20 L 180 20 Q 170 20 160 20 L 140 20 Q 130 20 120 30 Z"
        fill={shirtColor}
        stroke="#d1d5db"
        strokeWidth="2"
        filter="url(#softShadow)"
      />
      
      {/* Back neck */}
      <path d="M 160 20 Q 180 30 200 30 Q 220 30 240 20" fill="white" stroke="#d1d5db" strokeWidth="2" />
      
      {/* Print area boundary */}
      <rect
        x="125"
        y="80"
        width="150"
        height="180"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.5"
      />
      
      {/* Print area label */}
      <text x="200" y="275" textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="Arial">
        Back Print Area
      </text>
      <text x="200" y="290" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="Arial">
        12" x 14"
      </text>
    </svg>
  )

  const renderLeftChestView = () => (
    <svg viewBox="0 0 400 500" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <defs>
        <filter id="softShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
          <feOffset dx="0" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Shirt outline - front view */}
      <path
        d="M 100 50 L 80 100 L 80 500 L 320 500 L 320 100 L 300 50 L 280 30 Q 270 20 260 20 L 250 20 Q 240 10 200 10 Q 160 10 150 20 L 140 20 Q 130 20 120 30 Z"
        fill={shirtColor}
        stroke="#d1d5db"
        strokeWidth="2"
        filter="url(#softShadow)"
      />
      
      {/* Neck opening */}
      <ellipse cx="200" cy="50" rx="40" ry="30" fill="white" stroke="#d1d5db" strokeWidth="2" />
      
      {/* Print area boundary - left chest */}
      <rect
        x="230"
        y="120"
        width="50"
        height="50"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.5"
      />
      
      {/* Print area label */}
      <text x="255" y="200" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="Arial">
        Left Chest
      </text>
      <text x="255" y="212" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="Arial">
        4" x 4"
      </text>
    </svg>
  )

  const renderRightChestView = () => (
    <svg viewBox="0 0 400 500" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <defs>
        <filter id="softShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
          <feOffset dx="0" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Shirt outline - front view */}
      <path
        d="M 100 50 L 80 100 L 80 500 L 320 500 L 320 100 L 300 50 L 280 30 Q 270 20 260 20 L 250 20 Q 240 10 200 10 Q 160 10 150 20 L 140 20 Q 130 20 120 30 Z"
        fill={shirtColor}
        stroke="#d1d5db"
        strokeWidth="2"
        filter="url(#softShadow)"
      />
      
      {/* Neck opening */}
      <ellipse cx="200" cy="50" rx="40" ry="30" fill="white" stroke="#d1d5db" strokeWidth="2" />
      
      {/* Print area boundary - right chest */}
      <rect
        x="120"
        y="120"
        width="50"
        height="50"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.5"
      />
      
      {/* Print area label */}
      <text x="145" y="200" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="Arial">
        Right Chest
      </text>
      <text x="145" y="212" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="Arial">
        4" x 4"
      </text>
    </svg>
  )

  const renderFullBackView = () => (
    <svg viewBox="0 0 400 500" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <defs>
        <filter id="softShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
          <feOffset dx="0" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Shirt outline - back view */}
      <path
        d="M 100 50 L 80 100 L 80 500 L 320 500 L 320 100 L 300 50 L 280 30 Q 270 20 260 20 L 240 20 Q 230 20 220 20 L 180 20 Q 170 20 160 20 L 140 20 Q 130 20 120 30 Z"
        fill={shirtColor}
        stroke="#d1d5db"
        strokeWidth="2"
        filter="url(#softShadow)"
      />
      
      {/* Back neck */}
      <path d="M 160 20 Q 180 30 200 30 Q 220 30 240 20" fill="white" stroke="#d1d5db" strokeWidth="2" />
      
      {/* Print area boundary - full back */}
      <rect
        x="110"
        y="80"
        width="180"
        height="240"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.5"
      />
      
      {/* Print area label */}
      <text x="200" y="335" textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="Arial">
        Full Back Print Area
      </text>
      <text x="200" y="350" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="Arial">
        14" x 18"
      </text>
    </svg>
  )

  const mockupView = (() => {
    switch (printLocation) {
      case 'front':
        return renderFrontView()
      case 'back':
        return renderBackView()
      case 'left_chest':
        return renderLeftChestView()
      case 'right_chest':
        return renderRightChestView()
      case 'full_back':
        return renderFullBackView()
      default:
        return renderFrontView()
    }
  })()

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {mockupView}
      </motion.div>

      {/* Color Picker */}
      {showColorPicker && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 p-3"
        >
          <div className="text-xs font-semibold text-gray-700 mb-2 text-center">Shirt Color</div>
          <div className="flex gap-2">
            {colors.map((color) => (
              <motion.button
                key={color.value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShirtColor(color.value)}
                className={`
                  w-8 h-8 rounded-full border-2 transition-all
                  ${shirtColor === color.value ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-300 hover:border-gray-400'}
                `}
                style={{ backgroundColor: color.value }}
                title={color.name}
                aria-label={`Select ${color.name} color`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

