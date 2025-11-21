'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { Order, OrderStatus } from '@/types'

export default function AdminOrderDetail() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  useEffect(() => {
    if (order) {
      setNotes(order.internal_notes || '')
    }
  }, [order])

  async function fetchOrder() {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateOrderStatus(newStatus: OrderStatus) {
    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        await fetchOrder()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setUpdating(false)
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

  const totalQty = Object.values(order.size_quantities).reduce((sum: number, qty) => sum + (qty as number || 0), 0)

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/orders" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
            ← Back to Orders
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              Order #{order.id.slice(0, 8)}
            </h1>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Name</p>
                  <p className="font-medium">{order.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="font-medium">{order.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <p className="font-medium">{order.phone}</p>
                </div>
                {order.organization_name && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Organization</p>
                    <p className="font-medium">{order.organization_name}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Shipping Address</p>
                <p className="text-sm">
                  {order.shipping_address.line1}<br />
                  {order.shipping_address.line2 && <>{order.shipping_address.line2}<br /></>}
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                </p>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Order Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Garment:</span>
                  <span className="font-medium">{order.garments?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Color:</span>
                  <span className="font-medium">{order.garment_color}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Quantity:</span>
                  <span className="font-medium">{totalQty} pieces</span>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600 mb-2">Size Breakdown:</p>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    {Object.entries(order.size_quantities).map(([size, qty]) => (
                      qty > 0 && (
                        <div key={size} className="bg-gray-50 px-2 py-1 rounded">
                          <span className="font-medium">{size}:</span> {qty as number}
                        </div>
                      )
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600 mb-2">Print Locations:</p>
                  {Object.entries(order.print_config.locations).map(([location, config]: [string, any]) => 
                    config?.enabled && (
                      <div key={location} className="text-sm bg-gray-50 px-3 py-2 rounded mb-1">
                        <span className="font-medium capitalize">{location.replace('_', ' ')}:</span> {config.num_colors} color{config.num_colors > 1 ? 's' : ''}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Artwork Files */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Artwork Files</h2>
              {order.artwork_files && order.artwork_files.length > 0 ? (
                <div className="space-y-3">
                  {order.artwork_files.map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between border rounded p-3">
                      <div>
                        <p className="font-medium capitalize">{file.location.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-600">{file.file_name}</p>
                        <p className="text-xs text-gray-500">{(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No artwork files uploaded</p>
              )}
            </div>

            {/* Internal Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Internal Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 h-32"
                placeholder="Add internal notes about this order..."
              />
              <button
                onClick={saveNotes}
                disabled={updating}
                className="mt-3 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Management */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Update Status</h3>
              <select
                value={order.status}
                onChange={(e) => updateOrderStatus(e.target.value as OrderStatus)}
                disabled={updating}
                className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
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
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Payment</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold">${order.total_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Deposit Paid:</span>
                  <span className={order.deposit_paid ? 'text-green-600 font-semibold' : 'text-red-600'}>
                    ${order.deposit_amount.toFixed(2)}
                    {order.deposit_paid ? ' ✓' : ' (unpaid)'}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-gray-600">Balance Due:</span>
                  <span className="font-semibold">${order.balance_due.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Timeline</h3>
              <div className="text-sm space-y-2">
                <div>
                  <p className="text-gray-600">Created:</p>
                  <p className="font-medium">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Last Updated:</p>
                  <p className="font-medium">{new Date(order.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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

