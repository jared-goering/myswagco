'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Extend window type for Google Maps
declare global {
  interface Window {
    google?: {
      maps?: {
        places?: any
      }
    }
  }
}

interface AddressComponents {
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
}

interface AddressAutocompleteProps {
  value: AddressComponents
  onChange: (address: AddressComponents) => void
  className?: string
}

interface Prediction {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

// Load Google Maps script
let googleMapsLoaded = false
let googleMapsLoadPromise: Promise<void> | null = null

function loadGoogleMaps(): Promise<void> {
  if (googleMapsLoaded && window.google?.maps?.places) {
    return Promise.resolve()
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

    if (!apiKey) {
      console.warn('Google Places API key not configured. Smart address fill disabled.')
      reject(new Error('No API key'))
      return
    }

    // Check if already loaded
    if (window.google?.maps?.places) {
      googleMapsLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      googleMapsLoaded = true
      resolve()
    }
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps'))
    }

    document.head.appendChild(script)
  })

  return googleMapsLoadPromise
}

export default function AddressAutocomplete({ value, onChange, className }: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value.line1)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiAvailable, setApiAvailable] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const autocompleteService = useRef<any>(null)
  const placesService = useRef<any>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Initialize Google Maps services
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        const gmaps = (window as any).google?.maps
        autocompleteService.current = new gmaps.places.AutocompleteService()
        // PlacesService needs a DOM element or map
        const dummyDiv = document.createElement('div')
        placesService.current = new gmaps.places.PlacesService(dummyDiv)
        setApiAvailable(true)
      })
      .catch(() => {
        setApiAvailable(false)
      })
  }, [])

  // Sync input value with external value changes
  useEffect(() => {
    if (value.line1 !== inputValue && !showDropdown) {
      setInputValue(value.line1)
    }
  }, [value.line1])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch predictions with debounce
  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setPredictions([])
      return
    }

    setIsLoading(true)
    
    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: 'us' },
        types: ['address']
      },
      (results: any, status: any) => {
        setIsLoading(false)
        const gmaps = (window as any).google?.maps
        if (status === gmaps?.places?.PlacesServiceStatus?.OK && results) {
          setPredictions(results.slice(0, 5))
          setShowDropdown(true)
        } else {
          setPredictions([])
        }
      }
    )
  }, [])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setSelectedIndex(-1)
    
    // Update the line1 immediately for non-autocomplete fallback
    onChange({ ...value, line1: newValue })

    if (!apiAvailable) return

    // Debounce the API call
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    debounceTimer.current = setTimeout(() => {
      fetchPredictions(newValue)
    }, 300)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handleSelectPrediction(predictions[selectedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Handle prediction selection
  const handleSelectPrediction = (prediction: Prediction) => {
    if (!placesService.current) return

    setIsLoading(true)
    
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'formatted_address']
      },
      (place: any, status: any) => {
        setIsLoading(false)
        const gmaps = (window as any).google?.maps
        
        if (status === gmaps?.places?.PlacesServiceStatus?.OK && place) {
          const addressComponents = place.address_components || []
          
          let streetNumber = ''
          let route = ''
          let city = ''
          let state = ''
          let postalCode = ''
          let country = 'US'

          for (const component of addressComponents) {
            const types = component.types
            
            if (types.includes('street_number')) {
              streetNumber = component.long_name
            } else if (types.includes('route')) {
              route = component.long_name
            } else if (types.includes('locality')) {
              city = component.long_name
            } else if (types.includes('sublocality_level_1') && !city) {
              // Fallback for cities like NYC that use sublocality
              city = component.long_name
            } else if (types.includes('administrative_area_level_1')) {
              state = component.short_name
            } else if (types.includes('postal_code')) {
              postalCode = component.long_name
            } else if (types.includes('country')) {
              country = component.short_name
            }
          }

          const line1 = streetNumber ? `${streetNumber} ${route}` : route

          setInputValue(line1)
          setShowDropdown(false)
          setSelectedIndex(-1)
          
          onChange({
            line1,
            line2: value.line2, // Preserve existing line2
            city,
            state,
            postal_code: postalCode,
            country
          })
        }
      }
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required
          placeholder="Street Address"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowDropdown(true)
            }
          }}
          className={className}
          autoComplete="off"
        />
        
        {/* Smart fill indicator */}
        {apiAvailable && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-500 rounded-full animate-spin" />
            ) : (
              <div className="flex items-center gap-1 text-xs text-charcoal-400 bg-surface-100 px-2 py-1 rounded-full">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-semibold">Smart Fill</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Predictions dropdown */}
      <AnimatePresence>
        {showDropdown && predictions.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border-2 border-surface-200 overflow-hidden"
          >
            <div className="p-1">
              {predictions.map((prediction, index) => (
                <button
                  key={prediction.place_id}
                  type="button"
                  onClick={() => handleSelectPrediction(prediction)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    index === selectedIndex 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'hover:bg-surface-50 text-charcoal-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <svg 
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        index === selectedIndex ? 'text-primary-500' : 'text-charcoal-400'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">
                        {prediction.structured_formatting.main_text}
                      </p>
                      <p className={`text-xs truncate ${
                        index === selectedIndex ? 'text-primary-600' : 'text-charcoal-500'
                      }`}>
                        {prediction.structured_formatting.secondary_text}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Google attribution */}
            <div className="px-4 py-2 bg-surface-50 border-t border-surface-200 flex items-center justify-end">
              <img 
                src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" 
                alt="Powered by Google" 
                className="h-3.5 opacity-60"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

