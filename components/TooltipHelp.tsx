'use client'

import React from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'

interface TooltipHelpProps {
  content: string | React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
  className?: string
}

export default function TooltipHelp({ 
  content, 
  children, 
  side = 'top',
  delayDuration = 200,
  className = ''
}: TooltipHelpProps) {
  return (
    <Tooltip.Provider delayDuration={delayDuration}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className={`inline-flex items-center ${className}`}>
            {children}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            className="z-50 max-w-xs px-3 py-2 text-sm font-semibold text-white bg-charcoal-800 rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
          >
            {content}
            <Tooltip.Arrow className="fill-charcoal-800" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

