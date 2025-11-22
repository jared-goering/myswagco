'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Garment, PrintLocation } from '@/types'
import { useOrderStore } from '@/lib/store/orderStore'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
const PRINT_LOCATIONS: { value: PrintLocation; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
]

export default function ConfigurationWizard() {
  const router = useRouter()
  const params = useParams()
  const garmentId = params.garmentId as string

  const {
    setGarmentId,
    garmentColor,
    setGarmentColor,
    sizeQuantities,
    setSizeQuantities,
    printConfig,
    setPrintConfig,
    organizationName,
    needByDate,
    setCustomerInfo,
    setQuote,
    quote
  } = useOrderStore()

  const [garment, setGarment] = useState<Garment | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)

  useEffect(() => {
    setGarmentId(garmentId)
    fetchGarment()
  }, [garmentId])

  useEffect(() => {
    // Fetch quote when configuration changes
    if (garment && getTotalQuantity() >= 24) {
      fetchQuote()
    }
  }, [sizeQuantities, printConfig, garment])

  async function fetchGarment() {
    try {
      const response = await fetch('/api/garments')
      const garments = await response.json()
      const foundGarment = garments.find((g: Garment) => g.id === garmentId)
      
      if (!foundGarment) {
        router.push('/custom-shirts/configure')
        return
      }
      
      setGarment(foundGarment)
      
      // Set default color if not set
      if (!garmentColor && foundGarment.available_colors.length > 0) {
        setGarmentColor(foundGarment.available_colors[0])
      }
    } catch (error) {
      console.error('Error fetching garment:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchQuote() {
    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garment_id: garmentId,
          quantity: getTotalQuantity(),
          print_config: printConfig
        })
      })
      
      if (response.ok) {
        const quoteData = await response.json()
        setQuote(quoteData)
      }
    } catch (error) {
      console.error('Error fetching quote:', error)
    }
  }

  function getTotalQuantity(): number {
    return Object.values(sizeQuantities).reduce((sum, qty) => sum + (qty || 0), 0)
  }

  function handleSizeQuantityChange(size: string, value: string) {
    const qty = parseInt(value) || 0
    setSizeQuantities({ ...sizeQuantities, [size]: qty })
  }

  function togglePrintLocation(location: PrintLocation, enabled: boolean) {
    const newConfig = { ...printConfig }
    if (enabled) {
      newConfig.locations[location] = { enabled: true, num_colors: 1 }
    } else {
      delete newConfig.locations[location]
    }
    setPrintConfig(newConfig)
  }

  function setLocationColors(location: PrintLocation, colors: number) {
    const newConfig = { ...printConfig }
    if (newConfig.locations[location]) {
      newConfig.locations[location]!.num_colors = colors
    }
    setPrintConfig(newConfig)
  }

  function isStepValid(stepNum: number): boolean {
    switch (stepNum) {
      case 1:
        return getTotalQuantity() >= 24
      case 2:
        return Object.values(printConfig.locations).some(loc => loc?.enabled)
      case 3:
        return !!garmentColor
      default:
        return true
    }
  }

  function handleContinueToArtwork() {
    if (isStepValid(1) && isStepValid(2) && isStepValid(3)) {
      router.push(`/custom-shirts/configure/${garmentId}/artwork`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!garment) {
    return null
  }

  const totalQty = getTotalQuantity()
  const meetsMinimum = totalQty >= 24

  return (
    <div className="min-h-screen bg-surface-200">
      {/* Header */}
      <header className="border-b border-surface-300 bg-white sticky top-0 z-10 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/custom-shirts" className="text-2xl font-black text-primary-600 hover:text-primary-700 transition-colors">
            My Swag Co
          </Link>
          <nav className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full text-sm font-black">2</span>
            <span className="text-sm font-bold text-charcoal-700">Configure Order</span>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Garment Info */}
            <div className="bento-card mb-6 bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200">
              <h2 className="text-3xl font-black text-charcoal-700 mb-2">{garment.name}</h2>
              <p className="text-charcoal-500 font-semibold">{garment.brand}</p>
            </div>

            {/* Step Indicators */}
            <div className="bento-card mb-6">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((stepNum) => (
                  <button
                    key={stepNum}
                    onClick={() => setStep(stepNum)}
                    className={`flex items-center gap-3 transition-all ${step === stepNum ? 'scale-105' : 'opacity-50 hover:opacity-75'}`}
                  >
                    <div className={`w-12 h-12 rounded-bento flex items-center justify-center font-black text-lg transition-all ${
                      step === stepNum ? 'bg-primary-500 text-white shadow-bento' : 'bg-surface-100 text-charcoal-400'
                    }`}>
                      {stepNum}
                    </div>
                    <span className="hidden sm:block font-bold text-charcoal-700">
                      {stepNum === 1 && 'Sizes'}
                      {stepNum === 2 && 'Print'}
                      {stepNum === 3 && 'Details'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1: Sizes & Quantities */}
            {step === 1 && (
              <div className="bento-card mb-6">
                <h3 className="text-3xl font-black text-charcoal-700 mb-3 tracking-tight">Sizes & Quantities</h3>
                <p className="text-charcoal-500 mb-8 text-lg">
                  Minimum order: 24 pieces. Enter quantities for each size you need.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {SIZES.map((size) => (
                    <div key={size}>
                      <label className="block text-sm font-bold text-charcoal-600 mb-2 uppercase tracking-wide">
                        {size}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={sizeQuantities[size as keyof typeof sizeQuantities] || ''}
                        onChange={(e) => handleSizeQuantityChange(size, e.target.value)}
                        className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-6 bg-gradient-to-br from-surface-50 to-surface-100 rounded-bento-lg border border-surface-300">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-charcoal-600 text-lg">Total Quantity:</span>
                    <span className={`text-5xl font-black tracking-tight ${meetsMinimum ? 'text-primary-500' : 'text-error-500'}`}>
                      {totalQty}
                    </span>
                  </div>
                  {!meetsMinimum && totalQty > 0 && (
                    <div className="mt-4 p-3 bg-error-50 rounded-xl border border-error-200">
                      <p className="text-error-700 font-bold text-sm">
                        Need {24 - totalQty} more to meet minimum
                      </p>
                    </div>
                  )}
                  {meetsMinimum && (
                    <div className="mt-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-success-700 font-bold text-sm">Minimum met!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Print Locations */}
            {step === 2 && (
              <div className="bento-card mb-6">
                <h3 className="text-3xl font-black text-charcoal-700 mb-3 tracking-tight">Print Locations</h3>
                <p className="text-charcoal-500 mb-8 text-lg">
                  Choose where you want your design printed and how many ink colors for each location.
                </p>
                <div className="space-y-4">
                  {PRINT_LOCATIONS.map(({ value, label }) => (
                    <div key={value} className="border-2 border-surface-300 rounded-bento-lg p-6 hover:border-primary-300 transition-all">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printConfig.locations[value]?.enabled || false}
                            onChange={(e) => togglePrintLocation(value, e.target.checked)}
                            className="w-6 h-6 text-primary-500 rounded-lg"
                          />
                          <span className="ml-4 font-black text-xl text-charcoal-700">{label}</span>
                        </label>
                        {printConfig.locations[value]?.enabled && (
                          <select
                            value={printConfig.locations[value]?.num_colors || 1}
                            onChange={(e) => setLocationColors(value, parseInt(e.target.value))}
                            className="border-2 border-surface-300 rounded-xl px-4 py-2 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                          >
                            <option value={1}>1 color</option>
                            <option value={2}>2 colors</option>
                            <option value={3}>3 colors</option>
                            <option value={4}>4 colors</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Colors & Details */}
            {step === 3 && (
              <div className="bento-card mb-6">
                <h3 className="text-3xl font-black text-charcoal-700 mb-3 tracking-tight">Colors & Details</h3>
                
                <div className="mb-8">
                  <label className="block text-sm font-black text-charcoal-600 mb-3 uppercase tracking-wide">
                    Shirt Color *
                  </label>
                  <select
                    value={garmentColor}
                    onChange={(e) => setGarmentColor(e.target.value)}
                    className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                  >
                    {garment.available_colors.map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-black text-charcoal-600 mb-3 uppercase tracking-wide">
                    Organization/Event Name (optional)
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setCustomerInfo({ organizationName: e.target.value })}
                    className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                    placeholder="e.g., Smith Family Reunion 2025"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-black text-charcoal-600 mb-3 uppercase tracking-wide">
                    Need-by Date (optional)
                  </label>
                  <input
                    type="date"
                    value={needByDate}
                    onChange={(e) => setCustomerInfo({ needByDate: e.target.value })}
                    className="w-full border-2 border-surface-300 rounded-xl px-4 py-3 font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
                  />
                  <p className="text-sm text-charcoal-400 mt-2 font-semibold">
                    Most orders ship in ~14 business days after art approval
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-8 py-4 border-2 border-surface-300 rounded-bento-lg font-black text-charcoal-700 hover:bg-surface-50 hover:shadow-soft transition-all"
                >
                  Previous
                </button>
              ) : (
                <Link
                  href="/custom-shirts/configure"
                  className="px-8 py-4 border-2 border-surface-300 rounded-bento-lg font-black text-charcoal-700 hover:bg-surface-50 hover:shadow-soft transition-all inline-block"
                >
                  Back
                </Link>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!isStepValid(step)}
                  className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-bento-lg font-black shadow-soft hover:shadow-bento transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleContinueToArtwork}
                  disabled={!meetsMinimum || !isStepValid(2) || !isStepValid(3)}
                  className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-bento-lg font-black shadow-soft hover:shadow-bento transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Artwork
                </button>
              )}
            </div>
          </div>

          {/* Quote Panel */}
          <div className="lg:col-span-1">
            <div className="bento-card sticky top-24 bg-gradient-to-br from-charcoal-700 to-charcoal-800 text-white">
              <h3 className="text-2xl font-black mb-6 tracking-tight">Live Quote</h3>
              
              {quote && meetsMinimum ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-white/70 font-semibold">Garments ({totalQty})</span>
                    <span className="font-black">${quote.garment_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 font-semibold">Print Cost</span>
                    <span className="font-black">${quote.print_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 font-semibold">Setup ({quote.total_screens} screens)</span>
                    <span className="font-black">${quote.setup_fees.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-white/90 font-black text-lg">Total</span>
                      <span className="text-4xl font-black text-primary-400">${quote.total.toFixed(2)}</span>
                    </div>
                    <div className="inline-block px-3 py-1 bg-white/10 rounded-full">
                      <p className="text-sm text-white/80 font-bold">
                        ${quote.per_shirt_price.toFixed(2)} per shirt
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-white/20 pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/70 font-semibold">Deposit (50%)</span>
                      <span className="font-black text-data-green">${quote.deposit_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70 font-semibold">Balance Due</span>
                      <span className="font-black">${quote.balance_due.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  {totalQty < 24 ? (
                    <div>
                      <div className="text-6xl font-black text-white/20 mb-2">24</div>
                      <p className="text-white/70 font-semibold">Add at least 24 pieces to see pricing</p>
                    </div>
                  ) : (
                    <div className="animate-pulse">
                      <div className="text-white/50 font-bold">Loading quote...</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

