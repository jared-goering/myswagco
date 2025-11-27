'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import OrderStatusTimeline from '@/components/admin/OrderStatusTimeline'
import ArtworkPreviewCard from '@/components/admin/ArtworkPreviewCard'
import DesignPreviewCard from '@/components/admin/DesignPreviewCard'
import { Order, OrderStatus, Garment } from '@/types'
import { 
  UserIcon, 
  ShoppingBagIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

export default function AdminOrderDetail() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [notes, setNotes] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [customerData, setCustomerData] = useState<any>({})
  const [editingOrder, setEditingOrder] = useState(false)
  const [orderData, setOrderData] = useState<any>({})
  const [availableGarments, setAvailableGarments] = useState<any[]>([])
  const [garment, setGarment] = useState<Garment | null>(null)
  const [orderGarments, setOrderGarments] = useState<Record<string, Garment>>({}) // For multi-garment orders

  useEffect(() => {
    fetchOrder()
    fetchGarments()
  }, [orderId])

  useEffect(() => {
    if (order) {
      setNotes(order.internal_notes || '')
      setCustomerData({
        customer_name: order.customer_name,
        email: order.email,
        phone: order.phone,
        shipping_address: order.shipping_address
      })
      setOrderData({
        garment_id: order.garment_id,
        garment_color: order.garment_color,
        size_quantities: order.size_quantities,
        print_config: order.print_config,
        selected_garments: order.selected_garments || null
      })
    }
  }, [order])

  async function fetchOrder() {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        
        // Fetch garments for multi-garment orders
        if (data.selected_garments && Object.keys(data.selected_garments).length > 0) {
          const garmentIds = Object.keys(data.selected_garments)
          const garmentMap: Record<string, Garment> = {}
          
          await Promise.all(garmentIds.map(async (id) => {
            try {
              const garmentResponse = await fetch(`/api/garments/${id}`)
              if (garmentResponse.ok) {
                const garmentData = await garmentResponse.json()
                garmentMap[id] = garmentData
              }
            } catch (err) {
              console.error(`Error fetching garment ${id}:`, err)
            }
          }))
          
          setOrderGarments(garmentMap)
          // Set primary garment
          if (data.garment_id && garmentMap[data.garment_id]) {
            setGarment(garmentMap[data.garment_id])
          }
        } else if (data.garment_id) {
          // Single garment order
          const garmentResponse = await fetch(`/api/garments/${data.garment_id}`)
          if (garmentResponse.ok) {
            const garmentData = await garmentResponse.json()
            setGarment(garmentData)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchGarments() {
    try {
      const response = await fetch('/api/garments')
      if (response.ok) {
        const data = await response.json()
        setAvailableGarments(data)
      }
    } catch (error) {
      console.error('Error fetching garments:', error)
    }
  }

  function handleStatusChange(newStatus: OrderStatus) {
    setPendingStatus(newStatus)
    setShowConfirmModal(true)
  }

  async function confirmStatusUpdate() {
    if (!pendingStatus) return
    
    setUpdating(true)
    setShowConfirmModal(false)
    
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pendingStatus })
      })

      if (response.ok) {
        await fetchOrder()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setUpdating(false)
      setPendingStatus(null)
    }
  }

  function cancelStatusUpdate() {
    setShowConfirmModal(false)
    setPendingStatus(null)
  }

  async function saveCustomerInfo() {
    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      })

      if (response.ok) {
        await fetchOrder()
        setEditingCustomer(false)
      }
    } catch (error) {
      console.error('Error updating customer info:', error)
    } finally {
      setUpdating(false)
    }
  }

  async function saveOrderDetails() {
    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        await fetchOrder()
        setEditingOrder(false)
      }
    } catch (error) {
      console.error('Error updating order details:', error)
    } finally {
      setUpdating(false)
    }
  }

  function cancelCustomerEdit() {
    setEditingCustomer(false)
    if (order) {
      setCustomerData({
        customer_name: order.customer_name,
        email: order.email,
        phone: order.phone,
        shipping_address: order.shipping_address
      })
    }
  }

  function cancelOrderEdit() {
    setEditingOrder(false)
    if (order) {
      setOrderData({
        garment_id: order.garment_id,
        garment_color: order.garment_color,
        size_quantities: order.size_quantities,
        print_config: order.print_config,
        selected_garments: order.selected_garments || null
      })
    }
  }

  async function saveNotes() {
    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: notes })
      })

      if (response.ok) {
        await fetchOrder()
      }
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setUpdating(false)
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

  if (!order) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Order not found</p>
          <Link href="/admin/orders" className="text-primary-600 hover:text-primary-700">
            Back to Orders
          </Link>
        </div>
      </AdminLayout>
    )
  }

  // Calculate total quantity from multi-garment, multi-color, or legacy structure
  const calculateTotalQuantity = () => {
    // Multi-garment orders
    if (order.selected_garments && Object.keys(order.selected_garments).length > 0) {
      return Object.values(order.selected_garments).reduce((total: number, selection: any) => {
        return total + Object.values(selection.colorSizeQuantities || {}).reduce((garmentTotal: number, sizeQty: any) => {
          return garmentTotal + Object.values(sizeQty).reduce((sum: number, qty) => sum + (qty as number || 0), 0)
        }, 0)
      }, 0)
    }
    // Multi-color orders
    if (order.color_size_quantities) {
      return Object.values(order.color_size_quantities).reduce((total: number, sizeQty: any) => {
        return total + Object.values(sizeQty).reduce((sum: number, qty) => sum + (qty as number || 0), 0)
      }, 0)
    }
    // Legacy single-color orders
    return Object.values(order.size_quantities || {}).reduce((sum: number, qty) => sum + (qty as number || 0), 0)
  }
  const totalQty = calculateTotalQuantity()
  
  // Get aggregated size quantities from all garments/colors
  const getAggregatedSizeQuantities = () => {
    const aggregated: Record<string, number> = {}
    
    // Multi-garment orders
    if (order.selected_garments && Object.keys(order.selected_garments).length > 0) {
      Object.values(order.selected_garments).forEach((selection: any) => {
        Object.values(selection.colorSizeQuantities || {}).forEach((sizeQty: any) => {
          Object.entries(sizeQty).forEach(([size, qty]) => {
            aggregated[size] = (aggregated[size] || 0) + (qty as number || 0)
          })
        })
      })
      return aggregated
    }
    
    // Multi-color orders
    if (order.color_size_quantities) {
      Object.values(order.color_size_quantities).forEach((sizeQty: any) => {
        Object.entries(sizeQty).forEach(([size, qty]) => {
          aggregated[size] = (aggregated[size] || 0) + (qty as number || 0)
        })
      })
      return aggregated
    }
    
    // Legacy single-color orders
    return order.size_quantities || {}
  }
  const aggregatedSizes = getAggregatedSizeQuantities()

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/orders" className="text-primary-600 hover:text-primary-700 text-sm mb-3 inline-flex items-center group">
            <span className="mr-1 group-hover:-translate-x-1 transition-transform">←</span>
            Back to Orders
          </Link>
          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Order #{order.id.slice(0, 8)}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {order.customer_name} • {order.email}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Status Timeline */}
        <OrderStatusTimeline 
          currentStatus={order.status}
          createdAt={order.created_at}
          updatedAt={order.updated_at}
        />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <UserIcon className="w-5 h-5 text-gray-700 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
                </div>
                {!editingCustomer ? (
                  <button
                    onClick={() => setEditingCustomer(true)}
                    className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <PencilIcon className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={cancelCustomerEdit}
                      disabled={updating}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveCustomerInfo}
                      disabled={updating}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
              
              {!editingCustomer ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Name</p>
                      <p className="text-gray-900 font-medium">{order.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Email</p>
                      <p className="text-gray-900 font-medium">{order.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Phone</p>
                      <p className="text-gray-900 font-medium">{order.phone}</p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Shipping Address</p>
                    <p className="text-gray-700 leading-relaxed">
                      {order.shipping_address.line1}<br />
                      {order.shipping_address.line2 && <>{order.shipping_address.line2}<br /></>}
                      {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={customerData.customer_name || ''}
                        onChange={(e) => setCustomerData({...customerData, customer_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={customerData.email || ''}
                        onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={customerData.phone || ''}
                        onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                      Shipping Address
                    </label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Address Line 1"
                        value={customerData.shipping_address?.line1 || ''}
                        onChange={(e) => setCustomerData({
                          ...customerData,
                          shipping_address: {...customerData.shipping_address, line1: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Address Line 2 (Optional)"
                        value={customerData.shipping_address?.line2 || ''}
                        onChange={(e) => setCustomerData({
                          ...customerData,
                          shipping_address: {...customerData.shipping_address, line2: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="City"
                          value={customerData.shipping_address?.city || ''}
                          onChange={(e) => setCustomerData({
                            ...customerData,
                            shipping_address: {...customerData.shipping_address, city: e.target.value}
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="State"
                          value={customerData.shipping_address?.state || ''}
                          onChange={(e) => setCustomerData({
                            ...customerData,
                            shipping_address: {...customerData.shipping_address, state: e.target.value}
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="ZIP"
                          value={customerData.shipping_address?.postal_code || ''}
                          onChange={(e) => setCustomerData({
                            ...customerData,
                            shipping_address: {...customerData.shipping_address, postal_code: e.target.value}
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <ShoppingBagIcon className="w-5 h-5 text-gray-700 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                </div>
                {!editingOrder ? (
                  <button
                    onClick={() => setEditingOrder(true)}
                    className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <PencilIcon className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={cancelOrderEdit}
                      disabled={updating}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveOrderDetails}
                      disabled={updating}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
              
              {!editingOrder ? (
                <div className="space-y-5">
                  {/* Multi-garment display */}
                  {order.selected_garments && Object.keys(order.selected_garments).length > 0 ? (
                    <div className="py-3">
                      <span className="text-sm text-gray-600 block mb-3">Garments ({Object.keys(order.selected_garments).length} styles)</span>
                      <div className="space-y-4">
                        {Object.entries(order.selected_garments).map(([garmentId, selection]: [string, any]) => {
                          const garmentInfo = orderGarments[garmentId]
                          const garmentQty = Object.values(selection.colorSizeQuantities || {}).reduce((total: number, sizeQty: any) => {
                            return total + Object.values(sizeQty).reduce((sum: number, qty) => sum + (qty as number || 0), 0)
                          }, 0)
                          
                          return (
                            <div key={garmentId} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-gray-900">{garmentInfo?.name || garmentId}</span>
                                <span className="text-sm font-medium text-gray-600">{garmentQty} pcs</span>
                              </div>
                              <div className="space-y-1">
                                {Object.entries(selection.colorSizeQuantities || {}).map(([color, sizeQty]: [string, any]) => {
                                  const colorQty = Object.values(sizeQty).reduce((sum: number, qty) => sum + (qty as number || 0), 0)
                                  return colorQty > 0 && (
                                    <div key={color} className="flex justify-between items-center text-sm">
                                      <span className="text-gray-600 ml-2">• {color}</span>
                                      <span className="text-gray-700">{colorQty} pcs</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Single garment display */}
                      <div className="flex justify-between items-center py-3">
                        <span className="text-sm text-gray-600">Garment</span>
                        <span className="font-semibold text-gray-900">{order.garments?.name || garment?.name || 'N/A'}</span>
                      </div>
                      <div className="py-3 border-t border-gray-100">
                        <span className="text-sm text-gray-600">Color{order.color_size_quantities && Object.keys(order.color_size_quantities).length > 1 ? 's' : ''}</span>
                        {order.color_size_quantities ? (
                          <div className="mt-2 space-y-1">
                            {Object.entries(order.color_size_quantities).map(([color, sizeQty]: [string, any]) => {
                              const colorQty = Object.values(sizeQty).reduce((sum: number, qty) => sum + (qty as number || 0), 0)
                              return (
                                <div key={color} className="flex justify-between items-center">
                                  <span className="text-sm text-gray-700">{color}</span>
                                  <span className="font-semibold text-gray-900">{colorQty} pcs</span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-900 float-right">{order.garment_color}</span>
                        )}
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center py-3 border-t border-gray-100">
                    <span className="text-sm text-gray-600">Total Quantity</span>
                    <span className="font-semibold text-gray-900">{totalQty} pieces</span>
                  </div>
                  <div className="pt-5 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Size Breakdown</p>
                    
                    {/* Detailed breakdown for multi-garment orders */}
                    {order.selected_garments && Object.keys(order.selected_garments).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(order.selected_garments).map(([garmentId, selection]: [string, any]) => {
                          const garmentInfo = orderGarments[garmentId]
                          return (
                            <div key={garmentId} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <p className="text-sm font-semibold text-gray-800 mb-2">{garmentInfo?.name || garmentId}</p>
                              <div className="space-y-2">
                                {Object.entries(selection.colorSizeQuantities || {}).map(([color, sizeQty]: [string, any]) => (
                                  <div key={color} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1.5">{color}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(sizeQty).map(([size, qty]) => {
                                        const quantity = qty as number
                                        return quantity > 0 && (
                                          <div key={size} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                            <span className="text-gray-500">{size}:</span>{' '}
                                            <span className="font-semibold text-gray-800">{quantity}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : order.color_size_quantities ? (
                      /* Breakdown for multi-color single-garment orders */
                      <div className="space-y-3">
                        {Object.entries(order.color_size_quantities).map(([color, sizeQty]: [string, any]) => (
                          <div key={color} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">{color}</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(sizeQty).map(([size, qty]) => {
                                const quantity = qty as number
                                return quantity > 0 && (
                                  <div key={size} className="bg-white border border-gray-200 px-2.5 py-1.5 rounded text-xs">
                                    <span className="text-gray-500">{size}:</span>{' '}
                                    <span className="font-semibold text-gray-800">{quantity}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Simple grid for legacy single-color orders */
                      <div className="grid grid-cols-4 gap-3">
                        {Object.entries(aggregatedSizes).map(([size, qty]) => {
                          const quantity = qty as number
                          return quantity > 0 && (
                            <div key={size} className="bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg text-center">
                              <div className="text-xs text-gray-500 mb-1">{size}</div>
                              <div className="font-semibold text-gray-900">{quantity}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="pt-5 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Print Locations</p>
                    <div className="space-y-2">
                      {Object.entries(order.print_config.locations).map(([location, config]: [string, any]) => 
                        config?.enabled && (
                          <div key={location} className="flex items-center justify-between bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg">
                            <span className="font-medium text-blue-900 capitalize">{location.replace('_', ' ')}</span>
                            <span className="text-sm text-blue-700">{config.num_colors} color{config.num_colors > 1 ? 's' : ''}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Multi-garment edit mode */}
                  {orderData.selected_garments && Object.keys(orderData.selected_garments).length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-3">
                        Garments ({Object.keys(orderData.selected_garments).length} styles)
                      </p>
                      <div className="space-y-4">
                        {Object.entries(orderData.selected_garments).map(([garmentId, selection]: [string, any]) => {
                          const garmentInfo = orderGarments[garmentId] || availableGarments.find(g => g.id === garmentId)
                          return (
                            <div key={garmentId} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Style</label>
                                  <select
                                    value={garmentId}
                                    onChange={(e) => {
                                      const newGarmentId = e.target.value
                                      if (newGarmentId && newGarmentId !== garmentId) {
                                        const newSelectedGarments = { ...orderData.selected_garments }
                                        newSelectedGarments[newGarmentId] = newSelectedGarments[garmentId]
                                        delete newSelectedGarments[garmentId]
                                        setOrderData({
                                          ...orderData,
                                          selected_garments: newSelectedGarments,
                                          garment_id: Object.keys(newSelectedGarments)[0]
                                        })
                                      }
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    {availableGarments.map((g) => (
                                      <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSelectedGarments = { ...orderData.selected_garments }
                                    delete newSelectedGarments[garmentId]
                                    setOrderData({
                                      ...orderData,
                                      selected_garments: Object.keys(newSelectedGarments).length > 0 ? newSelectedGarments : null,
                                      garment_id: Object.keys(newSelectedGarments)[0] || orderData.garment_id
                                    })
                                  }}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                              
                              {/* Colors for this garment */}
                              <div className="space-y-2">
                                {Object.entries(selection.colorSizeQuantities || {}).map(([color, sizeQty]: [string, any]) => (
                                  <div key={color} className="bg-white border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <input
                                        type="text"
                                        value={color}
                                        onChange={(e) => {
                                          const newColor = e.target.value
                                          const newColorSizeQtys = { ...selection.colorSizeQuantities }
                                          if (newColor !== color) {
                                            newColorSizeQtys[newColor] = newColorSizeQtys[color]
                                            delete newColorSizeQtys[color]
                                          }
                                          const newSelectedGarments = {
                                            ...orderData.selected_garments,
                                            [garmentId]: {
                                              ...selection,
                                              colorSizeQuantities: newColorSizeQtys,
                                              selectedColors: Object.keys(newColorSizeQtys)
                                            }
                                          }
                                          setOrderData({ ...orderData, selected_garments: newSelectedGarments })
                                        }}
                                        className="text-sm font-medium px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                        placeholder="Color name"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newColorSizeQtys = { ...selection.colorSizeQuantities }
                                          delete newColorSizeQtys[color]
                                          const newSelectedGarments = {
                                            ...orderData.selected_garments,
                                            [garmentId]: {
                                              ...selection,
                                              colorSizeQuantities: newColorSizeQtys,
                                              selectedColors: Object.keys(newColorSizeQtys)
                                            }
                                          }
                                          setOrderData({ ...orderData, selected_garments: newSelectedGarments })
                                        }}
                                        className="text-red-400 hover:text-red-600 text-xs"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-center">
                                      {Object.entries(sizeQty).map(([size, qty]) => (
                                        <div key={size} className="flex items-center space-x-1 bg-gray-50 rounded px-2 py-1">
                                          <label className="text-xs text-gray-500">{size}</label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={qty as number}
                                            onChange={(e) => {
                                              const newQty = parseInt(e.target.value) || 0
                                              const newColorSizeQtys = {
                                                ...selection.colorSizeQuantities,
                                                [color]: {
                                                  ...sizeQty,
                                                  [size]: newQty
                                                }
                                              }
                                              const newSelectedGarments = {
                                                ...orderData.selected_garments,
                                                [garmentId]: {
                                                  ...selection,
                                                  colorSizeQuantities: newColorSizeQtys
                                                }
                                              }
                                              setOrderData({ ...orderData, selected_garments: newSelectedGarments })
                                            }}
                                            className="w-14 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newSizeQty = { ...sizeQty }
                                              delete newSizeQty[size]
                                              const newColorSizeQtys = {
                                                ...selection.colorSizeQuantities,
                                                [color]: newSizeQty
                                              }
                                              const newSelectedGarments = {
                                                ...orderData.selected_garments,
                                                [garmentId]: {
                                                  ...selection,
                                                  colorSizeQuantities: newColorSizeQtys
                                                }
                                              }
                                              setOrderData({ ...orderData, selected_garments: newSelectedGarments })
                                            }}
                                            className="text-gray-400 hover:text-red-500 text-xs ml-1"
                                            title="Remove size"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                      {/* Add Size Button */}
                                      <div className="relative">
                                        <select
                                          onChange={(e) => {
                                            const newSize = e.target.value
                                            if (newSize && !sizeQty[newSize]) {
                                              const newColorSizeQtys = {
                                                ...selection.colorSizeQuantities,
                                                [color]: {
                                                  ...sizeQty,
                                                  [newSize]: 0
                                                }
                                              }
                                              const newSelectedGarments = {
                                                ...orderData.selected_garments,
                                                [garmentId]: {
                                                  ...selection,
                                                  colorSizeQuantities: newColorSizeQtys
                                                }
                                              }
                                              setOrderData({ ...orderData, selected_garments: newSelectedGarments })
                                            }
                                            e.target.value = '' // Reset select
                                          }}
                                          className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded bg-white text-gray-500 hover:border-blue-400 hover:text-blue-500 cursor-pointer"
                                          defaultValue=""
                                        >
                                          <option value="" disabled>+ Add Size</option>
                                          {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'].filter(s => !sizeQty[s]).map(size => (
                                            <option key={size} value={size}>{size}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {/* Add Color Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const gmt = orderGarments[garmentId] || availableGarments.find(g => g.id === garmentId)
                                    const usedColors = Object.keys(selection.colorSizeQuantities || {})
                                    const availableColors = gmt?.available_colors?.filter((c: string) => !usedColors.includes(c)) || []
                                    const newColor = availableColors[0] || `Color ${usedColors.length + 1}`
                                    
                                    const newColorSizeQtys = {
                                      ...selection.colorSizeQuantities,
                                      [newColor]: { S: 0, M: 0, L: 0, XL: 0 }
                                    }
                                    const newSelectedGarments = {
                                      ...orderData.selected_garments,
                                      [garmentId]: {
                                        ...selection,
                                        colorSizeQuantities: newColorSizeQtys,
                                        selectedColors: Object.keys(newColorSizeQtys)
                                      }
                                    }
                                    setOrderData({ ...orderData, selected_garments: newSelectedGarments })
                                  }}
                                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  + Add Color
                                </button>
                              </div>
                            </div>
                          )
                        })}
                        
                        {/* Add New Garment Style Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const usedGarmentIds = Object.keys(orderData.selected_garments || {})
                            const availableGarmentsToAdd = availableGarments.filter(g => !usedGarmentIds.includes(g.id))
                            if (availableGarmentsToAdd.length > 0) {
                              const newGarment = availableGarmentsToAdd[0]
                              const defaultColor = newGarment.available_colors?.[0] || 'Default'
                              const newSelectedGarments = {
                                ...orderData.selected_garments,
                                [newGarment.id]: {
                                  selectedColors: [defaultColor],
                                  colorSizeQuantities: {
                                    [defaultColor]: { S: 0, M: 0, L: 0, XL: 0 }
                                  }
                                }
                              }
                              setOrderData({ ...orderData, selected_garments: newSelectedGarments })
                            }
                          }}
                          className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                          + Add Another Garment Style
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Single garment edit mode */
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                          Garment
                        </label>
                        <select
                          value={orderData.garment_id || ''}
                          onChange={(e) => {
                            const selectedGarment = availableGarments.find(g => g.id === e.target.value)
                            setOrderData({
                              ...orderData,
                              garment_id: e.target.value,
                              garment_color: selectedGarment?.color || orderData.garment_color
                            })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Garment</option>
                          {availableGarments.map((garment) => (
                            <option key={garment.id} value={garment.id}>
                              {garment.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                          Garment Color
                        </label>
                        <input
                          type="text"
                          value={orderData.garment_color || ''}
                          onChange={(e) => setOrderData({...orderData, garment_color: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-3">Size Breakdown</p>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(orderData.size_quantities || {}).map(([size, qty]) => (
                            <div key={size} className="flex items-center space-x-2">
                              <label className="text-sm text-gray-600 w-16">{size}</label>
                              <input
                                type="number"
                                min="0"
                                value={qty as number}
                                onChange={(e) => setOrderData({
                                  ...orderData,
                                  size_quantities: {
                                    ...orderData.size_quantities,
                                    [size]: parseInt(e.target.value) || 0
                                  }
                                })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-3">Print Locations</p>
                    <div className="space-y-2">
                      {orderData.print_config && Object.entries(orderData.print_config.locations).map(([location, config]: [string, any]) => (
                        <div key={location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={config?.enabled || false}
                              onChange={(e) => {
                                const newConfig = {...orderData.print_config}
                                newConfig.locations[location] = {
                                  ...config,
                                  enabled: e.target.checked
                                }
                                setOrderData({
                                  ...orderData,
                                  print_config: newConfig
                                })
                              }}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm font-medium capitalize">{location.replace('_', ' ')}</span>
                          </label>
                          {config?.enabled && (
                            <input
                              type="number"
                              min="1"
                              max="6"
                              value={config.num_colors || 1}
                              onChange={(e) => {
                                const newConfig = {...orderData.print_config}
                                newConfig.locations[location] = {
                                  ...config,
                                  num_colors: parseInt(e.target.value) || 1
                                }
                                setOrderData({
                                  ...orderData,
                                  print_config: newConfig
                                })
                              }}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Colors"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Design Preview */}
            <DesignPreviewCard 
              artworkFiles={order.artwork_files || []} 
              garment={garment}
              orderColors={order.color_size_quantities ? Object.keys(order.color_size_quantities) : [order.garment_color].filter(Boolean)}
              orderGarments={Object.keys(orderGarments).length > 0 ? orderGarments : undefined}
              selectedGarments={order.selected_garments}
            />

            {/* Artwork Files */}
            <ArtworkPreviewCard files={order.artwork_files || []} />

            {/* Internal Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
              <div className="flex items-center mb-6">
                <DocumentTextIcon className="w-5 h-5 text-gray-700 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Internal Notes</h2>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 h-40 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                placeholder="Add internal notes about this order..."
              />
              <button
                onClick={saveNotes}
                disabled={updating}
                className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {updating ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Status Management */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Update Status</h3>
              <select
                value={pendingStatus || order.status}
                onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                disabled={updating}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="pending_art_review">Pending Art Review</option>
                <option value="art_approved">Art Approved</option>
                <option value="art_revision_needed">Art Revision Needed</option>
                <option value="in_production">In Production</option>
                <option value="balance_due">Balance Due</option>
                <option value="ready_to_ship">Ready to Ship</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {updating && (
                <p className="text-xs text-gray-500 mt-2">Updating status...</p>
              )}
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center mb-5">
                <CurrencyDollarIcon className="w-5 h-5 text-gray-700 mr-2" />
                <h3 className="text-base font-semibold text-gray-900">Payment</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Cost</span>
                  <span className="text-lg font-bold text-gray-900">${order.total_cost.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Deposit</span>
                    <div className="flex items-center">
                      {order.deposit_paid ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1.5" />
                          <span className="text-sm font-semibold text-green-600">
                            ${order.deposit_amount.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <>
                          <ExclamationCircleIcon className="w-4 h-4 text-red-500 mr-1.5" />
                          <span className="text-sm font-semibold text-red-600">
                            ${order.deposit_amount.toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {!order.deposit_paid && (
                    <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Unpaid</p>
                  )}
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Balance Due</span>
                    <span className="text-lg font-bold text-gray-900">${order.balance_due.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Update Confirmation Modal */}
        {showConfirmModal && pendingStatus && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <ExclamationCircleIcon className="w-6 h-6 text-orange-500 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirm Status Change
                  </h3>
                </div>
                <button
                  onClick={cancelStatusUpdate}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to change the order status to <span className="font-semibold">{pendingStatus.replace('_', ' ')}</span>?
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> This will send a notification email to the customer.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelStatusUpdate}
                  disabled={updating}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusUpdate}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Confirm Change'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending_art_review: 'bg-yellow-100 text-yellow-800',
    art_approved: 'bg-green-100 text-green-800',
    art_revision_needed: 'bg-red-100 text-red-800',
    in_production: 'bg-blue-100 text-blue-800',
    balance_due: 'bg-orange-100 text-orange-800',
    ready_to_ship: 'bg-purple-100 text-purple-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-800'
  }

  const labels: Record<string, string> = {
    pending_art_review: 'Pending Review',
    art_approved: 'Art Approved',
    art_revision_needed: 'Revision Needed',
    in_production: 'In Production',
    balance_due: 'Balance Due',
    ready_to_ship: 'Ready to Ship',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }

  return (
    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  )
}

