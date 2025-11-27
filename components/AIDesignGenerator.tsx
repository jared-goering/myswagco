'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PrintLocation } from '@/types'
import { useCustomerAuth } from '@/lib/auth/CustomerAuthContext'

interface AIDesignGeneratorProps {
  isOpen: boolean
  onClose: () => void
  onDesignGenerated: (imageDataUrl: string, location: PrintLocation) => void
  availableLocations?: PrintLocation[]
}

const LOCATION_LABELS: Record<PrintLocation, string> = {
  front: 'Front',
  back: 'Back',
  left_chest: 'Left Chest',
  right_chest: 'Right Chest',
  full_back: 'Full Back',
}

const EXAMPLE_PROMPTS = [
  "Vintage surf shop logo with palm trees and waves",
  "Retro 80s arcade game style text that says 'GAME ON'",
  "Mountain landscape silhouette with pine trees",
  "Abstract geometric pattern with bold shapes",
  "Classic sports team logo with an eagle mascot",
  "Minimalist coffee cup icon with steam",
]

// Loading messages that cycle during generation
const LOADING_STEPS = [
  { text: "Analyzing your prompt...", icon: "search", tip: "Tip: Be specific about colors and style for better results" },
  { text: "Generating artwork...", icon: "sparkles", tip: "Did you know? Screen printing works best with 2-4 solid colors" },
  { text: "Optimizing for print...", icon: "print", tip: "Pro tip: Bold, simple shapes print better than fine details" },
  { text: "Adding final touches...", icon: "magic", tip: "Almost there! Great designs tell a story" },
]

// Screen printing tips shown during loading
const LOADING_TIPS = [
  "Screen printing works best with bold, high-contrast designs",
  "Limit your design to 2-4 colors for the cleanest prints",
  "Vector-style graphics produce the sharpest results",
  "Simple shapes and thick lines are easier to print",
  "Avoid tiny details - they can get lost in the printing process",
  "Flat colors print more reliably than gradients",
]

// LocalStorage key for saved designs
const SAVED_DESIGNS_KEY = 'ai-generator-saved-designs'
const MAX_SAVED_DESIGNS = 20

interface SavedDesign {
  id: string
  image: string
  prompt: string
  createdAt: number
}

export default function AIDesignGenerator({ isOpen, onClose, onDesignGenerated, availableLocations = ['front'] }: AIDesignGeneratorProps) {
  // Auth hook for gating AI generation
  const { isAuthenticated, openAuthModal, customer } = useCustomerAuth()
  
  const [prompt, setPrompt] = useState('')
  const [referenceImages, setReferenceImages] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null)
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  const [backgroundRemoved, setBackgroundRemoved] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingImage, setEditingImage] = useState<string | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // New state for enhancements
  const [designHistory, setDesignHistory] = useState<string[]>([])
  const [loadingStep, setLoadingStep] = useState(0)
  const [loadingTip, setLoadingTip] = useState(LOADING_TIPS[0])
  const [showCompare, setShowCompare] = useState(false)
  const [expandedPromptIndex, setExpandedPromptIndex] = useState<number | null>(null)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  
  // Previously generated designs (persisted)
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([])
  const [showSavedDesigns, setShowSavedDesigns] = useState(false)
  
  // State for saving to account
  const [isSavingToAccount, setIsSavingToAccount] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Load saved designs from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(SAVED_DESIGNS_KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as SavedDesign[]
          setSavedDesigns(parsed)
        }
      } catch (e) {
        console.error('Failed to load saved designs:', e)
      }
    }
  }, [isOpen])
  
  // Save a design to localStorage
  const saveDesignToHistory = useCallback((image: string, designPrompt: string) => {
    const newDesign: SavedDesign = {
      id: `design-${Date.now()}`,
      image,
      prompt: designPrompt,
      createdAt: Date.now(),
    }
    
    setSavedDesigns(prev => {
      const updated = [newDesign, ...prev].slice(0, MAX_SAVED_DESIGNS)
      try {
        localStorage.setItem(SAVED_DESIGNS_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save design:', e)
      }
      return updated
    })
  }, [])
  
  // Delete a saved design
  const deleteSavedDesign = useCallback((id: string) => {
    setSavedDesigns(prev => {
      const updated = prev.filter(d => d.id !== id)
      try {
        localStorage.setItem(SAVED_DESIGNS_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to delete design:', e)
      }
      return updated
    })
  }, [])
  
  // Update a saved design (e.g., after background removal)
  const updateSavedDesign = useCallback((oldImage: string, newImage: string) => {
    setSavedDesigns(prev => {
      const idx = prev.findIndex(d => d.image === oldImage)
      if (idx === -1) return prev
      
      const updated = [...prev]
      updated[idx] = { ...updated[idx], image: newImage }
      try {
        localStorage.setItem(SAVED_DESIGNS_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to update design:', e)
      }
      return updated
    })
  }, [])
  
  // Apply a saved design
  const applySavedDesign = useCallback((design: SavedDesign) => {
    setGeneratedImage(design.image)
    setBackgroundRemoved(false)
    setIsEditMode(false)
    setEditingImage(null)
    setShowSavedDesigns(false)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
      // Enter to generate (when not in textarea and prompt exists)
      if (e.key === 'Enter' && e.metaKey && prompt.trim() && !isGenerating) {
        e.preventDefault()
        if (isEditMode) {
          handleApplyEdit()
        } else {
          handleGenerate()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, prompt, isGenerating, isEditMode])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    // Focus the textarea on open
    setTimeout(() => textareaRef.current?.focus(), 100)

    window.addEventListener('keydown', handleTabKey)
    return () => window.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Loading animation - cycle through steps and tips
  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0)
      return
    }

    // Cycle through loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length)
    }, 3000)

    // Rotate tips
    const tipInterval = setInterval(() => {
      setLoadingTip(LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)])
    }, 4000)

    return () => {
      clearInterval(stepInterval)
      clearInterval(tipInterval)
    }
  }, [isGenerating])

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) return
    
    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev === null || prev <= 1) {
          return null
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [rateLimitCountdown])

  // Compress and resize image to reduce API payload size
  const compressImage = useCallback((dataUrl: string, maxSize: number = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        
        // Scale down if larger than maxSize
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize
            width = maxSize
          } else {
            width = (width / height) * maxSize
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          // Compress to JPEG at 80% quality for smaller file size
          const compressed = canvas.toDataURL('image/jpeg', 0.8)
          console.log(`Compressed image: ${Math.round(dataUrl.length / 1024)}KB -> ${Math.round(compressed.length / 1024)}KB`)
          resolve(compressed)
        } else {
          resolve(dataUrl)
        }
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })
  }, [])

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const maxFiles = 3 - referenceImages.length

    Array.from(files).slice(0, maxFiles).forEach((file) => {
      // Only accept supported image types (Gemini doesn't support SVG, etc.)
      if (SUPPORTED_TYPES.includes(file.type)) {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const result = e.target?.result as string
          if (result) {
            // Compress large images before storing
            const compressed = await compressImage(result, 1024)
            setReferenceImages((prev) => [...prev, compressed].slice(0, 3))
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }, [referenceImages.length, compressImage])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const removeReferenceImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    // Require authentication for AI generation
    if (!isAuthenticated) {
      openAuthModal({
        feature: 'ai_generator',
        title: 'Sign in to use AI Design Generator',
        message: 'Create a free account to generate custom designs with AI and save them to your account.',
        onSuccess: () => {
          // After successful auth, try generating again
          handleGenerate()
        },
      })
      return
    }
    
    if (!prompt.trim()) {
      setError('Please enter a description of your design')
      return
    }

    if (rateLimitCountdown && rateLimitCountdown > 0) {
      setError(`Please wait ${rateLimitCountdown} seconds before trying again`)
      return
    }

    setIsGenerating(true)
    setError(null)
    setLoadingStep(0)

    try {
      const response = await fetch('/api/artwork/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle rate limit with countdown
        if (data.isRateLimit && data.retryAfter) {
          setRateLimitCountdown(data.retryAfter)
        }
        throw new Error(data.error || 'Failed to generate design')
      }

      if (data.success && data.image) {
        // Add to session history (keep max 8 items)
        setDesignHistory((prev) => [data.image, ...prev].slice(0, 8))
        setGeneratedImage(data.image)
        setBackgroundRemoved(false)
        // Save to persistent storage (local)
        saveDesignToHistory(data.image, prompt.trim())
        // Show success animation briefly
        setShowSuccessAnimation(true)
        setTimeout(() => setShowSuccessAnimation(false), 1500)
      } else {
        throw new Error('No image was generated')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate design')
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Save artwork to user's account
  const handleSaveToAccount = async () => {
    if (!generatedImage) return
    
    if (!isAuthenticated) {
      openAuthModal({
        feature: 'save_artwork',
        title: 'Sign in to save your artwork',
        message: 'Create a free account to save your designs and access them anytime.',
        onSuccess: () => {
          handleSaveToAccount()
        },
      })
      return
    }
    
    setIsSavingToAccount(true)
    setSaveSuccess(false)
    
    try {
      const response = await fetch('/api/saved-artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prompt.trim() || 'Untitled Design',
          image_data: generatedImage,
          prompt: prompt.trim(),
          is_ai_generated: true,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save artwork')
      }
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save artwork')
    } finally {
      setIsSavingToAccount(false)
    }
  }

  const handleUseDesign = () => {
    if (generatedImage) {
      // If multiple locations available, show picker
      if (availableLocations.length > 1) {
        setShowLocationPicker(true)
      } else {
        // Single location, use it directly
        onDesignGenerated(generatedImage, availableLocations[0])
        handleClose()
      }
    }
  }

  const handleSelectLocation = (location: PrintLocation) => {
    if (generatedImage) {
      onDesignGenerated(generatedImage, location)
      setShowLocationPicker(false)
      handleClose()
    }
  }

  const handleRemoveBackground = async () => {
    if (!generatedImage) return

    setIsRemovingBackground(true)
    setError(null)

    try {
      const response = await fetch('/api/artwork/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: generatedImage }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove background')
      }

      if (data.success && data.image) {
        // Update session history with bg-removed version
        setDesignHistory((prev) => {
          const newHistory = [...prev]
          const idx = newHistory.indexOf(generatedImage)
          if (idx >= 0) newHistory[idx] = data.image
          return newHistory
        })
        // Update saved designs with bg-removed version
        updateSavedDesign(generatedImage, data.image)
        setGeneratedImage(data.image)
        setBackgroundRemoved(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove background')
    } finally {
      setIsRemovingBackground(false)
    }
  }

  const handleClose = () => {
    setPrompt('')
    setReferenceImages([])
    setGeneratedImage(null)
    setError(null)
    setIsGenerating(false)
    setIsRemovingBackground(false)
    setBackgroundRemoved(false)
    setIsEditMode(false)
    setEditingImage(null)
    setDesignHistory([])
    setShowCompare(false)
    setExpandedPromptIndex(null)
    setShowLocationPicker(false)
    setShowSavedDesigns(false)
    onClose()
  }

  const handleRegenerate = () => {
    setBackgroundRemoved(false)
    handleGenerate()
  }

  const handleStartEdit = async () => {
    if (generatedImage) {
      // Compress the image before using as edit reference
      const compressed = await compressImage(generatedImage, 1024)
      setEditingImage(compressed)
      setIsEditMode(true)
      setPrompt('') // Clear prompt for new edit instructions
      setBackgroundRemoved(false)
      // Keep the generated image visible for comparison
    }
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditingImage(null)
    setPrompt('')
    setShowCompare(false)
  }

  const handleApplyEdit = async () => {
    if (!prompt.trim() || !editingImage) {
      setError('Please describe the edit you want to make')
      return
    }

    if (rateLimitCountdown && rateLimitCountdown > 0) {
      setError(`Please wait ${rateLimitCountdown} seconds before trying again`)
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Send the editing image as reference with the edit instructions
      const response = await fetch('/api/artwork/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `EDIT THIS IMAGE: ${prompt.trim()}`,
          referenceImages: [editingImage],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.isRateLimit && data.retryAfter) {
          setRateLimitCountdown(data.retryAfter)
        }
        throw new Error(data.error || 'Failed to apply edit')
      }

      if (data.success && data.image) {
        // Add to session history
        setDesignHistory((prev) => [data.image, ...prev].slice(0, 8))
        setGeneratedImage(data.image)
        setIsEditMode(false)
        setEditingImage(null)
        setShowCompare(false)
        // Save to persistent storage
        saveDesignToHistory(data.image, `Edit: ${prompt.trim()}`)
        // Show success animation
        setShowSuccessAnimation(true)
        setTimeout(() => setShowSuccessAnimation(false), 1500)
      } else {
        throw new Error('No image was generated')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply edit')
    } finally {
      setIsGenerating(false)
    }
  }

  const applyExamplePrompt = (example: string) => {
    setPrompt(example)
    setExpandedPromptIndex(null)
  }

  const selectFromHistory = (image: string) => {
    setGeneratedImage(image)
    setBackgroundRemoved(false)
    setIsEditMode(false)
    setEditingImage(null)
  }

  // Character count helpers
  const promptLength = prompt.length
  const isPromptOptimal = promptLength >= 30 && promptLength <= 200
  const isPromptTooShort = promptLength > 0 && promptLength < 30
  const isPromptTooLong = promptLength > 200

  if (!isOpen) return null

  // Get current loading state
  const currentLoadingStep = LOADING_STEPS[loadingStep]

  // Loading step icons
  const LoadingIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'search':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )
      case 'sparkles':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        )
      case 'print':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        )
      case 'magic':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        )
      default:
        return null
    }
  }

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
        aria-labelledby="ai-generator-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-bento-lg shadow-bento"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-surface-200 bg-gradient-to-r from-violet-50 to-fuchsia-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-bento bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-soft">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 id="ai-generator-title" className="text-xl md:text-2xl font-black text-charcoal-700 tracking-tight">AI Design Generator</h2>
                <p className="text-xs md:text-sm text-charcoal-500 font-semibold">Create screen print-ready graphics with AI</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Keyboard shortcut hint */}
              <span className="hidden md:flex items-center gap-1 text-xs text-charcoal-400 bg-charcoal-100 px-2 py-1 rounded">
                <kbd className="font-mono">⌘</kbd>+<kbd className="font-mono">Enter</kbd> to generate
              </span>
              <button
                onClick={handleClose}
                className="p-2 md:p-2.5 hover:bg-charcoal-100 rounded-bento transition-colors"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-charcoal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Authentication Gate */}
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center min-h-[400px]">
              {/* Lock Icon */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              
              {/* Title */}
              <h3 className="text-2xl font-black text-charcoal-700 mb-3">
                Sign In to Generate AI Designs
              </h3>
              
              {/* Description */}
              <p className="text-charcoal-500 font-medium max-w-md mb-8 leading-relaxed">
                Create unlimited screen print-ready graphics with our AI Design Generator. 
                Sign in to save your designs to your account and access them anytime.
              </p>
              
              {/* Benefits */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 rounded-full">
                  <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-violet-700">Unlimited generations</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 rounded-full">
                  <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-violet-700">Save to your account</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 rounded-full">
                  <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-violet-700">Screen print optimized</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => openAuthModal({ 
                    title: 'Sign in to use AI Design Generator',
                    message: 'Create and save unlimited AI-generated designs for your custom shirts.'
                  })}
                  className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-bento font-bold shadow-soft hover:shadow-bento transition-all"
                >
                  Sign In or Create Account
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 text-charcoal-600 hover:text-charcoal-700 hover:bg-surface-100 rounded-bento font-semibold transition-colors"
                >
                  Maybe Later
                </button>
              </div>
              
              {/* Footer Note */}
              <p className="mt-8 text-xs text-charcoal-400 font-medium">
                Free to use • No credit card required
              </p>
            </div>
          ) : (
          <>
          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-4 md:p-6">
            {/* Mobile: Preview first on mobile when generating or has result */}
            <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-6">
              {/* Left Column - Input */}
              <div className="space-y-5 order-2 md:order-1">
                {/* Prompt Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-black text-charcoal-700 uppercase tracking-wide">
                      {isEditMode ? 'Describe Your Edit' : 'Describe Your Design'}
                    </label>
                    {/* Character count */}
                    <span className={`text-xs font-medium transition-colors ${
                      isPromptOptimal ? 'text-emerald-600' :
                      isPromptTooShort ? 'text-amber-600' :
                      isPromptTooLong ? 'text-rose-500' :
                      'text-charcoal-400'
                    }`}>
                      {promptLength}/200
                    </span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={isEditMode 
                      ? "Describe the changes you want... e.g., 'make the text bigger', 'change color to red', 'add more detail'"
                      : "A vintage motorcycle logo with wings and flames, bold and retro style..."
                    }
                    rows={3}
                    className={`w-full px-4 py-3 border-2 rounded-bento focus:ring-4 transition-all outline-none resize-none text-sm font-medium text-charcoal-700 placeholder:text-charcoal-400 ${
                      isEditMode 
                        ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-100' 
                        : 'border-surface-300 focus:border-violet-500 focus:ring-violet-100'
                    }`}
                    disabled={isGenerating}
                    aria-describedby="prompt-help"
                  />
                  <div id="prompt-help" className="mt-2 space-y-1">
                    <p className="text-xs text-charcoal-500 font-semibold">
                      {isEditMode 
                        ? 'The AI will modify your design based on these instructions'
                        : 'Optimized for screen printing (2-4 colors, no gradients)'
                      }
                    </p>
                    {isPromptTooShort && (
                      <p className="text-xs text-amber-600 font-medium">Add more detail for better results</p>
                    )}
                  </div>
                </div>

                {/* Example Prompts / Edit Suggestions - Expandable pills */}
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-2">
                    {isEditMode ? 'Common edits:' : 'Try an example:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {isEditMode ? (
                      <>
                        {['Make it bigger', 'Change text to say...', 'Make it bolder', 'Add more contrast', 'Simplify the design', 'Change colors to...'].map((edit, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPrompt(edit)}
                            disabled={isGenerating}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-full transition-all border border-blue-200 hover:border-blue-300 disabled:opacity-50 hover:scale-105"
                          >
                            {edit}
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {EXAMPLE_PROMPTS.map((example, idx) => (
                          <button
                            key={idx}
                            onClick={() => applyExamplePrompt(example)}
                            onMouseEnter={() => setExpandedPromptIndex(idx)}
                            onMouseLeave={() => setExpandedPromptIndex(null)}
                            disabled={isGenerating}
                            className="relative px-3 py-1.5 text-xs font-semibold bg-surface-100 hover:bg-violet-100 text-charcoal-600 hover:text-violet-700 rounded-full transition-all border border-surface-200 hover:border-violet-300 disabled:opacity-50 hover:scale-105"
                          >
                            {example.length > 30 ? `${example.slice(0, 30)}...` : example}
                            {/* Expanded tooltip on hover */}
                            <AnimatePresence>
                              {expandedPromptIndex === idx && example.length > 30 && (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                  className="absolute z-10 bottom-full left-0 mb-2 px-3 py-2 bg-charcoal-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap"
                                >
                                  {example}
                                  <div className="absolute top-full left-4 w-2 h-2 bg-charcoal-800 rotate-45 -mt-1" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Reference Images - Collapsible on mobile */}
                <details className="group" open>
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <label className="text-sm font-black text-charcoal-700 uppercase tracking-wide cursor-pointer">
                      Reference Images <span className="text-charcoal-400 font-semibold normal-case">(optional, up to 3)</span>
                    </label>
                    <svg className="w-5 h-5 text-charcoal-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  
                  <div className="mt-3">
                    {/* Drop Zone */}
                    <div
                      ref={dropZoneRef}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        relative border-2 border-dashed rounded-bento p-4 md:p-6 text-center cursor-pointer transition-all
                        ${isDragging 
                          ? 'border-violet-500 bg-violet-50 scale-[1.02]' 
                          : 'border-surface-300 hover:border-violet-400 hover:bg-violet-50/50'
                        }
                        ${isGenerating ? 'opacity-50 pointer-events-none' : ''}
                      `}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                        disabled={isGenerating || referenceImages.length >= 3}
                        aria-label="Upload reference images"
                      />
                      <svg className="w-8 h-8 mx-auto text-charcoal-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm font-semibold text-charcoal-600">
                        {referenceImages.length >= 3 
                          ? 'Maximum 3 images reached' 
                          : 'Drop images here or click to upload'
                        }
                      </p>
                      <p className="text-xs text-charcoal-400 mt-1">
                        JPG, PNG, GIF, or WebP only (no SVG)
                      </p>
                    </div>

                    {/* Reference Image Previews */}
                    {referenceImages.length > 0 && (
                      <div className="flex gap-3 mt-4">
                        {referenceImages.map((img, idx) => (
                          <motion.div 
                            key={idx} 
                            className="relative group"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <img
                              src={img}
                              alt={`Reference ${idx + 1}`}
                              className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-bento border-2 border-surface-200 hover:border-violet-400 transition-all hover:scale-105"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeReferenceImage(idx)
                              }}
                              disabled={isGenerating}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-soft hover:bg-rose-600 hover:scale-110"
                              aria-label={`Remove reference image ${idx + 1}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>

                {/* Previously Generated Designs */}
                {savedDesigns.length > 0 && (
                  <div className="border-t border-surface-200 pt-4">
                    <button
                      onClick={() => setShowSavedDesigns(!showSavedDesigns)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span className="text-sm font-bold text-charcoal-700">
                          Previously Generated ({savedDesigns.length})
                        </span>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-charcoal-400 transition-transform ${showSavedDesigns ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    <AnimatePresence>
                      {showSavedDesigns && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            {savedDesigns.map((design) => (
                              <div key={design.id} className="relative group">
                                <button
                                  onClick={() => applySavedDesign(design)}
                                  className="w-full aspect-square rounded-lg border-2 border-surface-200 hover:border-violet-400 overflow-hidden transition-all hover:scale-105 bg-white"
                                  style={{
                                    background: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 10px 10px'
                                  }}
                                  title={design.prompt}
                                >
                                  <img
                                    src={design.image}
                                    alt={design.prompt}
                                    className="w-full h-full object-contain"
                                  />
                                </button>
                                {/* Delete button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteSavedDesign(design.id)
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-rose-600 hover:scale-110"
                                  title="Delete"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                                {/* Prompt tooltip on hover */}
                                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg">
                                  <p className="text-[10px] text-white truncate font-medium">
                                    {design.prompt}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-charcoal-400 mt-2 text-center">
                            Click to use • Hover to see prompt
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Screen Print Info - More compact */}
                <div className="p-3 md:p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-bento border border-amber-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-amber-800 text-sm">Screen Print Optimized</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        2-4 solid colors, bold shapes, clean edges
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Preview/Result */}
              <div className="space-y-4 order-1 md:order-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-black text-charcoal-700 uppercase tracking-wide">
                    {isEditMode ? 'Editing Design' : generatedImage ? 'Generated Design' : 'Preview'}
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Compare toggle for edit mode */}
                    {isEditMode && editingImage && generatedImage && (
                      <button
                        onClick={() => setShowCompare(!showCompare)}
                        className={`px-2 py-1 text-xs font-bold rounded-full transition-all ${
                          showCompare 
                            ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                            : 'bg-surface-100 text-charcoal-600 border border-surface-200 hover:bg-blue-50'
                        }`}
                      >
                        {showCompare ? 'Hide Original' : 'Compare'}
                      </button>
                    )}
                    {isEditMode && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Mode
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Preview Area - with checkered background for transparency */}
                <div className={`relative aspect-square rounded-bento border-2 flex items-center justify-center overflow-hidden ${
                  isEditMode ? 'border-blue-300' : 'border-surface-200'
                }`}
                style={{
                  background: generatedImage || (isEditMode && editingImage) 
                    ? 'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 50% / 20px 20px'
                    : '#f5f5f7'
                }}
                >
                  <AnimatePresence mode="wait">
                    {isGenerating ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center p-6 md:p-8"
                      >
                        {/* Animated loading indicator */}
                        <div className="relative w-20 h-20 mx-auto mb-4">
                          {/* Outer ring */}
                          <div className="absolute inset-0 rounded-full border-4 border-violet-100"></div>
                          {/* Progress ring */}
                          <svg className="absolute inset-0 w-20 h-20 -rotate-90">
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              fill="none"
                              stroke="url(#gradient)"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray="226"
                              strokeDashoffset={226 - (226 * (loadingStep + 1)) / LOADING_STEPS.length}
                              className="transition-all duration-500"
                            />
                            <defs>
                              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#d946ef" />
                              </linearGradient>
                            </defs>
                          </svg>
                          {/* Center icon */}
                          <div className="absolute inset-0 flex items-center justify-center text-violet-500">
                            <motion.div
                              key={currentLoadingStep.icon}
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              transition={{ type: 'spring', damping: 15 }}
                            >
                              <LoadingIcon type={currentLoadingStep.icon} />
                            </motion.div>
                          </div>
                        </div>
                        
                        {/* Loading step text */}
                        <motion.p
                          key={currentLoadingStep.text}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-charcoal-700 font-bold text-sm md:text-base"
                        >
                          {isEditMode ? 'Applying your edit...' : currentLoadingStep.text}
                        </motion.p>
                        
                        {/* Progress dots */}
                        <div className="flex justify-center gap-1.5 mt-3">
                          {LOADING_STEPS.map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                idx <= loadingStep ? 'bg-violet-500' : 'bg-violet-200'
                              }`}
                            />
                          ))}
                        </div>
                        
                        {/* Rotating tip */}
                        <motion.div
                          key={loadingTip}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-4 px-4 py-2 bg-white/80 rounded-lg"
                        >
                          <p className="text-charcoal-500 text-xs">
                            {loadingTip}
                          </p>
                        </motion.div>
                      </motion.div>
                    ) : generatedImage ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full h-full"
                      >
                        {/* Compare view: show original in corner */}
                        {showCompare && editingImage && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute top-2 left-2 z-10 w-20 h-20 rounded-lg border-2 border-white shadow-lg overflow-hidden"
                          >
                            <img
                              src={editingImage}
                              alt="Original design"
                              className="w-full h-full object-contain bg-white"
                            />
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 font-medium">
                              Original
                            </span>
                          </motion.div>
                        )}
                        
                        <img
                          src={generatedImage}
                          alt="Generated design"
                          className="w-full h-full object-contain p-4"
                        />
                        
                        {/* Success animation overlay */}
                        <AnimatePresence>
                          {showSuccessAnimation && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm"
                            >
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: 'spring', damping: 10 }}
                                className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
                              >
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <motion.path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                  />
                                </svg>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ) : isEditMode && editingImage ? (
                      <motion.div
                        key="edit-preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative w-full h-full"
                      >
                        <img
                          src={editingImage}
                          alt="Design being edited"
                          className="w-full h-full object-contain p-4"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10">
                          <div className="text-center p-4 bg-white/95 rounded-bento shadow-soft backdrop-blur-sm">
                            <svg className="w-8 h-8 mx-auto text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <p className="text-charcoal-700 font-bold text-sm">Describe your edit above</p>
                            <p className="text-charcoal-500 text-xs mt-1">Then click &quot;Apply Edit&quot;</p>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center p-6 md:p-8"
                      >
                        {/* Animated placeholder illustration */}
                        <div className="relative w-24 h-24 mx-auto mb-4">
                          <motion.div
                            animate={{ 
                              rotate: [0, 5, -5, 0],
                              scale: [1, 1.02, 1]
                            }}
                            transition={{ 
                              duration: 4, 
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="absolute inset-0 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-2xl"
                          />
                          <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <svg className="w-12 h-12 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </motion.div>
                          {/* Sparkle accents */}
                          <motion.div
                            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            className="absolute -top-1 -right-1 w-3 h-3 bg-fuchsia-400 rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                            className="absolute bottom-2 -left-2 w-2 h-2 bg-violet-400 rounded-full"
                          />
                        </div>
                        <p className="text-charcoal-600 font-semibold">Your AI design will appear here</p>
                        <p className="text-charcoal-400 text-sm mt-1">Enter a description and click Generate</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Design History Carousel */}
                {designHistory.length > 1 && !isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-charcoal-500 uppercase tracking-wide">
                        Previous Designs ({designHistory.length})
                      </label>
                      <button
                        onClick={() => setDesignHistory([])}
                        className="text-xs text-charcoal-400 hover:text-charcoal-600 font-medium"
                      >
                        Clear history
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-surface-300">
                      {designHistory.map((img, idx) => (
                        <motion.button
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => selectFromHistory(img)}
                          className={`flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-all hover:scale-105 ${
                            generatedImage === img 
                              ? 'border-violet-500 ring-2 ring-violet-200' 
                              : 'border-surface-200 hover:border-violet-300'
                          }`}
                          style={{
                            background: 'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 50% / 10px 10px'
                          }}
                        >
                          <img
                            src={img}
                            alt={`Design ${idx + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 md:p-4 bg-rose-50 border border-rose-200 rounded-bento"
                    >
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-rose-700 font-semibold text-sm">{error}</p>
                          {error.includes('content policy') && (
                            <button
                              onClick={() => {
                                setError(null)
                                setPrompt('')
                              }}
                              className="mt-2 text-xs text-rose-600 hover:text-rose-700 underline font-medium"
                            >
                              Try a different prompt
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                {generatedImage && !isEditMode ? (
                  <div className="space-y-3">
                    {/* Action Buttons Row - All three buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleRegenerate}
                        disabled={isGenerating || isRemovingBackground}
                        className="flex-1 px-3 py-2.5 md:px-4 md:py-3 border-2 border-surface-300 hover:border-violet-400 rounded-bento font-bold text-sm text-charcoal-700 hover:text-violet-700 hover:bg-violet-50 transition-all disabled:opacity-50 hover:scale-[1.02]"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span className="hidden sm:inline">Regenerate</span>
                          <span className="sm:hidden">New</span>
                        </span>
                      </button>
                      <button
                        onClick={handleStartEdit}
                        disabled={isGenerating || isRemovingBackground}
                        className="flex-1 px-3 py-2.5 md:px-4 md:py-3 border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-bento font-bold text-sm text-blue-700 hover:text-blue-800 transition-all disabled:opacity-50 hover:scale-[1.02]"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </span>
                      </button>
                      {/* Remove Background Button - integrated into row */}
                      {!backgroundRemoved ? (
                        <button
                          onClick={handleRemoveBackground}
                          disabled={isRemovingBackground}
                          className="flex-1 px-3 py-2.5 md:px-4 md:py-3 border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 rounded-bento font-bold text-sm text-amber-700 hover:text-amber-800 transition-all disabled:opacity-50 hover:scale-[1.02]"
                        >
                          <span className="flex items-center justify-center gap-2">
                            {isRemovingBackground ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="hidden sm:inline">Removing...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                </svg>
                                <span className="hidden sm:inline">Remove BG</span>
                                <span className="sm:hidden">BG</span>
                              </>
                            )}
                          </span>
                        </button>
                      ) : (
                        <div className="flex-1 px-3 py-2.5 md:px-4 md:py-3 border-2 border-emerald-300 bg-emerald-50 rounded-bento font-bold text-sm text-emerald-700 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="hidden sm:inline">BG Removed</span>
                          <span className="sm:hidden">Done</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Save to Account Button */}
                    <button
                      onClick={handleSaveToAccount}
                      disabled={isSavingToAccount || isRemovingBackground}
                      className={`w-full px-4 py-2.5 border-2 rounded-bento font-bold text-sm transition-all disabled:opacity-50 hover:scale-[1.02] ${
                        saveSuccess 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
                          : 'border-pink-300 bg-pink-50 hover:bg-pink-100 text-pink-700 hover:text-pink-800'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {isSavingToAccount ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : saveSuccess ? (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Saved to My Designs!
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            Save to My Designs
                          </>
                        )}
                      </span>
                    </button>
                    
                    {/* Primary CTA - Use Design (more prominent) */}
                    <button
                      onClick={handleUseDesign}
                      disabled={isRemovingBackground}
                      className="w-full px-6 py-3.5 md:py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-bento font-black text-base md:text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 hover:scale-[1.02]"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Use This Design
                      </span>
                    </button>
                  </div>
                ) : isEditMode ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        disabled={isGenerating}
                        className="flex-1 px-4 py-3 border-2 border-surface-300 hover:border-charcoal-400 rounded-bento font-bold text-charcoal-600 hover:text-charcoal-700 hover:bg-surface-50 transition-all disabled:opacity-50"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </span>
                      </button>
                      <button
                        onClick={handleApplyEdit}
                        disabled={isGenerating || !prompt.trim()}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-bento font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                      >
                        {isGenerating ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Applying...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Apply Edit
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Generate Button - sticky on mobile */
                  <div className="md:static fixed bottom-0 left-0 right-0 p-4 md:p-0 bg-white md:bg-transparent border-t md:border-0 border-surface-200 z-10">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full px-6 py-3.5 md:py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-bento font-black text-base md:text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                    >
                      {isGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate Design
                        </span>
                      )}
                    </button>
                    {/* Rate limit countdown */}
                    {rateLimitCountdown && rateLimitCountdown > 0 && (
                      <p className="text-center text-xs text-amber-600 font-medium mt-2">
                        Please wait {rateLimitCountdown}s before generating again
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 md:p-4 border-t border-surface-200 bg-surface-50">
            <p className="text-xs text-center text-charcoal-500 font-medium">
              Powered by Google Gemini AI • Designs are optimized for screen printing
            </p>
          </div>
          
          {/* Mobile bottom padding to account for sticky button */}
          <div className="h-20 md:hidden" />
          </>
          )}

          {/* Location Picker Overlay */}
          <AnimatePresence>
            {showLocationPicker && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 rounded-bento-lg"
                onClick={() => setShowLocationPicker(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25 }}
                  className="bg-white rounded-bento-lg shadow-2xl p-6 max-w-sm w-full mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-black text-charcoal-700 mb-2">Where should we add this?</h3>
                  <p className="text-sm text-charcoal-500 mb-5">Choose where to place your AI-generated design</p>
                  
                  <div className="space-y-2">
                    {availableLocations.map((location) => (
                      <button
                        key={location}
                        onClick={() => handleSelectLocation(location)}
                        className="w-full flex items-center gap-4 p-4 rounded-bento border-2 border-surface-200 hover:border-violet-400 hover:bg-violet-50 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-bento bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center group-hover:from-violet-200 group-hover:to-fuchsia-200 transition-all">
                          {location === 'front' && (
                            <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          )}
                          {(location === 'back' || location === 'full_back') && (
                            <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                          )}
                          {location === 'left_chest' && (
                            <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                          )}
                          {location === 'right_chest' && (
                            <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <span className="font-bold text-charcoal-700 group-hover:text-violet-700 transition-colors">
                            {LOCATION_LABELS[location]}
                          </span>
                          <p className="text-xs text-charcoal-400 mt-0.5">
                            Add design to the {LOCATION_LABELS[location].toLowerCase()}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-charcoal-300 group-hover:text-violet-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowLocationPicker(false)}
                    className="w-full mt-4 px-4 py-2.5 text-sm font-semibold text-charcoal-600 hover:text-charcoal-700 hover:bg-surface-100 rounded-bento transition-colors"
                  >
                    Cancel
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
