'use client'

import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid'
import { OrderStatus } from '@/types'

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus
  createdAt: string
  updatedAt: string
}

interface StatusStep {
  key: OrderStatus
  label: string
  description: string
}

const STATUS_STEPS: StatusStep[] = [
  {
    key: 'pending_art_review',
    label: 'Art Review',
    description: 'Awaiting artwork approval'
  },
  {
    key: 'art_approved',
    label: 'Approved',
    description: 'Art approved, ready for production'
  },
  {
    key: 'in_production',
    label: 'Production',
    description: 'Order being produced'
  },
  {
    key: 'ready_to_ship',
    label: 'Ready to Ship',
    description: 'Order ready for shipment'
  },
  {
    key: 'completed',
    label: 'Completed',
    description: 'Order delivered'
  }
]

// Special statuses that don't fit in the linear timeline
const SPECIAL_STATUSES: OrderStatus[] = ['art_revision_needed', 'balance_due', 'cancelled']

export default function OrderStatusTimeline({ 
  currentStatus, 
  createdAt, 
  updatedAt 
}: OrderStatusTimelineProps) {
  // Check if current status is special (not part of main timeline)
  const isSpecialStatus = SPECIAL_STATUSES.includes(currentStatus)
  
  // Find current step index in timeline
  const currentStepIndex = STATUS_STEPS.findIndex(step => step.key === currentStatus)
  
  // For special statuses, show timeline based on what would be expected
  const displayStepIndex = isSpecialStatus 
    ? (currentStatus === 'art_revision_needed' ? 0 : 
       currentStatus === 'balance_due' ? 2 : -1) 
    : currentStepIndex

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
      {/* Special Status Alert */}
      {isSpecialStatus && (
        <div className={`mb-6 p-4 rounded-lg ${
          currentStatus === 'cancelled' 
            ? 'bg-gray-50 border border-gray-200' 
            : currentStatus === 'art_revision_needed'
            ? 'bg-red-50 border border-red-200'
            : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-3 ${
              currentStatus === 'cancelled' ? 'bg-gray-400' :
              currentStatus === 'art_revision_needed' ? 'bg-red-500' :
              'bg-orange-500'
            }`} />
            <div>
              <p className={`font-semibold text-sm ${
                currentStatus === 'cancelled' ? 'text-gray-700' :
                currentStatus === 'art_revision_needed' ? 'text-red-700' :
                'text-orange-700'
              }`}>
                {currentStatus === 'cancelled' && 'Order Cancelled'}
                {currentStatus === 'art_revision_needed' && 'Artwork Revision Needed'}
                {currentStatus === 'balance_due' && 'Balance Payment Required'}
              </p>
              <p className={`text-xs mt-0.5 ${
                currentStatus === 'cancelled' ? 'text-gray-600' :
                currentStatus === 'art_revision_needed' ? 'text-red-600' :
                'text-orange-600'
              }`}>
                {currentStatus === 'cancelled' && 'This order has been cancelled'}
                {currentStatus === 'art_revision_needed' && 'Customer needs to revise and resubmit artwork'}
                {currentStatus === 'balance_due' && 'Waiting for final payment before proceeding'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" 
             style={{ marginLeft: '1.25rem', marginRight: '1.25rem' }} />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-green-500 transition-all duration-500"
          style={{ 
            marginLeft: '1.25rem',
            width: `calc(${(displayStepIndex / (STATUS_STEPS.length - 1)) * 100}% - 1.25rem)` 
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < displayStepIndex
            const isCurrent = index === displayStepIndex
            const isUpcoming = index > displayStepIndex

            return (
              <div key={step.key} className="flex flex-col items-center" style={{ flex: 1 }}>
                {/* Icon */}
                <div className={`
                  relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                  ${isCompleted ? 'bg-green-500 border-green-500' : ''}
                  ${isCurrent ? 'bg-white border-blue-500 ring-4 ring-blue-100' : ''}
                  ${isUpcoming ? 'bg-white border-gray-300' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  ) : isCurrent ? (
                    <ClockIcon className="w-5 h-5 text-blue-500" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                  )}
                </div>

                {/* Label */}
                <div className="mt-3 text-center max-w-[120px]">
                  <p className={`text-sm font-medium ${
                    isCurrent ? 'text-blue-600' : 
                    isCompleted ? 'text-green-600' : 
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  <p className={`text-xs mt-1 ${
                    isCurrent ? 'text-gray-600' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Timestamp Info */}
      <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <div>
          <span className="font-medium">Created:</span> {new Date(createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </div>
        <div>
          <span className="font-medium">Last Updated:</span> {new Date(updatedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}

