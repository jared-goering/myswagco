'use client'

import { useState } from 'react'

interface ColorGridProps {
  colors: string[]
  colorImages: Record<string, string>
  colorImagePreviews: Record<string, string>
  onAddColor: (color: string) => void
  onRemoveColor: (color: string) => void
  onImageChange: (color: string, file: File) => void
  onReorder?: (colors: string[]) => void
  errors?: string
}

export default function ColorGrid({
  colors,
  colorImages,
  colorImagePreviews,
  onAddColor,
  onRemoveColor,
  onImageChange,
  onReorder,
  errors
}: ColorGridProps) {
  const [colorInput, setColorInput] = useState('')
  const [isAddingColor, setIsAddingColor] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  function handleAddColor() {
    if (colorInput.trim()) {
      onAddColor(colorInput.trim())
      setColorInput('')
      setIsAddingColor(false)
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddColor()
    } else if (e.key === 'Escape') {
      setColorInput('')
      setIsAddingColor(false)
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newColors = [...colors]
    const draggedColor = newColors[draggedIndex]
    newColors.splice(draggedIndex, 1)
    newColors.splice(index, 0, draggedColor)

    onReorder?.(newColors)
    setDraggedIndex(index)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-black text-charcoal-700">Available Colors</h3>
          <span className="text-xs font-bold text-charcoal-400 bg-surface-100 px-3 py-1 rounded-full">
            {colors.length} {colors.length === 1 ? 'color' : 'colors'}
          </span>
        </div>
        {!isAddingColor && (
          <button
            type="button"
            onClick={() => setIsAddingColor(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-bold text-sm hover:bg-primary-600 transition-all shadow-soft hover:shadow-soft-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Color
          </button>
        )}
      </div>

      {errors && (
        <div className="mb-4 p-3 bg-error-50 border-2 border-error-200 rounded-xl">
          <p className="text-sm font-bold text-error-700">{errors}</p>
        </div>
      )}

      {/* Color Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Add Color Card */}
        {isAddingColor && (
          <div className="bento-item border-2 border-primary-300 bg-primary-50/50">
            <div className="space-y-3">
              <input
                type="text"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Color name..."
                autoFocus
                className="w-full px-3 py-2 border-2 border-surface-300 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none text-sm font-bold"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddColor}
                  disabled={!colorInput.trim()}
                  className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-lg font-bold text-sm hover:bg-primary-600 disabled:bg-surface-300 disabled:cursor-not-allowed transition-all"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setColorInput('')
                    setIsAddingColor(false)
                  }}
                  className="px-3 py-2 bg-surface-200 text-charcoal-600 rounded-lg font-bold text-sm hover:bg-surface-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Color Cards */}
        {colors.map((color, index) => (
          <div
            key={color}
            draggable={onReorder !== undefined}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`group relative bento-item hover:shadow-soft-lg transition-all duration-200 ${
              draggedIndex === index ? 'opacity-50' : ''
            } ${onReorder ? 'cursor-move' : ''}`}
          >
            {/* Image Preview */}
            <div className="mb-3 relative">
              {colorImagePreviews[color] ? (
                <div className="relative">
                  <img
                    src={colorImagePreviews[color]}
                    alt={color}
                    className="w-full h-32 object-cover rounded-xl border-2 border-surface-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-xl transition-all duration-200 flex items-center justify-center">
                    <label className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onImageChange(color, file)
                        }}
                        className="hidden"
                      />
                      <div className="px-4 py-2 bg-white rounded-lg font-bold text-sm shadow-bento flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Change
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) onImageChange(color, file)
                    }}
                    className="hidden"
                  />
                  <div className="w-full h-32 bg-surface-100 border-2 border-dashed border-surface-300 rounded-xl flex flex-col items-center justify-center hover:border-primary-400 hover:bg-primary-50/50 transition-all group">
                    <svg className="w-8 h-8 text-surface-400 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs font-bold text-charcoal-400 mt-1">Upload</p>
                  </div>
                </label>
              )}
            </div>

            {/* Color Name */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-black text-charcoal-700 text-sm truncate">{color}</h4>
              <button
                type="button"
                onClick={() => onRemoveColor(color)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-error-100 rounded-lg"
                title="Remove color"
              >
                <svg className="w-4 h-4 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-1">
              {colorImagePreviews[color] ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-success-700 bg-success-100 px-2 py-1 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Image
                </span>
              ) : (
                <span className="text-xs font-bold text-warning-700 bg-warning-100 px-2 py-1 rounded-full">
                  No image
                </span>
              )}
            </div>

            {/* Drag Handle */}
            {onReorder && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-1 bg-white/90 rounded-lg shadow-soft">
                  <svg className="w-4 h-4 text-charcoal-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {colors.length === 0 && !isAddingColor && (
          <div className="col-span-2 md:col-span-3 lg:col-span-4 bento-item border-2 border-dashed border-surface-300 bg-surface-50 text-center py-12">
            <svg className="w-16 h-16 mx-auto text-surface-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <h3 className="text-lg font-black text-charcoal-600 mb-2">No Colors Added Yet</h3>
            <p className="text-sm text-charcoal-400 font-semibold mb-4">
              Add colors to make this garment available to customers
            </p>
            <button
              type="button"
              onClick={() => setIsAddingColor(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-all shadow-soft hover:shadow-soft-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add First Color
            </button>
          </div>
        )}
      </div>

      {/* Helper Text */}
      {colors.length > 0 && (
        <p className="mt-4 text-xs text-charcoal-400 font-semibold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {onReorder ? 'Drag to reorder colors. ' : ''}Click on image areas to upload or change color photos. JPEG, PNG, WebP (max 5MB)
        </p>
      )}
    </div>
  )
}

