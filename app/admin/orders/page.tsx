'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { Order } from '@/types'

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [filterStatus])

  async function fetchOrders() {
    try {
      const url = filterStatus === 'all' 
        ? '/api/orders' 
        : `/api/orders?status=${filterStatus}`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteOrder() {
    if (!deleteOrderId) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/orders/${deleteOrderId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setOrders(orders.filter(o => o.id !== deleteOrderId))
        setDeleteOrderId(null)
      } else {
        console.error('Failed to delete order')
      }
    } catch (error) {
      console.error('Error deleting order:', error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-5xl md:text-6xl font-black text-charcoal-700 tracking-tight">Orders</h1>
        </div>

        {/* Filters */}
        <div className="bento-card mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-black text-charcoal-600 uppercase tracking-wide">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border-2 border-surface-300 rounded-xl px-4 py-2.5 text-sm font-bold text-charcoal-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none"
            >
              <option value="all">All Orders</option>
              <option value="pending_art_review">Pending Art Review</option>
              <option value="art_approved">Art Approved</option>
              <option value="art_revision_needed">Revision Needed</option>
              <option value="in_production">In Production</option>
              <option value="balance_due">Balance Due</option>
              <option value="ready_to_ship">Ready to Ship</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bento-card overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-surface-300">
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Garment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-300">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-charcoal-600">
                          {order.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-charcoal-700">{order.customer_name}</div>
                        <div className="text-sm text-charcoal-400 font-semibold">{order.email}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-charcoal-700">
                          {(order as any).garments?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-charcoal-400 font-semibold">{order.garment_color}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-charcoal-700">
                        {order.total_quantity} pcs
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-charcoal-700">
                        ${order.total_cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-charcoal-500 font-semibold">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-black"
                          >
                            View
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => setDeleteOrderId(order.id)}
                            className="inline-flex items-center gap-1 text-error-600 hover:text-error-700 font-black"
                            title="Delete order"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-charcoal-500">
              <p className="text-lg font-bold">No orders found</p>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteOrderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-error-100 rounded-full">
                  <svg className="w-6 h-6 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-charcoal-700">Delete Order</h3>
              </div>
              <p className="text-charcoal-600 mb-6">
                Are you sure you want to delete this order? This will also remove all associated artwork files and activity logs. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteOrderId(null)}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl font-bold text-charcoal-600 hover:bg-surface-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrder}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl font-bold bg-error-600 text-white hover:bg-error-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Order'
                  )}
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
    pending_art_review: 'bg-data-yellow/20 text-charcoal-700 border border-data-yellow/40',
    art_approved: 'bg-data-green/20 text-charcoal-700 border border-data-green/40',
    art_revision_needed: 'bg-error-100 text-error-800 border border-error-200',
    in_production: 'bg-data-blue/20 text-charcoal-700 border border-data-blue/40',
    balance_due: 'bg-primary-100 text-primary-800 border border-primary-200',
    ready_to_ship: 'bg-data-purple/20 text-charcoal-700 border border-data-purple/40',
    completed: 'bg-surface-100 text-charcoal-700 border border-surface-300',
    cancelled: 'bg-surface-100 text-charcoal-500 border border-surface-300'
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
    <span className={`px-3 py-1.5 inline-flex text-xs font-black rounded-full ${colors[status] || 'bg-surface-100 text-charcoal-700 border border-surface-300'}`}>
      {labels[status] || status}
    </span>
  )
}

