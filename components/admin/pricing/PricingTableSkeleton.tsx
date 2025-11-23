'use client'

export function TierTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-10 w-32 bg-gray-200 rounded"></div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </th>
              <th className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </th>
              <th className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </th>
              <th className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </th>
              <th className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3, 4].map((i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div className="h-10 bg-gray-200 rounded"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-10 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-10 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-10 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-5 w-5 bg-gray-200 rounded"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PrintPricingTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-10 w-32 bg-gray-200 rounded"></div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </th>
              <th className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </th>
              <th className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-28"></div>
              </th>
              <th className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </th>
              <th className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div className="h-10 bg-gray-200 rounded w-32"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-10 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-10 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-10 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-5 w-5 bg-gray-200 rounded"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ConfigSkeleton() {
  return (
    <div className="animate-pulse max-w-2xl">
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-5 w-40 bg-gray-200 rounded mb-3"></div>
            <div className="h-10 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

