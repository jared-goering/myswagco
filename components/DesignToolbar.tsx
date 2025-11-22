'use client'

import React from 'react'
import { motion } from 'framer-motion'
import * as Tooltip from '@radix-ui/react-tooltip'

interface DesignToolbarProps {
  onCenter: () => void
  onFit: () => void
  onReset: () => void
  onRotate: (angle: number) => void
  onFlipH: () => void
  onFlipV: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

interface ToolButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  shortcut?: string
}

function ToolButton({ icon, label, onClick, disabled = false, shortcut }: ToolButtonProps) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.button
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            onClick={onClick}
            disabled={disabled}
            className={`
              p-2.5 rounded-md transition-all duration-200
              ${disabled 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white hover:bg-primary-50 text-gray-700 hover:text-primary-700 shadow-sm hover:shadow-md'
              }
            `}
            aria-label={label}
          >
            {icon}
          </motion.button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="tooltip z-50 select-none animate-fade-in"
            sideOffset={5}
          >
            <div className="text-center">
              <div>{label}</div>
              {shortcut && (
                <div className="text-[10px] opacity-75 mt-0.5">{shortcut}</div>
              )}
            </div>
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

export default function DesignToolbar({
  onCenter,
  onFit,
  onReset,
  onRotate,
  onFlipH,
  onFlipV,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: DesignToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-1 p-2 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200"
    >
      {/* Undo/Redo */}
      {(onUndo || onRedo) && (
        <>
          <ToolButton
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            }
            label="Undo"
            onClick={onUndo || (() => {})}
            disabled={!canUndo}
            shortcut="⌘Z"
          />
          <ToolButton
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            }
            label="Redo"
            onClick={onRedo || (() => {})}
            disabled={!canRedo}
            shortcut="⌘⇧Z"
          />
          <div className="w-px h-6 bg-gray-300 mx-1" />
        </>
      )}

      {/* Quick Actions */}
      <ToolButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        }
        label="Center Design"
        onClick={onCenter}
      />
      <ToolButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        }
        label="Fit to Print Area"
        onClick={onFit}
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Rotation */}
      <ToolButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }
        label="Rotate 90° Left"
        onClick={() => onRotate(-90)}
      />
      <ToolButton
        icon={
          <svg className="w-5 h-5 transform scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }
        label="Rotate 90° Right"
        onClick={() => onRotate(90)}
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Flip */}
      <ToolButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        }
        label="Flip Horizontal"
        onClick={onFlipH}
      />
      <ToolButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        }
        label="Flip Vertical"
        onClick={onFlipV}
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Reset */}
      <ToolButton
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }
        label="Reset Position"
        onClick={onReset}
      />
    </motion.div>
  )
}

