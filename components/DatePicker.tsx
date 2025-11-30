'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  minDate?: Date
  placeholder?: string
  className?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DatePicker({ value, onChange, minDate, placeholder = 'Select date', className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      return new Date(value)
    }
    return minDate || new Date()
  })
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get calendar days for current month view
  function getCalendarDays() {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    
    const days: { date: Date; isCurrentMonth: boolean; isDisabled: boolean }[] = []
    
    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false, isDisabled: true })
    }
    
    // Current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const isDisabled = minDate ? date < new Date(minDate.setHours(0, 0, 0, 0)) : false
      days.push({ date, isCurrentMonth: true, isDisabled })
    }
    
    // Next month padding
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false, isDisabled: true })
    }
    
    return days
  }

  function handleDateSelect(date: Date) {
    const formatted = date.toISOString().split('T')[0]
    onChange(formatted)
    setIsOpen(false)
  }

  function goToPrevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  function goToNextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const selectedDate = value ? new Date(value) : null
  const displayValue = selectedDate 
    ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const calendarDays = getCalendarDays()

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border-2 rounded-xl px-4 py-3 text-left font-bold transition-all outline-none flex items-center justify-between ${
          isOpen 
            ? 'border-teal-500 ring-4 ring-teal-100' 
            : value 
              ? 'border-surface-300 text-charcoal-700' 
              : 'border-surface-300 text-charcoal-400'
        } hover:border-teal-400`}
      >
        <span>{displayValue || placeholder}</span>
        <svg 
          className={`w-5 h-5 text-charcoal-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Calendar Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-72 bg-white rounded-xl shadow-xl border border-surface-200 p-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-charcoal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-sm font-black text-charcoal-700">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-charcoal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-charcoal-400 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map(({ date, isCurrentMonth, isDisabled }, idx) => {
                const isSelected = selectedDate && 
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear()
                
                const isToday = 
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear()

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleDateSelect(date)}
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all
                      ${isSelected 
                        ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md' 
                        : isDisabled
                          ? 'text-charcoal-200 cursor-not-allowed'
                          : isCurrentMonth
                            ? 'text-charcoal-700 hover:bg-teal-50 hover:text-teal-600'
                            : 'text-charcoal-300'
                      }
                      ${isToday && !isSelected ? 'ring-1 ring-teal-300 ring-inset' : ''}
                    `}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>

            {/* Quick actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-200">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className="text-xs font-bold text-charcoal-400 hover:text-charcoal-600 transition-colors"
              >
                Clear
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const nextWeek = new Date()
                    nextWeek.setDate(nextWeek.getDate() + 7)
                    handleDateSelect(nextWeek)
                  }}
                  className="px-2 py-1 text-[10px] font-bold text-teal-600 bg-teal-50 rounded hover:bg-teal-100 transition-colors"
                >
                  +1w
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const twoWeeks = new Date()
                    twoWeeks.setDate(twoWeeks.getDate() + 14)
                    handleDateSelect(twoWeeks)
                  }}
                  className="px-2 py-1 text-[10px] font-bold text-teal-600 bg-teal-50 rounded hover:bg-teal-100 transition-colors"
                >
                  +2w
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const oneMonth = new Date()
                    oneMonth.setMonth(oneMonth.getMonth() + 1)
                    handleDateSelect(oneMonth)
                  }}
                  className="px-2 py-1 text-[10px] font-bold text-teal-600 bg-teal-50 rounded hover:bg-teal-100 transition-colors"
                >
                  +1m
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

