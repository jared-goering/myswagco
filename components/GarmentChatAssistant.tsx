'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Garment } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  mentionedGarmentIds?: string[]
}

interface GarmentChatAssistantProps {
  isOpen: boolean
  onClose: () => void
  garments: Garment[]
  onAddGarment?: (garmentId: string) => void
  selectedGarmentIds?: string[]
}

const SUGGESTED_QUESTIONS = [
  "Which shirt is softest and most comfortable?",
  "What's best for a corporate event?",
  "Compare Comfort Colors vs BELLA+CANVAS",
  "What's good for outdoor activities?",
  "Which has the most color options?",
  "Best value for bulk orders?",
]

// Simple markdown renderer for chat messages
function renderMarkdown(text: string): React.ReactNode {
  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/)
  
  return paragraphs.map((paragraph, pIndex) => {
    // Check if it's a list
    const lines = paragraph.split('\n')
    const isList = lines.every(line => /^[-*•]\s/.test(line.trim()) || line.trim() === '')
    
    if (isList && lines.some(line => /^[-*•]\s/.test(line.trim()))) {
      const listItems = lines.filter(line => /^[-*•]\s/.test(line.trim()))
      return (
        <ul key={pIndex} className="list-disc list-inside space-y-1 my-2">
          {listItems.map((item, iIndex) => (
            <li key={iIndex} className="text-sm">
              {renderInlineMarkdown(item.replace(/^[-*•]\s/, ''))}
            </li>
          ))}
        </ul>
      )
    }
    
    // Check for numbered list
    const isNumberedList = lines.every(line => /^\d+[.)]\s/.test(line.trim()) || line.trim() === '')
    if (isNumberedList && lines.some(line => /^\d+[.)]\s/.test(line.trim()))) {
      const listItems = lines.filter(line => /^\d+[.)]\s/.test(line.trim()))
      return (
        <ol key={pIndex} className="list-decimal list-inside space-y-1 my-2">
          {listItems.map((item, iIndex) => (
            <li key={iIndex} className="text-sm">
              {renderInlineMarkdown(item.replace(/^\d+[.)]\s/, ''))}
            </li>
          ))}
        </ol>
      )
    }
    
    // Regular paragraph with line breaks
    return (
      <p key={pIndex} className={pIndex > 0 ? 'mt-3' : ''}>
        {lines.map((line, lIndex) => (
          <span key={lIndex}>
            {renderInlineMarkdown(line)}
            {lIndex < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    )
  })
}

// Render inline markdown (bold, italic)
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0
  
  while (remaining.length > 0) {
    // Check for bold (**text** or __text__)
    const boldMatch = remaining.match(/^(.*?)(\*\*|__)(.+?)\2(.*)$/s)
    if (boldMatch) {
      if (boldMatch[1]) {
        parts.push(<span key={key++}>{renderInlineMarkdown(boldMatch[1])}</span>)
      }
      parts.push(<strong key={key++} className="font-bold text-emerald-300">{boldMatch[3]}</strong>)
      remaining = boldMatch[4]
      continue
    }
    
    // Check for italic (*text* or _text_) - but not inside bold
    const italicMatch = remaining.match(/^(.*?)(?<!\*)(\*|_)(?!\*)(.+?)\2(?!\*)(.*)$/s)
    if (italicMatch) {
      if (italicMatch[1]) {
        parts.push(<span key={key++}>{italicMatch[1]}</span>)
      }
      parts.push(<em key={key++} className="italic text-white/90">{italicMatch[3]}</em>)
      remaining = italicMatch[4]
      continue
    }
    
    // No more markdown, add remaining text
    parts.push(<span key={key++}>{remaining}</span>)
    break
  }
  
  return parts.length === 1 ? parts[0] : <>{parts}</>
}

export default function GarmentChatAssistant({ isOpen, onClose, garments, onAddGarment, selectedGarmentIds = [] }: GarmentChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set())
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Prepare garment context (simplified for API)
      const garmentContext = garments.map(g => ({
        id: g.id,
        name: g.name,
        brand: g.brand,
        description: g.description,
        category: g.category,
        base_cost: g.base_cost,
        available_colors: g.available_colors,
        size_range: g.size_range,
      }))

      // Get conversation history (last 10 messages for context)
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/chat/garments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          history,
          garments: garmentContext,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
        mentionedGarmentIds: data.mentionedGarmentIds || [],
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  const handleClose = () => {
    setMessages([])
    setInput('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl h-[85vh] max-h-[700px] overflow-hidden bg-gradient-to-b from-charcoal-800 via-charcoal-850 to-charcoal-900 rounded-2xl shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 id="chat-title" className="text-lg font-black text-white tracking-tight">Style Assistant</h2>
                <p className="text-xs text-white/50 font-medium">Ask me anything about our garments</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5 text-white/60 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                {/* Welcome illustration */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 12 L12 16 L12 24 L18 24 L18 52 L46 52 L46 24 L52 24 L52 16 L44 12" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20 12 C20 12 24 20 32 20 C40 20 44 12 44 12" strokeLinecap="round" />
                    </svg>
                  </div>
                  <motion.div 
                    className="absolute -top-1 -right-1"
                    animate={{ scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </motion.div>
                </div>

                <h3 className="text-white font-bold text-lg mb-2">How can I help you today?</h3>
                <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto">
                  I can help you find the perfect garment for your project. Ask about fabric quality, fit, colors, or get personalized recommendations!
                </p>

                {/* Suggested Questions */}
                <div className="space-y-2">
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Try asking:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTED_QUESTIONS.map((question, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleSuggestedQuestion(question)}
                        disabled={isLoading}
                        className="px-3 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {question}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                {messages.map((message, index) => {
                  // Get mentioned garments for this message
                  const mentionedGarments = message.mentionedGarmentIds
                    ?.map(id => garments.find(g => g.id === id))
                    .filter((g): g is Garment => g !== undefined) || []
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index === messages.length - 1 ? 0 : 0 }}
                      className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary-500 text-white rounded-br-md'
                            : 'bg-white/10 text-white rounded-bl-md'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <span className="text-xs font-bold text-white/60">Style Assistant</span>
                          </div>
                        )}
                        <div className="text-sm leading-relaxed">
                          {message.role === 'assistant' ? renderMarkdown(message.content) : message.content}
                        </div>
                      </div>
                      
                      {/* Action chips for mentioned garments */}
                      {message.role === 'assistant' && mentionedGarments.length > 0 && onAddGarment && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="flex flex-wrap gap-2 mt-2 ml-1"
                        >
                          {mentionedGarments.map((garment) => {
                            const isSelected = selectedGarmentIds.includes(garment.id)
                            const wasRecentlyAdded = recentlyAdded.has(garment.id)
                            
                            return (
                              <motion.button
                                key={garment.id}
                                onClick={() => {
                                  if (!isSelected) {
                                    onAddGarment(garment.id)
                                    setRecentlyAdded(prev => new Set(prev).add(garment.id))
                                    // Clear the "recently added" state after animation
                                    setTimeout(() => {
                                      setRecentlyAdded(prev => {
                                        const next = new Set(prev)
                                        next.delete(garment.id)
                                        return next
                                      })
                                    }, 2000)
                                  }
                                }}
                                disabled={isSelected}
                                whileHover={!isSelected ? { scale: 1.02 } : {}}
                                whileTap={!isSelected ? { scale: 0.98 } : {}}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : wasRecentlyAdded
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:border-white/20'
                                }`}
                              >
                                {garment.thumbnail_url && (
                                  <img 
                                    src={garment.thumbnail_url} 
                                    alt={garment.name}
                                    className="w-5 h-5 rounded object-cover"
                                  />
                                )}
                                <span>{garment.name}</span>
                                {isSelected || wasRecentlyAdded ? (
                                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                )}
                              </motion.button>
                            )
                          })}
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}

                {/* Typing indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div className="flex gap-1">
                          <motion.span
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                            className="w-2 h-2 bg-white/60 rounded-full"
                          />
                          <motion.span
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                            className="w-2 h-2 bg-white/60 rounded-full"
                          />
                          <motion.span
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                            className="w-2 h-2 bg-white/60 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mx-4 mb-2 p-3 bg-rose-500/20 border border-rose-500/30 rounded-lg"
              >
                <p className="text-rose-300 text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-charcoal-900/50">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about garments, materials, or get recommendations..."
                  rows={1}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-white placeholder-white/40 text-sm resize-none disabled:opacity-50 transition-all"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
            <p className="text-center text-xs text-white/30 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

