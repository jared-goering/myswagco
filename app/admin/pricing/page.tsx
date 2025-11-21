'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { PricingTier, PrintPricing } from '@/types'
import { supabase } from '@/lib/supabase/client'

export default function AdminPricing() {
  const [activeTab, setActiveTab] = useState<'tiers' | 'print' | 'config'>('tiers')
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [printPricing, setPrintPricing] = useState<PrintPricing[]>([])
  const [depositPercentage, setDepositPercentage] = useState(50)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Fetch pricing tiers
      const { data: tiersData } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('min_qty', { ascending: true })
      
      if (tiersData) setTiers(tiersData)

      // Fetch print pricing
      const { data: printData } = await supabase
        .from('print_pricing')
        .select('*')
        .order('tier_id, num_colors', { ascending: true })
      
      if (printData) setPrintPricing(printData)

      // Fetch app config
      const { data: configData } = await supabase
        .from('app_config')
        .select('deposit_percentage')
        .single()
      
      if (configData) setDepositPercentage(configData.deposit_percentage)
    } catch (error) {
      console.error('Error fetching pricing data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Pricing Configuration</h1>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('tiers')}
                className={`px-6 py-4 font-medium border-b-2 ${
                  activeTab === 'tiers'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Quantity Tiers
              </button>
              <button
                onClick={() => setActiveTab('print')}
                className={`px-6 py-4 font-medium border-b-2 ${
                  activeTab === 'print'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Print Pricing
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`px-6 py-4 font-medium border-b-2 ${
                  activeTab === 'config'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                General Config
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'tiers' && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    To modify pricing tiers, update the <code className="bg-blue-100 px-1 rounded">pricing_tiers</code> table in your Supabase dashboard.
                  </p>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Garment Markup %</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tiers.map((tier) => (
                      <tr key={tier.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{tier.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{tier.min_qty}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{tier.max_qty || '∞'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{tier.garment_markup_percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'print' && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    To modify print pricing, update the <code className="bg-blue-100 px-1 rounded">print_pricing</code> table in your Supabase dashboard.
                  </p>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colors</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Per Shirt</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Setup Fee/Screen</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {printPricing.map((pricing) => {
                      const tier = tiers.find(t => t.id === pricing.tier_id)
                      return (
                        <tr key={pricing.id}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {tier?.name || pricing.tier_id.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{pricing.num_colors}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">${pricing.cost_per_shirt.toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">${pricing.setup_fee_per_screen.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="max-w-2xl">
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    To modify general configuration, update the <code className="bg-blue-100 px-1 rounded">app_config</code> table in your Supabase dashboard.
                  </p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deposit Percentage
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={depositPercentage}
                        readOnly
                        className="border border-gray-300 rounded px-3 py-2 w-24 bg-gray-50"
                      />
                      <span className="ml-2 text-gray-600">%</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Current: {depositPercentage}% deposit required at checkout
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Order Quantity
                    </label>
                    <input
                      type="number"
                      value={24}
                      readOnly
                      className="border border-gray-300 rounded px-3 py-2 w-24 bg-gray-50"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Current: 24 pieces minimum per order
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Ink Colors
                    </label>
                    <input
                      type="number"
                      value={4}
                      readOnly
                      className="border border-gray-300 rounded px-3 py-2 w-24 bg-gray-50"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Current: Up to 4 colors per location
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

