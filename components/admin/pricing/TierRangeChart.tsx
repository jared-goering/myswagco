'use client'

import { PricingTier } from '@/types'

interface TierRangeChartProps {
  tiers: PricingTier[]
  editedTiers?: Record<string, Partial<PricingTier>>
  minOrderQuantity?: number
}

export default function TierRangeChart({ tiers, editedTiers = {}, minOrderQuantity = 1 }: TierRangeChartProps) {
  if (tiers.length === 0) return null

  // Merge edited values with actual tier values for live preview
  const displayTiers = tiers.map(tier => {
    const edited = editedTiers[tier.id]
    if (!edited) return tier
    
    return {
      ...tier,
      name: edited.name !== undefined ? edited.name : tier.name,
      min_qty: edited.min_qty !== undefined ? edited.min_qty : tier.min_qty,
      max_qty: edited.max_qty !== undefined ? edited.max_qty : tier.max_qty,
      garment_markup_percentage: edited.garment_markup_percentage !== undefined ? edited.garment_markup_percentage : tier.garment_markup_percentage
    }
  })

  // Sort tiers by min_qty
  const sortedTiers = [...displayTiers].sort((a, b) => a.min_qty - b.min_qty)
  
  // Find the maximum value for scaling
  const maxQty = Math.max(
    ...sortedTiers.map(t => t.max_qty || 500), // Use 500 as default max for open-ended tiers
    200 // Minimum scale
  )
  
  // Use minOrderQuantity as the starting point for visualization
  const scaleMin = Math.min(minOrderQuantity, sortedTiers[0]?.min_qty || 0)
  
  // Detect gaps and overlaps
  const gaps: Array<{start: number, end: number}> = []
  const overlaps: Array<{tier1: string, tier2: string}> = []
  
  for (let i = 0; i < sortedTiers.length - 1; i++) {
    const current = sortedTiers[i]
    const next = sortedTiers[i + 1]
    const currentMax = current.max_qty || Infinity
    
    if (currentMax === Infinity) continue
    
    if (currentMax + 1 < next.min_qty) {
      // Gap detected
      gaps.push({ start: currentMax + 1, end: next.min_qty - 1 })
    } else if (currentMax >= next.min_qty) {
      // Overlap detected
      overlaps.push({ tier1: current.name, tier2: next.name })
    }
  }
  
  // Check if there's a gap at the start (only if it's above the minimum order quantity)
  if (sortedTiers[0].min_qty > minOrderQuantity) {
    gaps.unshift({ start: minOrderQuantity, end: sortedTiers[0].min_qty - 1 })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                Tier Coverage Visualization
                {Object.keys(editedTiers).length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    Live Preview
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {Object.keys(editedTiers).length > 0 
                  ? 'Showing live preview of your changes'
                  : 'Visual representation of your quantity tiers and their ranges'
                }
              </p>
            </div>
            {minOrderQuantity > 1 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-gray-700">
                  Min order: {minOrderQuantity}
                </span>
              </div>
            )}
          </div>
          
          {(gaps.length > 0 || overlaps.length > 0) && (
            <div className="flex items-center gap-2">
              {gaps.length > 0 && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                  {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
                </span>
              )}
              {overlaps.length > 0 && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                  {overlaps.length} overlap{overlaps.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-6">
        <div className="space-y-4">
          {sortedTiers.map((tier, index) => {
            const startPercent = (tier.min_qty / maxQty) * 100
            const endQty = tier.max_qty || maxQty
            const widthPercent = ((endQty - tier.min_qty) / maxQty) * 100
            const isOpenEnded = tier.max_qty === null
            const hasEdits = !!editedTiers[tier.id]
            
            // Color based on markup percentage
            const markup = tier.garment_markup_percentage
            let colorClass = 'bg-blue-500'
            let bgColorClass = 'bg-blue-50'
            if (markup >= 50) {
              colorClass = 'bg-red-500'
              bgColorClass = 'bg-red-50'
            } else if (markup >= 40) {
              colorClass = 'bg-orange-500'
              bgColorClass = 'bg-orange-50'
            } else if (markup >= 30) {
              colorClass = 'bg-yellow-500'
              bgColorClass = 'bg-yellow-50'
            } else {
              colorClass = 'bg-green-500'
              bgColorClass = 'bg-green-50'
            }

            return (
              <div key={tier.id} className={`relative transition-all ${hasEdits ? 'ring-2 ring-amber-400 rounded-lg p-2 bg-amber-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 min-w-[140px]">
                      {tier.name}
                      {hasEdits && (
                        <svg className="inline-block w-4 h-4 ml-1 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      )}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {tier.min_qty} - {isOpenEnded ? '∞' : tier.max_qty} pieces
                    </span>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-900">
                    {tier.garment_markup_percentage}% markup
                  </span>
                </div>
                
                <div className={`relative h-10 ${bgColorClass} rounded-lg overflow-hidden border ${hasEdits ? 'border-amber-400 border-2' : 'border-gray-200'}`}>
                  <div
                    className={`absolute h-full ${colorClass} transition-all duration-300 flex items-center justify-end px-3 shadow-sm ${
                      isOpenEnded ? 'bg-gradient-to-r from-current via-current to-transparent' : ''
                    }`}
                    style={{
                      left: `${startPercent}%`,
                      width: isOpenEnded ? `${100 - startPercent}%` : `${widthPercent}%`
                    }}
                  >
                    {isOpenEnded && (
                      <span className="text-sm font-bold text-white drop-shadow">
                        ∞
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Scale */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="relative h-8 flex items-end">
            <div className="absolute inset-x-0 bottom-0 flex justify-between">
              {[scaleMin, Math.floor((scaleMin + maxQty) / 4), Math.floor((scaleMin + maxQty) / 2), Math.floor(3 * maxQty / 4), maxQty].map((value, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-px h-2 bg-gray-300 mb-1"></div>
                  <span className="text-xs font-medium text-gray-600">
                    {idx === 4 ? `${value}+` : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <div className="px-6 pb-6">
        {gaps.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full flex-shrink-0">
                <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900 mb-1">Coverage Gaps Detected</p>
                <p className="text-xs text-yellow-700">
                  The following quantity ranges are not covered by any tier:
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {gaps.map((gap, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md bg-yellow-100 border border-yellow-300 text-xs font-semibold text-yellow-900">
                      {gap.start}-{gap.end} pieces
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {overlaps.length > 0 && (
          <div className={`p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm ${gaps.length > 0 ? 'mt-3' : ''}`}>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full flex-shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 mb-1">Tier Overlaps Detected</p>
                <p className="text-xs text-red-700">
                  {overlaps.map((overlap, i) => (
                    <span key={i} className="block">
                      {overlap.tier1} ↔ {overlap.tier2}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        )}

        {gaps.length === 0 && overlaps.length === 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900">Perfect Coverage</p>
                <p className="text-xs text-green-700 mt-0.5">
                  All valid order quantities ({minOrderQuantity}+) are properly covered with no gaps or overlaps
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

