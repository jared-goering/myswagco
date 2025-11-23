'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { PricingTier, PrintPricing, AppConfig } from '@/types'
import Toast from '@/components/Toast'
import DeleteConfirmModal from '@/components/admin/pricing/DeleteConfirmModal'
import EmptyState from '@/components/admin/pricing/EmptyState'
import { TierTableSkeleton, PrintPricingTableSkeleton, ConfigSkeleton } from '@/components/admin/pricing/PricingTableSkeleton'
import Tooltip from '@/components/admin/pricing/Tooltip'
import TierRangeChart from '@/components/admin/pricing/TierRangeChart'

export default function AdminPricing() {
  const [activeTab, setActiveTab] = useState<'tiers' | 'print' | 'config'>('tiers')
  
  // Pricing Tiers State
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [editedTiers, setEditedTiers] = useState<Record<string, Partial<PricingTier>>>({})
  const [newTier, setNewTier] = useState<Partial<PricingTier> | null>(null)
  
  // Print Pricing State
  const [printPricing, setPrintPricing] = useState<PrintPricing[]>([])
  const [editedPricing, setEditedPricing] = useState<Record<string, Partial<PrintPricing>>>({})
  const [newPricing, setNewPricing] = useState<Partial<PrintPricing> | null>(null)
  
  // App Config State
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)
  const [editedConfig, setEditedConfig] = useState<Partial<AppConfig>>({})
  
  // UI State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; visible: boolean }>({ 
    message: '', 
    type: 'info', 
    visible: false 
  })
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    type: 'tier' | 'pricing' | null
    id: string
    name: string
    impactMessage?: string
  }>({
    isOpen: false,
    type: null,
    id: '',
    name: ''
  })
  
  // Validation Errors State
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({})
  
  // Edit Mode State
  const [tierEditMode, setTierEditMode] = useState(false)
  const [pricingEditMode, setPricingEditMode] = useState(false)
  const [configEditMode, setConfigEditMode] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      
      // Fetch pricing tiers
      const tiersRes = await fetch('/api/pricing-tiers')
      if (tiersRes.ok) {
        const tiersData = await tiersRes.json()
        setTiers(tiersData)
      }

      // Fetch print pricing
      const printRes = await fetch('/api/print-pricing')
      if (printRes.ok) {
        const printData = await printRes.json()
        setPrintPricing(printData)
      }

      // Fetch app config
      const configRes = await fetch('/api/app-config')
      if (configRes.ok) {
        const configData = await configRes.json()
        setAppConfig(configData)
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error)
      showToast('Failed to fetch pricing data', 'error')
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    setToast({ message, type, visible: true })
  }

  // === PRICING TIERS FUNCTIONS ===
  
  function validateTierField(tierId: string, field: keyof PricingTier, value: any): string | null {
    if (field === 'name' && (!value || value.trim() === '')) {
      return 'Tier name is required'
    }
    if (field === 'min_qty' && (value === undefined || value < 0)) {
      return 'Minimum quantity must be 0 or greater'
    }
    if (field === 'max_qty' && value !== null) {
      const tier = tiers.find(t => t.id === tierId)
      const minQty = editedTiers[tierId]?.min_qty ?? tier?.min_qty ?? 0
      if (value <= minQty) {
        return 'Maximum quantity must be greater than minimum'
      }
    }
    if (field === 'garment_markup_percentage' && (value === undefined || value < 0)) {
      return 'Markup percentage must be 0 or greater'
    }
    return null
  }

  function updateTierField(tierId: string, field: keyof PricingTier, value: any) {
    setEditedTiers(prev => ({
      ...prev,
      [tierId]: {
        ...prev[tierId],
        [field]: value
      }
    }))
    
    // Clear validation error for this field
    const error = validateTierField(tierId, field, value)
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      if (!newErrors[tierId]) newErrors[tierId] = {}
      if (error) {
        newErrors[tierId][field] = error
      } else {
        delete newErrors[tierId][field]
      }
      if (Object.keys(newErrors[tierId]).length === 0) {
        delete newErrors[tierId]
      }
      return newErrors
    })
  }

  function addNewTierRow() {
    setNewTier({
      name: '',
      min_qty: 0,
      max_qty: null,
      garment_markup_percentage: 0
    })
  }

  function cancelNewTier() {
    setNewTier(null)
  }

  async function saveNewTier() {
    if (!newTier || !newTier.name || newTier.min_qty === undefined || newTier.garment_markup_percentage === undefined) {
      showToast('Please fill in all required fields', 'warning')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/pricing-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTier)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create tier')
      }

      const created = await response.json()
      setTiers(prev => [...prev, created].sort((a, b) => a.min_qty - b.min_qty))
      setNewTier(null)
      showToast('Pricing tier created successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to create pricing tier', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveTierChanges() {
    try {
      setSaving(true)
      const updates = Object.entries(editedTiers)
      
      for (const [tierId, changes] of updates) {
        const response = await fetch('/api/pricing-tiers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tierId, ...changes })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update tier')
        }

        const updated = await response.json()
        setTiers(prev => prev.map(t => t.id === tierId ? updated : t))
      }

      setEditedTiers({})
      setTierEditMode(false)
      showToast('Changes saved successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to save changes', 'error')
    } finally {
      setSaving(false)
    }
  }

  function openDeleteTierModal(tierId: string, tierName: string) {
    // Check if any garments use this tier (we'll add a simple message for now)
    setDeleteModal({
      isOpen: true,
      type: 'tier',
      id: tierId,
      name: tierName,
      impactMessage: 'Garments using this tier will need to be reassigned.'
    })
  }

  async function handleConfirmDelete() {
    if (!deleteModal.type || !deleteModal.id) return

    try {
      setSaving(true)
      
      if (deleteModal.type === 'tier') {
        const response = await fetch(`/api/pricing-tiers?id=${deleteModal.id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete tier')
        }

        setTiers(prev => prev.filter(t => t.id !== deleteModal.id))
        setEditedTiers(prev => {
          const newEdited = { ...prev }
          delete newEdited[deleteModal.id]
          return newEdited
        })
        showToast('Pricing tier deleted successfully', 'success')
      } else if (deleteModal.type === 'pricing') {
        const response = await fetch(`/api/print-pricing?id=${deleteModal.id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete print pricing')
        }

        setPrintPricing(prev => prev.filter(p => p.id !== deleteModal.id))
        setEditedPricing(prev => {
          const newEdited = { ...prev }
          delete newEdited[deleteModal.id]
          return newEdited
        })
        showToast('Print pricing deleted successfully', 'success')
      }
      
      setDeleteModal({ isOpen: false, type: null, id: '', name: '' })
    } catch (error: any) {
      showToast(error.message || 'Failed to delete', 'error')
    } finally {
      setSaving(false)
    }
  }

  function enterTierEditMode() {
    setTierEditMode(true)
  }

  function exitTierEditMode() {
    setTierEditMode(false)
    setEditedTiers({})
    setValidationErrors({})
    setNewTier(null)
  }

  function cancelTierChanges() {
    setEditedTiers({})
    setValidationErrors({})
    setTierEditMode(false)
    setNewTier(null)
  }

  // === PRINT PRICING FUNCTIONS ===
  
  function updatePricingField(pricingId: string, field: keyof PrintPricing, value: any) {
    setEditedPricing(prev => ({
      ...prev,
      [pricingId]: {
        ...prev[pricingId],
        [field]: value
      }
    }))
  }

  function addNewPricingRow() {
    if (tiers.length === 0) {
      showToast('Please create at least one pricing tier first', 'warning')
      return
    }
    setNewPricing({
      tier_id: tiers[0].id,
      num_colors: 1,
      cost_per_shirt: 0,
      setup_fee_per_screen: 0
    })
  }

  function cancelNewPricing() {
    setNewPricing(null)
  }

  async function saveNewPricing() {
    if (!newPricing || !newPricing.tier_id || newPricing.num_colors === undefined || 
        newPricing.cost_per_shirt === undefined || newPricing.setup_fee_per_screen === undefined) {
      showToast('Please fill in all required fields', 'warning')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/print-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPricing)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create print pricing')
      }

      const created = await response.json()
      setPrintPricing(prev => [...prev, created])
      setNewPricing(null)
      showToast('Print pricing created successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to create print pricing', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function savePricingChanges() {
    try {
      setSaving(true)
      const updates = Object.entries(editedPricing)
      
      for (const [pricingId, changes] of updates) {
        const response = await fetch('/api/print-pricing', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: pricingId, ...changes })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update print pricing')
        }

        const updated = await response.json()
        setPrintPricing(prev => prev.map(p => p.id === pricingId ? updated : p))
      }

      setEditedPricing({})
      setPricingEditMode(false)
      showToast('Changes saved successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to save changes', 'error')
    } finally {
      setSaving(false)
    }
  }

  function openDeletePricingModal(pricingId: string) {
    const pricing = printPricing.find(p => p.id === pricingId)
    const tier = tiers.find(t => t.id === pricing?.tier_id)
    const displayName = tier ? `${tier.name} - ${pricing?.num_colors} color(s)` : 'this print pricing entry'
    
    setDeleteModal({
      isOpen: true,
      type: 'pricing',
      id: pricingId,
      name: displayName
    })
  }

  function enterPricingEditMode() {
    setPricingEditMode(true)
  }

  function exitPricingEditMode() {
    setPricingEditMode(false)
    setEditedPricing({})
    setNewPricing(null)
  }

  function cancelPricingChanges() {
    setEditedPricing({})
    setPricingEditMode(false)
    setNewPricing(null)
  }

  // === APP CONFIG FUNCTIONS ===
  
  function updateConfigField(field: keyof AppConfig, value: any) {
    setEditedConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  async function saveConfigChanges() {
    if (Object.keys(editedConfig).length === 0) {
      showToast('No changes to save', 'info')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/app-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedConfig)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update configuration')
      }

      const updated = await response.json()
      setAppConfig(updated)
      setEditedConfig({})
      setConfigEditMode(false)
      showToast('Configuration saved successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to save configuration', 'error')
    } finally {
      setSaving(false)
    }
  }

  function enterConfigEditMode() {
    setConfigEditMode(true)
  }

  function exitConfigEditMode() {
    setConfigEditMode(false)
    setEditedConfig({})
  }

  function cancelConfigChanges() {
    setEditedConfig({})
    setConfigEditMode(false)
  }

  // === HELPER FUNCTIONS ===
  
  const hasTierChanges = Object.keys(editedTiers).length > 0
  const hasPricingChanges = Object.keys(editedPricing).length > 0
  const hasConfigChanges = Object.keys(editedConfig).length > 0

  if (loading) {
    return (
      <AdminLayout>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Pricing Configuration</h1>
          
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b">
              <nav className="flex">
                <button className="px-6 py-4 font-medium border-b-2 border-primary-600 text-primary-600">
                  Quantity Tiers
                </button>
                <button className="px-6 py-4 font-medium border-b-2 border-transparent text-gray-600">
                  Print Pricing
                </button>
                <button className="px-6 py-4 font-medium border-b-2 border-transparent text-gray-600">
                  General Config
                </button>
              </nav>
            </div>
            
            <div className="p-6">
              {activeTab === 'tiers' && <TierTableSkeleton />}
              {activeTab === 'print' && <PrintPricingTableSkeleton />}
              {activeTab === 'config' && <ConfigSkeleton />}
            </div>
          </div>
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
            {/* QUANTITY TIERS TAB */}
            {activeTab === 'tiers' && (
              <div>
                {tiers.length === 0 && !newTier ? (
                  <EmptyState
                    icon={
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    }
                    title="No pricing tiers yet"
                    description="Create your first quantity-based pricing tier to start defining garment markup percentages for different order volumes."
                    actionLabel="Add First Tier"
                    onAction={addNewTierRow}
                    disabled={saving}
                  />
                ) : (
                  <>
                    <div className="mb-6 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Define quantity ranges and their corresponding garment markup percentages.
                      </p>
                      <div className="flex items-center gap-3">
                        {!tierEditMode ? (
                          <button
                            onClick={enterTierEditMode}
                            disabled={saving}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Tiers
                          </button>
                        ) : (
                          <button
                            onClick={addNewTierRow}
                            disabled={newTier !== null || saving}
                            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add New Tier
                          </button>
                        )}
                      </div>
                    </div>

                    <TierRangeChart 
                      tiers={tiers} 
                      editedTiers={editedTiers}
                      minOrderQuantity={appConfig?.min_order_quantity || 1}
                    />

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                Tier Name
                                <Tooltip content="Descriptive name for this pricing tier">
                                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                </Tooltip>
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center justify-center gap-2">
                                Min Qty
                                <Tooltip content="Minimum order quantity for this tier">
                                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                </Tooltip>
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center justify-center gap-2">
                                Max Qty
                                <Tooltip content="Maximum order quantity (leave empty for unlimited)">
                                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                </Tooltip>
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center justify-center gap-2">
                                Garment Markup %
                                <Tooltip content="Markup percentage applied to base garment cost">
                                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                </Tooltip>
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tiers.map((tier, index) => {
                            const edited = editedTiers[tier.id] || {}
                            const displayName = edited.name !== undefined ? edited.name : tier.name
                            const displayMinQty = edited.min_qty !== undefined ? edited.min_qty : tier.min_qty
                            const displayMaxQty = edited.max_qty !== undefined ? edited.max_qty : tier.max_qty
                            const displayMarkup = edited.garment_markup_percentage !== undefined ? edited.garment_markup_percentage : tier.garment_markup_percentage
                            const hasEdits = !!editedTiers[tier.id]
                            const errors = validationErrors[tier.id] || {}
                            
                            return (
                              <tr 
                                key={tier.id} 
                                className={`transition-colors ${
                                  hasEdits ? 'bg-amber-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                } hover:bg-blue-50`}
                              >
                                {tierEditMode ? (
                                  <>
                                    <td className="px-6 py-4">
                                      <div>
                                        <input
                                          type="text"
                                          value={displayName}
                                          onChange={(e) => updateTierField(tier.id, 'name', e.target.value)}
                                          className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                                            errors.name ? 'border-red-300 bg-red-50' : hasEdits ? 'border-amber-400' : 'border-gray-300'
                                          }`}
                                        />
                                        {errors.name && (
                                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.name}
                                          </p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col items-center">
                                        <input
                                          type="number"
                                          value={displayMinQty}
                                          onChange={(e) => updateTierField(tier.id, 'min_qty', parseInt(e.target.value))}
                                          className={`w-28 border rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                                            errors.min_qty ? 'border-red-300 bg-red-50' : hasEdits ? 'border-amber-400' : 'border-gray-300'
                                          }`}
                                        />
                                        {errors.min_qty && (
                                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.min_qty}
                                          </p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col items-center">
                                        <input
                                          type="number"
                                          value={displayMaxQty || ''}
                                          onChange={(e) => updateTierField(tier.id, 'max_qty', e.target.value ? parseInt(e.target.value) : null)}
                                          placeholder="∞"
                                          className={`w-28 border rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                                            errors.max_qty ? 'border-red-300 bg-red-50' : hasEdits ? 'border-amber-400' : 'border-gray-300'
                                          }`}
                                        />
                                        {errors.max_qty && (
                                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.max_qty}
                                          </p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col items-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={displayMarkup}
                                            onChange={(e) => updateTierField(tier.id, 'garment_markup_percentage', parseFloat(e.target.value))}
                                            className={`w-24 border rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                                              errors.garment_markup_percentage ? 'border-red-300 bg-red-50' : hasEdits ? 'border-amber-400' : 'border-gray-300'
                                            }`}
                                          />
                                          <span className="text-gray-500">%</span>
                                        </div>
                                        {errors.garment_markup_percentage && (
                                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.garment_markup_percentage}
                                          </p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <button
                                        onClick={() => openDeleteTierModal(tier.id, tier.name)}
                                        disabled={saving}
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50 inline-flex"
                                        title="Delete tier"
                                      >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-6 py-4">
                                      <span className="text-gray-900 font-medium">{tier.name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-gray-700">{tier.min_qty}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-gray-700">{tier.max_qty || '∞'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-gray-700">{tier.garment_markup_percentage}%</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-gray-400 text-sm">—</span>
                                    </td>
                                  </>
                                )}
                              </tr>
                            )
                          })}
                      
                          {newTier && (
                            <tr className="bg-green-50 border-2 border-green-200">
                              <td className="px-6 py-4">
                                <input
                                  type="text"
                                  value={newTier.name || ''}
                                  onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                                  placeholder="e.g. Tier 1: 24-47"
                                  className="w-full border border-green-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                  autoFocus
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  <input
                                    type="number"
                                    value={newTier.min_qty || 0}
                                    onChange={(e) => setNewTier({ ...newTier, min_qty: parseInt(e.target.value) })}
                                    placeholder="0"
                                    className="w-28 border border-green-300 rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  <input
                                    type="number"
                                    value={newTier.max_qty || ''}
                                    onChange={(e) => setNewTier({ ...newTier, max_qty: e.target.value ? parseInt(e.target.value) : null })}
                                    placeholder="∞"
                                    className="w-28 border border-green-300 rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={newTier.garment_markup_percentage || 0}
                                    onChange={(e) => setNewTier({ ...newTier, garment_markup_percentage: parseFloat(e.target.value) })}
                                    placeholder="50"
                                    className="w-24 border border-green-300 rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                  />
                                  <span className="text-gray-500">%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={saveNewTier}
                                    disabled={saving}
                                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                                    title="Save new tier"
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={cancelNewTier}
                                    disabled={saving}
                                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                    title="Cancel"
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {tierEditMode && (hasTierChanges || newTier) && (
                      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full">
                              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-amber-900">
                                {newTier && !hasTierChanges ? 'Adding New Tier' : 'Unsaved Changes'}
                              </p>
                              <p className="text-sm text-amber-700">
                                {newTier && !hasTierChanges 
                                  ? 'Complete the form and save your new tier'
                                  : `You have ${Object.keys(editedTiers).length} tier(s) with unsaved changes`
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={exitTierEditMode}
                              disabled={saving}
                              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            {hasTierChanges && (
                              <button
                                onClick={saveTierChanges}
                                disabled={saving}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                {saving ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                                    </svg>
                                    Save Changes
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* PRINT PRICING TAB */}
            {activeTab === 'print' && (
              <div>
                {printPricing.length === 0 && !newPricing ? (
                  <EmptyState
                    icon={
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    }
                    title="No print pricing configured"
                    description="Set up print pricing for different color counts and quantity tiers. Each entry defines the cost per shirt and setup fees."
                    actionLabel="Add First Print Pricing"
                    onAction={addNewPricingRow}
                    disabled={tiers.length === 0 || saving}
                  />
                ) : (
                  <>
                    <div className="mb-6 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Configure print costs based on quantity tiers and number of ink colors.
                      </p>
                      {!pricingEditMode && (
                        <button
                          onClick={enterPricingEditMode}
                          disabled={saving}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Pricing
                        </button>
                      )}
                    </div>

                    {tiers.length === 0 && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <svg className="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Please create at least one pricing tier before adding print pricing.
                        </p>
                      </div>
                    )}

                    <div className="space-y-6">
                      {/* Group pricing by tier */}
                      {tiers.sort((a, b) => a.min_qty - b.min_qty).map((tier) => {
                        const tierPricing = printPricing.filter(p => p.tier_id === tier.id).sort((a, b) => a.num_colors - b.num_colors)
                        
                        if (tierPricing.length === 0 && (!newPricing || newPricing.tier_id !== tier.id)) {
                          return null
                        }
                        
                        return (
                          <div key={tier.id} className="overflow-x-auto rounded-lg border border-gray-200">
                            {/* Tier Header */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Quantity Range: {tier.min_qty} - {tier.max_qty || '∞'} pieces
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium text-blue-900">{tierPricing.length} price {tierPricing.length === 1 ? 'entry' : 'entries'}</span>
                                  </div>
                                  {pricingEditMode && (
                                    <button
                                      onClick={() => {
                                        setNewPricing({
                                          tier_id: tier.id,
                                          num_colors: 1,
                                          cost_per_shirt: 0,
                                          setup_fee_per_screen: 0
                                        })
                                      }}
                                      disabled={newPricing !== null || saving}
                                      className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                      Add Color
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-2">
                                      Colors
                                      <Tooltip content="Number of ink colors (1-4)">
                                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                      </Tooltip>
                                    </div>
                                  </th>
                                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-2">
                                      Cost Per Shirt
                                      <Tooltip content="Print cost per shirt for this configuration">
                                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                      </Tooltip>
                                    </div>
                                  </th>
                                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-2">
                                      Setup Fee/Screen
                                      <Tooltip content="One-time setup fee per screen">
                                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                      </Tooltip>
                                    </div>
                                  </th>
                                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {tierPricing.map((pricing, index) => {
                                  const edited = editedPricing[pricing.id] || {}
                                  const displayNumColors = edited.num_colors !== undefined ? edited.num_colors : pricing.num_colors
                                  const displayCostPerShirt = edited.cost_per_shirt !== undefined ? edited.cost_per_shirt : pricing.cost_per_shirt
                                  const displaySetupFee = edited.setup_fee_per_screen !== undefined ? edited.setup_fee_per_screen : pricing.setup_fee_per_screen
                                  const hasEdits = !!editedPricing[pricing.id]
                                  
                                  return (
                                    <tr 
                                      key={pricing.id} 
                                      className={`transition-colors ${
                                        hasEdits ? 'bg-amber-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                      } hover:bg-blue-50`}
                                    >
                                      <td className="px-6 py-4 text-center">
                                        {pricingEditMode ? (
                                          <input
                                            type="number"
                                            min="1"
                                            max="4"
                                            value={displayNumColors}
                                            onChange={(e) => updatePricingField(pricing.id, 'num_colors', parseInt(e.target.value))}
                                            className={`w-24 border rounded-md px-3 py-2 text-center mx-auto focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                                              hasEdits ? 'border-amber-400' : 'border-gray-300'
                                            }`}
                                          />
                                        ) : (
                                          <span className="text-gray-700">{displayNumColors}</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4">
                                        {pricingEditMode ? (
                                          <div className="flex items-center justify-center gap-2">
                                            <span className="text-gray-500">$</span>
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={displayCostPerShirt}
                                              onChange={(e) => updatePricingField(pricing.id, 'cost_per_shirt', parseFloat(e.target.value))}
                                              className={`w-28 border rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                                                hasEdits ? 'border-amber-400' : 'border-gray-300'
                                              }`}
                                            />
                                          </div>
                                        ) : (
                                          <span className="text-gray-700 block text-center">${displayCostPerShirt}</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4">
                                        {pricingEditMode ? (
                                          <div className="flex items-center justify-center gap-2">
                                            <span className="text-gray-500">$</span>
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={displaySetupFee}
                                              onChange={(e) => updatePricingField(pricing.id, 'setup_fee_per_screen', parseFloat(e.target.value))}
                                              className={`w-28 border rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                                                hasEdits ? 'border-amber-400' : 'border-gray-300'
                                              }`}
                                            />
                                          </div>
                                        ) : (
                                          <span className="text-gray-700 block text-center">${displaySetupFee}</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                        {pricingEditMode ? (
                                          <button
                                            onClick={() => openDeletePricingModal(pricing.id)}
                                            disabled={saving}
                                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50 inline-flex"
                                            title="Delete pricing"
                                          >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                          </button>
                                        ) : (
                                          <span className="text-gray-400 text-sm">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}

                                
                                {/* New Pricing Row for this tier */}
                                {newPricing && newPricing.tier_id === tier.id && (
                                  <tr className="bg-green-50 border-2 border-green-200">
                                    <td className="px-6 py-4">
                                      <div className="flex justify-center">
                                        <input
                                          type="number"
                                          min="1"
                                          max="4"
                                          value={newPricing.num_colors || 1}
                                          onChange={(e) => setNewPricing({ ...newPricing, num_colors: parseInt(e.target.value) })}
                                          className="w-24 border border-green-300 rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                          autoFocus
                                        />
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center justify-center gap-2">
                                        <span className="text-gray-500">$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={newPricing.cost_per_shirt || 0}
                                          onChange={(e) => setNewPricing({ ...newPricing, cost_per_shirt: parseFloat(e.target.value) })}
                                          placeholder="2.50"
                                          className="w-28 border border-green-300 rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center justify-center gap-2">
                                        <span className="text-gray-500">$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={newPricing.setup_fee_per_screen || 0}
                                          onChange={(e) => setNewPricing({ ...newPricing, setup_fee_per_screen: parseFloat(e.target.value) })}
                                          placeholder="25.00"
                                          className="w-28 border border-green-300 rounded-md px-3 py-2 text-center focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex justify-center gap-2">
                                        <button
                                          onClick={saveNewPricing}
                                          disabled={saving}
                                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                                          title="Save new pricing"
                                        >
                                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={cancelNewPricing}
                                          disabled={saving}
                                          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                          title="Cancel"
                                        >
                                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )
                      })}
                    </div>

                    {pricingEditMode && (hasPricingChanges || newPricing) && (
                      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full">
                              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-amber-900">
                                {newPricing && !hasPricingChanges ? 'Adding New Print Pricing' : 'Unsaved Changes'}
                              </p>
                              <p className="text-sm text-amber-700">
                                {newPricing && !hasPricingChanges 
                                  ? 'Complete the form and save your new print pricing'
                                  : `You have ${Object.keys(editedPricing).length} pricing entry(s) with unsaved changes`
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={exitPricingEditMode}
                              disabled={saving}
                              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            {hasPricingChanges && (
                              <button
                                onClick={savePricingChanges}
                                disabled={saving}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                {saving ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                                    </svg>
                                    Save Changes
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* GENERAL CONFIG TAB */}
            {activeTab === 'config' && appConfig && (
              <div className="max-w-4xl">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Configure general application settings that apply across all orders.
                  </p>
                  {!configEditMode && (
                    <button
                      onClick={enterConfigEditMode}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Configuration
                    </button>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <label className="block text-base font-semibold text-gray-900 mb-1">
                            Deposit Percentage
                          </label>
                          <p className="text-xs text-gray-600">
                            Percentage of total cost required as deposit at checkout
                          </p>
                        </div>
                        <Tooltip content="Customer pays this percentage upfront, remainder due before production">
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-[52px]">
                      {configEditMode ? (
                        <>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={editedConfig.deposit_percentage !== undefined ? editedConfig.deposit_percentage : appConfig.deposit_percentage}
                            onChange={(e) => updateConfigField('deposit_percentage', parseFloat(e.target.value))}
                            className={`border rounded-lg px-4 py-2.5 w-28 text-2xl font-bold text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                              editedConfig.deposit_percentage !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'
                            }`}
                          />
                          <span className="text-xl font-semibold text-gray-500">%</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-bold text-gray-900">
                            {appConfig.deposit_percentage}
                          </span>
                          <span className="text-xl font-semibold text-gray-500">%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg flex-shrink-0">
                          <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <label className="block text-base font-semibold text-gray-900 mb-1">
                            Minimum Order Quantity
                          </label>
                          <p className="text-xs text-gray-600">
                            Minimum number of pieces required per order
                          </p>
                        </div>
                        <Tooltip content="Orders below this quantity will not be accepted">
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-[52px]">
                      {configEditMode ? (
                        <>
                          <input
                            type="number"
                            min="1"
                            value={editedConfig.min_order_quantity !== undefined ? editedConfig.min_order_quantity : appConfig.min_order_quantity}
                            onChange={(e) => updateConfigField('min_order_quantity', parseInt(e.target.value))}
                            className={`border rounded-lg px-4 py-2.5 w-28 text-2xl font-bold text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                              editedConfig.min_order_quantity !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'
                            }`}
                          />
                          <span className="text-xl font-semibold text-gray-500">pieces</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-bold text-gray-900">
                            {appConfig.min_order_quantity}
                          </span>
                          <span className="text-xl font-semibold text-gray-500">pieces</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg flex-shrink-0">
                          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <label className="block text-base font-semibold text-gray-900 mb-1">
                            Maximum Ink Colors
                          </label>
                          <p className="text-xs text-gray-600">
                            Maximum number of ink colors allowed per print location
                          </p>
                        </div>
                        <Tooltip content="Each location can have up to this many colors">
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-[52px]">
                      {configEditMode ? (
                        <>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={editedConfig.max_ink_colors !== undefined ? editedConfig.max_ink_colors : appConfig.max_ink_colors}
                            onChange={(e) => updateConfigField('max_ink_colors', parseInt(e.target.value))}
                            className={`border rounded-lg px-4 py-2.5 w-28 text-2xl font-bold text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                              editedConfig.max_ink_colors !== undefined ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white'
                            }`}
                          />
                          <span className="text-xl font-semibold text-gray-500">colors</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-bold text-gray-900">
                            {appConfig.max_ink_colors}
                          </span>
                          <span className="text-xl font-semibold text-gray-500">colors</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {configEditMode && hasConfigChanges && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full">
                          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-amber-900">Unsaved Changes</p>
                          <p className="text-sm text-amber-700">You have unsaved configuration changes</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={exitConfigEditMode}
                          disabled={saving}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveConfigChanges}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {saving ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Saving...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                              </svg>
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast({ ...toast, visible: false })}
      />
      
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'tier' ? 'Delete Pricing Tier' : 'Delete Print Pricing'}
        itemName={deleteModal.name}
        impactMessage={deleteModal.impactMessage}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: null, id: '', name: '' })}
        isDeleting={saving}
      />
    </AdminLayout>
  )
}
