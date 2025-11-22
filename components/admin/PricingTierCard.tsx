'use client'

import { PricingTier } from '@/types'

interface PricingTierCardProps {
  tiers: PricingTier[]
  selectedTierId: string
  onSelect: (tierId: string) => void
  baseCost?: number
  error?: string
}

export default function PricingTierCard({
  tiers,
  selectedTierId,
  onSelect,
  baseCost = 0,
  error
}: PricingTierCardProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-black text-charcoal-700">Pricing Tier</h3>
        <span className="text-xs font-bold text-error-600">*</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-50 border-2 border-error-200 rounded-xl">
          <p className="text-sm font-bold text-error-700">{error}</p>
        </div>
      )}

      {tiers.length === 0 ? (
        <div className="bento-item border-2 border-dashed border-surface-300 bg-surface-50 text-center py-8">
          <svg className="w-12 h-12 mx-auto text-surface-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-bold text-charcoal-500">No pricing tiers available</p>
          <p className="text-xs text-charcoal-400 font-semibold mt-1">
            Create pricing tiers in the Pricing section
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const isSelected = tier.id === selectedTierId
            const customerPrice = baseCost * (1 + tier.garment_markup_percentage / 100)
            const markup = customerPrice - baseCost

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => onSelect(tier.id)}
                className={`relative text-left bento-item transition-all duration-200 ${
                  isSelected
                    ? 'border-2 border-primary-500 shadow-soft-lg bg-primary-50'
                    : 'border-2 border-surface-200 hover:border-primary-300 hover:shadow-soft-md'
                }`}
              >
                {/* Selected Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Tier Name */}
                <h4 className={`text-lg font-black mb-2 ${
                  isSelected ? 'text-primary-700' : 'text-charcoal-700'
                }`}>
                  {tier.name}
                </h4>

                {/* Markup Percentage - Large Display */}
                <div className="mb-4">
                  <div className={`inline-flex items-baseline gap-1 ${
                    isSelected ? 'text-primary-600' : 'text-charcoal-600'
                  }`}>
                    <span className="text-4xl font-black">+{tier.garment_markup_percentage}</span>
                    <span className="text-xl font-black">%</span>
                  </div>
                  <p className="text-xs font-bold text-charcoal-500 mt-1">
                    Garment Markup
                  </p>
                </div>

                {/* Price Calculation */}
                {baseCost > 0 && (
                  <div className="pt-4 border-t-2 border-surface-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-charcoal-500">Base Cost:</span>
                      <span className="font-black text-charcoal-700">${baseCost.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-charcoal-500">Markup:</span>
                      <span className={`font-black ${
                        isSelected ? 'text-primary-600' : 'text-success-600'
                      }`}>
                        +${markup.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-surface-200">
                      <span className="font-bold text-charcoal-600">Customer Price:</span>
                      <span className={`text-lg font-black ${
                        isSelected ? 'text-primary-600' : 'text-charcoal-700'
                      }`}>
                        ${customerPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Screen Print Markup Info */}
                <div className="mt-3 pt-3 border-t border-surface-200">
                  <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wide mb-1">
                    Screen Print
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="font-bold text-charcoal-500">Setup: </span>
                      <span className="font-black text-charcoal-700">+{tier.screen_print_setup_markup_percentage}%</span>
                    </div>
                    <div>
                      <span className="font-bold text-charcoal-500">Per Item: </span>
                      <span className="font-black text-charcoal-700">+{tier.screen_print_per_item_markup_percentage}%</span>
                    </div>
                  </div>
                </div>

                {/* Hover Indicator */}
                {!isSelected && (
                  <div className="absolute inset-0 rounded-bento-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="absolute inset-0 border-2 border-primary-400 rounded-bento-lg" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Helper Text */}
      <p className="mt-4 text-xs text-charcoal-400 font-semibold flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Pricing tier determines markup percentage for customer pricing
      </p>
    </div>
  )
}

