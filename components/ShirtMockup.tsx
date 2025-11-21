import React from 'react'
import { PrintLocation } from '@/types'

interface ShirtMockupProps {
  printLocation: PrintLocation
  className?: string
}

export default function ShirtMockup({ printLocation, className = '' }: ShirtMockupProps) {
  const renderFrontView = () => (
    <svg viewBox="0 0 400 500" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Shirt outline - front view */}
      <path
        d="M 100 50 L 80 100 L 80 500 L 320 500 L 320 100 L 300 50 L 280 30 Q 270 20 260 20 L 250 20 Q 240 10 200 10 Q 160 10 150 20 L 140 20 Q 130 20 120 30 Z"
        fill="#f3f4f6"
        stroke="#d1d5db"
        strokeWidth="2"
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
      {/* Shirt outline - back view */}
      <path
        d="M 100 50 L 80 100 L 80 500 L 320 500 L 320 100 L 300 50 L 280 30 Q 270 20 260 20 L 240 20 Q 230 20 220 20 L 180 20 Q 170 20 160 20 L 140 20 Q 130 20 120 30 Z"
        fill="#f3f4f6"
        stroke="#d1d5db"
        strokeWidth="2"
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
      {/* Shirt outline - front view */}
      <path
        d="M 100 50 L 80 100 L 80 500 L 320 500 L 320 100 L 300 50 L 280 30 Q 270 20 260 20 L 250 20 Q 240 10 200 10 Q 160 10 150 20 L 140 20 Q 130 20 120 30 Z"
        fill="#f3f4f6"
        stroke="#d1d5db"
        strokeWidth="2"
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
      {/* Shirt outline - front view */}
      <path
        d="M 100 50 L 80 100 L 80 500 L 320 500 L 320 100 L 300 50 L 280 30 Q 270 20 260 20 L 250 20 Q 240 10 200 10 Q 160 10 150 20 L 140 20 Q 130 20 120 30 Z"
        fill="#f3f4f6"
        stroke="#d1d5db"
        strokeWidth="2"
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
      {/* Shirt outline - back view */}
      <path
        d="M 100 50 L 80 100 L 80 500 L 320 500 L 320 100 L 300 50 L 280 30 Q 270 20 260 20 L 240 20 Q 230 20 220 20 L 180 20 Q 170 20 160 20 L 140 20 Q 130 20 120 30 Z"
        fill="#f3f4f6"
        stroke="#d1d5db"
        strokeWidth="2"
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
}

