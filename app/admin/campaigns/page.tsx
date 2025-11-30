'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { Campaign } from '@/types'

interface AdminCampaign extends Campaign {
  order_count: number
  total_quantity: number
  total_revenue: number
  pending_count: number
}

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchCampaigns()
  }, [filterStatus])

  async function fetchCampaigns() {
    try {
      setLoading(true)
      const url = filterStatus === 'all' 
        ? '/api/admin/campaigns' 
        : `/api/admin/campaigns?status=${filterStatus}`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data)
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate days remaining/overdue
  function getDaysInfo(deadline: string, status: string) {
    if (status === 'completed') return null
    
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays > 0) {
      return { days: diffDays, isOverdue: false }
    } else if (diffDays === 0) {
      return { days: 0, isOverdue: false, isToday: true }
    } else {
      return { days: Math.abs(diffDays), isOverdue: true }
    }
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-5xl md:text-6xl font-black text-charcoal-700 tracking-tight">Campaigns</h1>
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
              <option value="all">All Campaigns</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bento-card overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-surface-300">
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Organizer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Shirts
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black text-charcoal-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-300">
                  {campaigns.map((campaign) => {
                    const daysInfo = getDaysInfo(campaign.deadline, campaign.status)
                    const garmentName = campaign.garment?.name || 
                      (campaign.garments && campaign.garments.length > 0 
                        ? `${campaign.garments.length} styles` 
                        : 'N/A')
                    
                    return (
                      <tr key={campaign.id} className="hover:bg-surface-50 transition-colors">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-bold text-charcoal-700">{campaign.name}</div>
                          <div className="text-sm text-charcoal-400 font-semibold">{garmentName}</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-bold text-charcoal-700">
                            {campaign.organizer_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-charcoal-400 font-semibold">
                            {campaign.organizer_email || ''}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-bold text-charcoal-700">
                            {new Date(campaign.deadline).toLocaleDateString()}
                          </div>
                          {daysInfo && (
                            <div className={`text-xs font-semibold ${
                              daysInfo.isOverdue 
                                ? 'text-error-600' 
                                : daysInfo.isToday 
                                  ? 'text-data-yellow' 
                                  : 'text-charcoal-400'
                            }`}>
                              {daysInfo.isToday 
                                ? 'Today' 
                                : daysInfo.isOverdue 
                                  ? `${daysInfo.days}d overdue`
                                  : `${daysInfo.days}d left`
                              }
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                            campaign.payment_style === 'everyone_pays'
                              ? 'bg-data-blue/20 text-charcoal-700'
                              : 'bg-data-purple/20 text-charcoal-700'
                          }`}>
                            {campaign.payment_style === 'everyone_pays' ? 'Everyone' : 'Organizer'}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-bold text-charcoal-700">
                            {campaign.order_count || 0}
                          </div>
                          {campaign.payment_style === 'everyone_pays' && campaign.pending_count > 0 && (
                            <div className="text-xs text-data-yellow font-semibold">
                              +{campaign.pending_count} pending
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-charcoal-700">
                          {campaign.total_quantity || 0}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-charcoal-700">
                          {campaign.payment_style === 'everyone_pays' 
                            ? `$${(campaign.total_revenue || 0).toFixed(2)}`
                            : '—'
                          }
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/admin/campaigns/${campaign.id}`}
                              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-black"
                            >
                              Edit
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <Link
                              href={`/c/${campaign.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-charcoal-500 hover:text-charcoal-700 font-bold"
                              title="View public page"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-charcoal-500">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-charcoal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-lg font-bold">No campaigns found</p>
              <p className="text-charcoal-400 text-sm mt-1">
                {filterStatus !== 'all' ? 'Try changing your filter' : 'Campaigns created by customers will appear here'}
              </p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && campaigns.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bento-card">
              <div className="text-3xl font-black text-charcoal-700">
                {campaigns.filter(c => c.status === 'active').length}
              </div>
              <div className="text-sm font-bold text-charcoal-500">Active Campaigns</div>
            </div>
            <div className="bento-card">
              <div className="text-3xl font-black text-charcoal-700">
                {campaigns.reduce((sum, c) => sum + (c.order_count || 0), 0)}
              </div>
              <div className="text-sm font-bold text-charcoal-500">Total Orders</div>
            </div>
            <div className="bento-card">
              <div className="text-3xl font-black text-charcoal-700">
                {campaigns.reduce((sum, c) => sum + (c.total_quantity || 0), 0)}
              </div>
              <div className="text-sm font-bold text-charcoal-500">Total Shirts</div>
            </div>
            <div className="bento-card">
              <div className="text-3xl font-black text-emerald-600">
                ${campaigns.reduce((sum, c) => sum + (c.total_revenue || 0), 0).toFixed(2)}
              </div>
              <div className="text-sm font-bold text-charcoal-500">Total Revenue</div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-data-green/20 text-charcoal-700 border border-data-green/40',
    closed: 'bg-data-yellow/20 text-charcoal-700 border border-data-yellow/40',
    completed: 'bg-surface-100 text-charcoal-700 border border-surface-300',
    draft: 'bg-surface-100 text-charcoal-500 border border-surface-300',
  }

  const labels: Record<string, string> = {
    active: 'Active',
    closed: 'Closed',
    completed: 'Completed',
    draft: 'Draft',
  }

  return (
    <span className={`px-3 py-1.5 inline-flex text-xs font-black rounded-full ${colors[status] || 'bg-surface-100 text-charcoal-700 border border-surface-300'}`}>
      {labels[status] || status}
    </span>
  )
}

