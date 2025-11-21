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
  { value: 'left_chest', label: 'Left Chest' },
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!garment) {
    return null
  }

  const totalQty = getTotalQuantity()
  const meetsMinimum = totalQty >= 24

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/custom-shirts" className="text-2xl font-bold text-primary-600">
            My Swag Co
          </Link>
          <nav className="text-sm text-gray-600">
            <span className="font-semibold text-primary-600">Step 2</span> / Configure Order
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Garment Info */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{garment.name}</h2>
              <p className="text-gray-600">{garment.brand}</p>
            </div>

            {/* Step Indicators */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((stepNum) => (
                  <button
                    key={stepNum}
                    onClick={() => setStep(stepNum)}
                    className={`flex items-center ${step === stepNum ? 'text-primary-600' : 'text-gray-400'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      step === stepNum ? 'bg-primary-600 text-white' : 'bg-gray-200'
                    }`}>
                      {stepNum}
                    </div>
                    <span className="ml-2 hidden sm:inline">
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
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Sizes & Quantities</h3>
                <p className="text-gray-600 mb-6">
                  Minimum order: 24 pieces. Enter quantities for each size you need.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {SIZES.map((size) => (
                    <div key={size}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {size}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={sizeQuantities[size] || ''}
                        onChange={(e) => handleSizeQuantityChange(size, e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Quantity:</span>
                    <span className={`text-2xl font-bold ${meetsMinimum ? 'text-primary-600' : 'text-red-600'}`}>
                      {totalQty} pieces
                    </span>
                  </div>
                  {!meetsMinimum && totalQty > 0 && (
                    <p className="text-red-600 text-sm mt-2">
                      Need {24 - totalQty} more to meet minimum
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Print Locations */}
            {step === 2 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Print Locations</h3>
                <p className="text-gray-600 mb-6">
                  Choose where you want your design printed and how many ink colors for each location.
                </p>
                <div className="space-y-4">
                  {PRINT_LOCATIONS.map(({ value, label }) => (
                    <div key={value} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={printConfig.locations[value]?.enabled || false}
                            onChange={(e) => togglePrintLocation(value, e.target.checked)}
                            className="w-5 h-5 text-primary-600 rounded"
                          />
                          <span className="ml-3 font-medium">{label}</span>
                        </label>
                        {printConfig.locations[value]?.enabled && (
                          <select
                            value={printConfig.locations[value]?.num_colors || 1}
                            onChange={(e) => setLocationColors(value, parseInt(e.target.value))}
                            className="border border-gray-300 rounded px-3 py-1"
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
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Colors & Details</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shirt Color *
                  </label>
                  <select
                    value={garmentColor}
                    onChange={(e) => setGarmentColor(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    {garment.available_colors.map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization/Event Name (optional)
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setCustomerInfo({ organizationName: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., Smith Family Reunion 2025"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Need-by Date (optional)
                  </label>
                  <input
                    type="date"
                    value={needByDate}
                    onChange={(e) => setCustomerInfo({ needByDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
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
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Previous
                </button>
              ) : (
                <Link
                  href="/custom-shirts/configure"
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Back
                </Link>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!isStepValid(step)}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleContinueToArtwork}
                  disabled={!meetsMinimum || !isStepValid(2) || !isStepValid(3)}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Artwork
                </button>
              )}
            </div>
          </div>

          {/* Quote Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h3 className="text-xl font-semibold mb-4">Live Quote</h3>
              
              {quote && meetsMinimum ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Garments ({totalQty})</span>
                    <span className="font-medium">${quote.garment_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Print Cost</span>
                    <span className="font-medium">${quote.print_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Setup Fees ({quote.total_screens} screens)</span>
                    <span className="font-medium">${quote.setup_fees.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-primary-600">${quote.total.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      ${quote.per_shirt_price.toFixed(2)} per shirt
                    </p>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Deposit (50%)</span>
                      <span className="font-medium">${quote.deposit_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Balance Due</span>
                      <span className="font-medium">${quote.balance_due.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {totalQty < 24 ? (
                    <p>Add at least 24 pieces to see pricing</p>
                  ) : (
                    <p>Loading quote...</p>
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

