'use client'

interface FormProgressProps {
  completionPercentage: number
  sections: {
    id: string
    label: string
    completed: boolean
    required: boolean
  }[]
  totalRequired: number
  completedRequired: number
}

export default function FormProgress({
  completionPercentage,
  sections,
  totalRequired,
  completedRequired
}: FormProgressProps) {
  return (
    <div className="bento-card border-2 border-surface-300 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Progress Bar Section */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-black text-charcoal-700">Form Progress</h3>
              <span className="text-2xl font-black text-primary-600">
                {completionPercentage}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-charcoal-500">
                {completedRequired}/{totalRequired} required
              </span>
              {completedRequired === totalRequired && (
                <span className="inline-flex items-center gap-1 bg-success-100 text-success-700 px-3 py-1 rounded-full text-xs font-black">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Ready
                </span>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative w-full h-3 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            >
              {completionPercentage > 10 && (
                <div className="absolute inset-0 flex items-center justify-end pr-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sections Checklist */}
        <div className="md:w-64">
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  section.completed
                    ? 'bg-success-50 border border-success-200'
                    : section.required
                    ? 'bg-warning-50 border border-warning-200'
                    : 'bg-surface-100 border border-surface-200'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                    section.completed
                      ? 'bg-success-500'
                      : section.required
                      ? 'bg-warning-400'
                      : 'bg-surface-300'
                  }`}
                >
                  {section.completed ? (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span
                  className={`text-xs font-bold ${
                    section.completed
                      ? 'text-success-700'
                      : section.required
                      ? 'text-warning-700'
                      : 'text-charcoal-500'
                  }`}
                >
                  {section.label}
                  {section.required && !section.completed && (
                    <span className="ml-1 text-warning-600">*</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Helper Text */}
      {completedRequired < totalRequired && (
        <div className="mt-4 pt-4 border-t border-surface-200">
          <p className="text-xs text-charcoal-500 font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-warning-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Complete all required fields to submit the form
          </p>
        </div>
      )}
    </div>
  )
}

