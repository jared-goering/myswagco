'use client'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  disabled?: boolean
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  disabled = false
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
        {description}
      </p>
      <button
        onClick={onAction}
        disabled={disabled}
        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg 
          className="w-5 h-5 mr-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 4v16m8-8H4" 
          />
        </svg>
        {actionLabel}
      </button>
    </div>
  )
}

