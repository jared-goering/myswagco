'use client'

import { PricingTier } from '@/types'

interface GarmentPreviewProps {
  name: string
  brand: string
  description: string
  category: string
  baseCost: number
  colors: string[]
  colorImages: Record<string, string>
  sizes: string[]
  pricingTier?: PricingTier
  active: boolean
  completionPercentage: number
}

export default function GarmentPreview({
  name,
  brand,
  description,
  category,
  baseCost,
  colors,
  colorImages,
  sizes,
  pricingTier,
  active,
  completionPercentage
}: GarmentPreviewProps) {
  // Calculate customer price
  const customerPrice = pricingTier
    ? baseCost * (1 + pricingTier.garment_markup_percentage / 100)
    : baseCost

  // Get first color image or use placeholder
  const previewImage = colors.length > 0 ? colorImages[colors[0]] : null

  return (
    <div className="sticky top-24">
      <div className="bento-card border-2 border-surface-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-charcoal-700">Live Preview</h3>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-black ${
              completionPercentage === 100
                ? 'bg-success-100 text-success-700'
                : completionPercentage >= 50
                ? 'bg-warning-100 text-warning-700'
                : 'bg-surface-200 text-charcoal-500'
            }`}>
              {completionPercentage}%
            </span>
          </div>
        </div>

        {/* Card Preview */}
        <div className="bento-item bg-surface-50 border-2 border-surface-200 hover:shadow-soft-lg transition-all">
          {/* Image */}
          <div className="mb-4 relative">
            {previewImage ? (
              <img
                src={previewImage}
                alt={name || 'Garment preview'}
                className="w-full h-48 object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-48 bg-surface-200 rounded-xl flex flex-col items-center justify-center">
                <svg className="w-16 h-16 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-bold text-charcoal-400 mt-2">No image</p>
              </div>
            )}
            
            {/* Status Badge Overlay */}
            <div className="absolute top-3 right-3">
              {active ? (
                <span className="inline-flex items-center gap-1 bg-success-500 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-bento">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Active
                </span>
              ) : (
                <span className="bg-surface-400 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-bento">
                  Inactive
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3">
            {/* Brand & Name */}
            <div>
              {brand ? (
                <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wide mb-1">
                  {brand}
                </p>
              ) : (
                <p className="text-xs font-bold text-surface-400 mb-1">Brand name</p>
              )}
              {name ? (
                <h4 className="text-lg font-black text-charcoal-700 leading-tight">
                  {name}
                </h4>
              ) : (
                <h4 className="text-lg font-black text-surface-400 leading-tight">
                  Garment Name
                </h4>
              )}
            </div>

            {/* Category */}
            {category && (
              <span className="inline-block bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-bold">
                {category}
              </span>
            )}

            {/* Description */}
            {description ? (
              <p className="text-sm text-charcoal-600 leading-relaxed line-clamp-3">
                {description}
              </p>
            ) : (
              <p className="text-sm text-surface-400 leading-relaxed">
                Description will appear here...
              </p>
            )}

            {/* Colors */}
            {colors.length > 0 && (
              <div>
                <p className="text-xs font-bold text-charcoal-500 mb-2">
                  {colors.length} {colors.length === 1 ? 'Color' : 'Colors'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.slice(0, 6).map((color) => (
                    <div
                      key={color}
                      className="group relative"
                      title={color}
                    >
                      {colorImages[color] ? (
                        <img
                          src={colorImages[color]}
                          alt={color}
                          className="w-10 h-10 object-cover rounded-lg border-2 border-surface-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-surface-200 rounded-lg border-2 border-surface-300 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-charcoal-400 text-center leading-tight">
                            {color.substring(0, 3)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {colors.length > 6 && (
                    <div className="w-10 h-10 bg-surface-200 rounded-lg border-2 border-surface-300 flex items-center justify-center">
                      <span className="text-xs font-bold text-charcoal-600">
                        +{colors.length - 6}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div>
                <p className="text-xs font-bold text-charcoal-500 mb-2">Available Sizes</p>
                <div className="flex flex-wrap gap-1">
                  {sizes.map((size) => (
                    <span
                      key={size}
                      className="px-2 py-1 bg-surface-200 text-charcoal-700 rounded-lg text-xs font-bold"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="pt-4 border-t-2 border-surface-200">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-xs font-bold text-charcoal-500 mb-1">Customer Price</p>
                  <p className="text-2xl font-black text-primary-600">
                    ${customerPrice.toFixed(2)}
                  </p>
                </div>
                {pricingTier && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-charcoal-500">Base Cost</p>
                    <p className="text-sm font-bold text-charcoal-600">
                      ${baseCost.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              {pricingTier && (
                <div className="mt-3 px-3 py-2 bg-success-50 border border-success-200 rounded-lg">
                  <p className="text-xs font-bold text-success-700">
                    {pricingTier.name}: +{pricingTier.garment_markup_percentage}% markup
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-4 pt-4 border-t border-surface-200">
          <p className="text-xs text-charcoal-400 font-semibold flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This preview updates as you fill the form
          </p>
        </div>
      </div>
    </div>
  )
}

