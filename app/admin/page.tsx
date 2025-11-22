'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { Order } from '@/types'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pending_art_review: 0,
    in_production: 0,
    balance_due: 0,
    total_orders: 0
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // Fetch all orders
      const response = await fetch('/api/orders')
      if (response.ok) {
        const orders: Order[] = await response.json()
        
        // Calculate stats
        setStats({
          pending_art_review: orders.filter(o => o.status === 'pending_art_review').length,
          in_production: orders.filter(o => o.status === 'in_production').length,
          balance_due: orders.filter(o => o.status === 'balance_due').length,
          total_orders: orders.length
        })

        // Get recent orders (last 10)
        setRecentOrders(orders.slice(0, 10))
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        <h1 className="text-5xl md:text-6xl font-black text-charcoal-700 mb-12 tracking-tight">Dashboard</h1>

        {/* Stats Grid - Bento Layout */}
        <div className="bento-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {/* Featured - Pending Art Review */}
          <div className="bento-item md:col-span-2 bg-gradient-to-br from-data-yellow/20 to-data-yellow/10 border-2 border-data-yellow/30 hover:shadow-soft-lg transition-all">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <p className="text-sm text-charcoal-500 font-bold uppercase tracking-wide mb-3">Pending Art Review</p>
                <p className="text-metric text-data-yellow">{stats.pending_art_review}</p>
              </div>
              <div className="w-16 h-16 bg-data-yellow rounded-bento-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <div className="inline-block px-4 py-2 bg-data-yellow/20 rounded-full">
              <span className="text-sm font-black text-charcoal-700">Requires Action</span>
            </div>
          </div>

          {/* In Production */}
          <div className="bento-item bg-gradient-to-br from-data-blue/20 to-data-blue/10 border-2 border-data-blue/30 hover:shadow-soft-lg transition-all">
            <div className="w-14 h-14 bg-data-blue rounded-bento-lg flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-charcoal-500 font-bold uppercase tracking-wide mb-2">In Production</p>
            <p className="text-5xl font-black text-data-blue tracking-tight">{stats.in_production}</p>
          </div>

          {/* Balance Due */}
          <div className="bento-item bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 hover:shadow-soft-lg transition-all">
            <div className="w-14 h-14 bg-primary-500 rounded-bento-lg flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-charcoal-500 font-bold uppercase tracking-wide mb-2">Balance Due</p>
            <p className="text-5xl font-black text-primary-600 tracking-tight">{stats.balance_due}</p>
          </div>

          {/* Total Orders - Featured */}
          <div className="bento-item md:col-span-2 lg:col-span-4 bg-gradient-to-br from-charcoal-700 to-charcoal-800 text-white hover:shadow-soft-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 font-bold uppercase tracking-wide mb-3">Total Orders</p>
                <p className="text-display text-white">{stats.total_orders}</p>
              </div>
              <div className="w-20 h-20 bg-white/10 rounded-bento-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bento-card">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-charcoal-700 tracking-tight">Recent Orders</h2>
            <Link href="/admin/orders" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-bento-lg font-black text-sm transition-all shadow-soft hover:shadow-bento">
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
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
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-300">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <Link href={`/admin/orders/${order.id}`} className="text-primary-600 hover:text-primary-700 font-mono text-sm font-bold">
                        {order.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-charcoal-700">{order.customer_name}</div>
                      <div className="text-sm text-charcoal-400 font-semibold">{order.email}</div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

