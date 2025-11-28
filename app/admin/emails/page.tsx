'use client'

import { useEffect, useState } from 'react'
import { addBusinessDays, format } from 'date-fns'
import AdminLayout from '@/components/AdminLayout'

interface EmailTemplate {
  id: string
  subject: string
  heading: string
  body_intro: string
  body_details: string | null
  cta_text: string | null
  footer_text: string | null
  header_color: string
  estimated_ship_days?: number
  order_details_template: string | null
  variables: string[]
  updated_at?: string
}

const templateLabels: Record<string, { name: string; description: string; icon: string }> = {
  order_confirmation: {
    name: 'Order Confirmation',
    description: 'Sent after customer pays deposit',
    icon: '📋'
  },
  art_approved: {
    name: 'Artwork Approved',
    description: 'Sent when artwork is approved',
    icon: '✅'
  },
  balance_due: {
    name: 'Balance Due',
    description: 'Sent when order is ready for final payment',
    icon: '💰'
  },
  balance_paid: {
    name: 'Balance Paid',
    description: 'Sent after final payment received',
    icon: '🎉'
  },
  art_revision_needed: {
    name: 'Art Revision Needed',
    description: 'Sent when artwork needs changes',
    icon: '🔄'
  },
  shipped: {
    name: 'Shipping Notification',
    description: 'Sent when order ships with tracking',
    icon: '📦'
  }
}

// Get sample data for preview (some values are dynamic based on template settings)
function getSampleData(templateId: string, template: EmailTemplate): Record<string, string> {
  const baseData: Record<string, Record<string, string>> = {
    order_confirmation: {
      customer_name: 'John Smith',
      order_id: 'ABC12345',
      total_cost: '450.00',
      deposit_amount: '225.00',
      balance_due: '225.00'
    },
    art_approved: {
      customer_name: 'John Smith',
      order_id: 'ABC12345',
      estimated_ship_date: format(
        addBusinessDays(new Date(), template.estimated_ship_days || 14),
        'MMMM d, yyyy'
      )
    },
    balance_due: {
      customer_name: 'John Smith',
      order_id: 'ABC12345',
      balance_due: '225.00',
      payment_link: 'https://example.com/pay'
    },
    balance_paid: {
      customer_name: 'John Smith',
      order_id: 'ABC12345',
      amount_paid: '225.00'
    },
    art_revision_needed: {
      customer_name: 'John Smith',
      order_id: 'ABC12345',
      revision_notes: 'The logo resolution is too low for quality printing.'
    },
    shipped: {
      customer_name: 'John Smith',
      order_id: 'ABC12345',
      tracking_number: '1Z999AA10123456784',
      carrier: 'UPS',
      tracking_url: 'https://www.ups.com/track?tracknum=1Z999AA10123456784'
    }
  }
  return baseData[templateId] || {}
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      const response = await fetch('/api/email-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  function selectTemplate(template: EmailTemplate) {
    setSelectedTemplate(template)
    setEditedTemplate({ ...template })
  }

  function updateField(field: keyof EmailTemplate, value: string | number | null) {
    if (!editedTemplate) return
    setEditedTemplate({
      ...editedTemplate,
      [field]: value
    })
  }

  async function saveTemplate() {
    if (!editedTemplate) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/email-templates/${editedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedTemplate)
      })

      if (response.ok) {
        const updated = await response.json()
        setTemplates(templates.map(t => t.id === updated.id ? updated : t))
        setSelectedTemplate(updated)
        setEditedTemplate(updated)
        showToast('Template saved successfully!', 'success')
      } else {
        const error = await response.json()
        console.error('Save failed:', error)
        showToast('Failed to save template', 'error')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      showToast('Failed to save template', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function sendTestEmail() {
    if (!editedTemplate || !testEmail) return

    setSendingTest(true)
    try {
      const response = await fetch(`/api/email-templates/${editedTemplate.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      })

      if (response.ok) {
        showToast(`Test email sent to ${testEmail}`, 'success')
      } else {
        const error = await response.json()
        showToast(error.error || 'Failed to send test email', 'error')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      showToast('Failed to send test email', 'error')
    } finally {
      setSendingTest(false)
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  function interpolate(text: string, variables: Record<string, string>): string {
    let result = text
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
    return result
  }

  function generatePreviewHtml(template: EmailTemplate): string {
    const vars = getSampleData(template.id, template)
    const heading = interpolate(template.heading, vars)
    const bodyIntro = interpolate(template.body_intro, vars)
    const bodyDetails = template.body_details ? interpolate(template.body_details, vars) : null
    const footerText = template.footer_text ? interpolate(template.footer_text, vars) : null
    const headerColor = template.header_color || '#0284c7'
    
    // Darken color for gradient
    const num = parseInt(headerColor.replace('#', ''), 16)
    const r = Math.max(0, (num >> 16) - 20)
    const g = Math.max(0, ((num >> 8) & 0x00FF) - 20)
    const b = Math.max(0, (num & 0x0000FF) - 20)
    const headerColorDark = `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`

    let detailsHtml = ''
    if (bodyDetails) {
      const lines = bodyDetails.split('\n').filter(l => l.trim())
      const isNumberedList = lines.some(l => /^\d+\./.test(l.trim()))
      
      if (isNumberedList) {
        detailsHtml = `
          <h2 style="color: #111827; font-size: 16px; margin-top: 20px;">What's Next?</h2>
          <ol style="padding-left: 16px; color: #4b5563; font-size: 12px; margin: 0;">
            ${lines.map(line => `<li style="margin-bottom: 6px;">${line.replace(/^\d+\.\s*/, '')}</li>`).join('')}
          </ol>
        `
      } else {
        detailsHtml = `<p style="color: #4b5563; white-space: pre-line; font-size: 12px;">${bodyDetails}</p>`
      }
    }

    let badgeHtml = ''
    if (template.id === 'art_approved' || template.id === 'balance_paid') {
      const badgeText = template.id === 'art_approved' ? '✓ Artwork Approved' : '✓ Payment Confirmed'
      badgeHtml = `
        <div style="text-align: center; margin-bottom: 15px;">
          <span style="display: inline-block; background: #d1fae520; color: #065f46; padding: 4px 10px; border-radius: 12px; font-weight: 600; font-size: 11px; border: 1px solid #d1fae5;">
            ${badgeText}
          </span>
        </div>
      `
    }

    let iconHtml = ''
    if (template.id === 'shipped') {
      iconHtml = '<div style="text-align: center; margin-bottom: 15px; font-size: 32px;">📦</div>'
    }

    let ctaHtml = ''
    if (template.cta_text) {
      ctaHtml = `
        <div style="text-align: center; margin: 20px 0;">
          <span style="display: inline-block; background: linear-gradient(135deg, ${headerColor} 0%, ${headerColorDark} 100%); color: white; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 12px;">${template.cta_text}</span>
        </div>
      `
    }

    // Generate order details from template
    let orderDetailsHtml = ''
    if (template.order_details_template) {
      const orderDetailsContent = interpolate(template.order_details_template, vars)
      const lines = orderDetailsContent.split('\n').filter(l => l.trim())
      const formattedLines = lines.map(line => {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const label = line.substring(0, colonIndex + 1)
          const value = line.substring(colonIndex + 1).trim()
          return `<p style="margin: 0 0 6px 0;"><strong>${label}</strong> ${value}</p>`
        }
        return `<p style="margin: 0 0 6px 0;">${line}</p>`
      }).join('')
      
      orderDetailsHtml = `
        <div style="background: #f9fafb; border-radius: 6px; padding: 12px; margin-bottom: 15px; font-size: 11px;">
          ${formattedLines}
        </div>
      `
    }

    // Add revision notes box for art_revision_needed
    let revisionNotesHtml = ''
    if (template.id === 'art_revision_needed' && vars.revision_notes) {
      revisionNotesHtml = `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 15px; font-size: 11px;">
          <p style="margin: 0 0 6px 0; color: #991b1b; font-weight: 600;">Notes from our team:</p>
          <p style="margin: 0; color: #7f1d1d;">${vars.revision_notes}</p>
        </div>
      `
    }

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 100%; margin: 0; font-size: 12px;">
        <div style="background: linear-gradient(135deg, ${headerColor} 0%, ${headerColorDark} 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 16px;">${heading}</h1>
        </div>
        
        <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          ${iconHtml}
          ${badgeHtml}
          
          <p style="font-size: 12px; margin-bottom: 15px; color: #374151;">${bodyIntro}</p>
          
          ${orderDetailsHtml}
          ${revisionNotesHtml}
          ${detailsHtml}
          ${ctaHtml}
          
          ${footerText ? `
          <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px;">
            ${footerText}
          </p>
          ` : ''}
          
          <p style="margin-top: 15px; color: #374151; font-size: 11px;">
            Best regards,<br>
            <strong>The My Swag Co Team</strong>
          </p>
        </div>
      </div>
    `
  }

  function resetToDefault() {
    if (!selectedTemplate) return
    setEditedTemplate({ ...selectedTemplate })
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
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg font-semibold ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-black text-charcoal-700 tracking-tight">Email Templates</h1>
        <p className="text-charcoal-500 mt-2 text-lg">Customize the emails sent to customers</p>
      </div>

      {!selectedTemplate ? (
        // Template List View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const meta = templateLabels[template.id]
            return (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className="bento-card text-left hover:shadow-soft-lg transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-14 rounded-bento-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${template.header_color}20` }}
                  >
                    {meta?.icon || '📧'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-charcoal-700 text-lg group-hover:text-primary-600 transition-colors">
                      {meta?.name || template.id}
                    </h3>
                    <p className="text-charcoal-500 text-sm mt-1">
                      {meta?.description}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-charcoal-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                
                <div className="mt-4 pt-4 border-t border-surface-200">
                  <p className="text-xs text-charcoal-400 truncate">
                    <span className="font-semibold">Subject:</span> {template.subject}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        // Template Editor View
        <div>
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedTemplate(null)
              setEditedTemplate(null)
            }}
            className="flex items-center gap-2 text-charcoal-500 hover:text-charcoal-700 mb-6 font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Templates
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div 
              className="w-14 h-14 rounded-bento-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${editedTemplate?.header_color || '#0284c7'}20` }}
            >
              {templateLabels[selectedTemplate.id]?.icon || '📧'}
            </div>
            <div>
              <h2 className="text-3xl font-black text-charcoal-700">
                {templateLabels[selectedTemplate.id]?.name || selectedTemplate.id}
              </h2>
              <p className="text-charcoal-500">
                {templateLabels[selectedTemplate.id]?.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Editor Panel */}
            <div className="bento-card">
              <h3 className="font-bold text-charcoal-700 text-xl mb-6">Edit Template</h3>

              {/* Variables Helper */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-bold text-primary-700 mb-2">Available Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {editedTemplate?.variables.map((v) => (
                    <code 
                      key={v} 
                      className="px-2 py-1 bg-white rounded text-xs font-mono text-primary-600 border border-primary-200 cursor-pointer hover:bg-primary-100"
                      onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                      title="Click to copy"
                    >
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
                <p className="text-xs text-primary-600 mt-2">Click to copy. Use these in your text and they&apos;ll be replaced with actual values.</p>
              </div>

              <div className="space-y-5">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={editedTemplate?.subject || ''}
                    onChange={(e) => updateField('subject', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-surface-300 rounded-lg focus:border-primary-500 focus:outline-none"
                  />
                </div>

                {/* Header Color */}
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-2">
                    Header Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editedTemplate?.header_color || '#0284c7'}
                      onChange={(e) => updateField('header_color', e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-surface-300"
                    />
                    <input
                      type="text"
                      value={editedTemplate?.header_color || '#0284c7'}
                      onChange={(e) => updateField('header_color', e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-surface-300 rounded-lg focus:border-primary-500 focus:outline-none font-mono text-sm"
                      placeholder="#0284c7"
                    />
                  </div>
                </div>

                {/* Heading */}
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-2">
                    Heading (Main Title)
                  </label>
                  <input
                    type="text"
                    value={editedTemplate?.heading || ''}
                    onChange={(e) => updateField('heading', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-surface-300 rounded-lg focus:border-primary-500 focus:outline-none"
                  />
                </div>

                {/* Body Intro */}
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-2">
                    Introduction Text
                  </label>
                  <textarea
                    value={editedTemplate?.body_intro || ''}
                    onChange={(e) => updateField('body_intro', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-surface-300 rounded-lg focus:border-primary-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Order Details Template */}
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-2">
                    Order Details Box <span className="font-normal text-charcoal-400">(the gray info box)</span>
                  </label>
                  <textarea
                    value={editedTemplate?.order_details_template || ''}
                    onChange={(e) => updateField('order_details_template', e.target.value || null)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-surface-300 rounded-lg focus:border-primary-500 focus:outline-none resize-none font-mono text-sm"
                    placeholder="Order ID: {{order_id}}&#10;Estimated Ship Date: {{estimated_ship_date}}"
                  />
                  <p className="text-xs text-charcoal-400 mt-2">
                    One line per field. Use &quot;Label: {`{{variable}}`}&quot; format. Text before the colon will be bold.
                  </p>
                </div>

                {/* Body Details */}
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-2">
                    Additional Details <span className="font-normal text-charcoal-400">(optional, use numbered list for steps)</span>
                  </label>
                  <textarea
                    value={editedTemplate?.body_details || ''}
                    onChange={(e) => updateField('body_details', e.target.value || null)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-surface-300 rounded-lg focus:border-primary-500 focus:outline-none resize-none"
                    placeholder="1. First step&#10;2. Second step&#10;3. Third step"
                  />
                </div>

                {/* Estimated Ship Days (for art_approved only) */}
                {selectedTemplate.id === 'art_approved' && (
                  <div>
                    <label className="block text-sm font-bold text-charcoal-600 mb-2">
                      Estimated Ship Days
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={editedTemplate?.estimated_ship_days || 14}
                        onChange={(e) => updateField('estimated_ship_days', parseInt(e.target.value) || 14)}
                        className="w-24 px-4 py-3 border-2 border-surface-300 rounded-lg focus:border-primary-500 focus:outline-none"
                      />
                      <span className="text-charcoal-500">business days from approval</span>
                    </div>
                    <p className="text-xs text-charcoal-400 mt-2">
                      The estimated ship date shown in the email will be calculated as this many business days from when the artwork is approved.
                    </p>
                  </div>
                )}

                {/* CTA Text */}
                {(selectedTemplate.id === 'balance_due' || selectedTemplate.id === 'shipped') && (
                  <div>
                    <label className="block text-sm font-bold text-charcoal-600 mb-2">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={editedTemplate?.cta_text || ''}
                      onChange={(e) => updateField('cta_text', e.target.value || null)}
                      className="w-full px-4 py-3 border-2 border-surface-300 rounded-lg focus:border-primary-500 focus:outline-none"
                      placeholder="e.g., Pay Now, Track Package"
                    />
                  </div>
                )}

                {/* Footer Text */}
                <div>
                  <label className="block text-sm font-bold text-charcoal-600 mb-2">
                    Footer Message <span className="font-normal text-charcoal-400">(optional)</span>
                  </label>
                  <textarea
                    value={editedTemplate?.footer_text || ''}
                    onChange={(e) => updateField('footer_text', e.target.value || null)}
                    rows={2}
                    className="w-full px-4 py-3 border-2 border-surface-300 rounded-lg focus:border-primary-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-8 pt-6 border-t border-surface-200">
                <button
                  onClick={saveTemplate}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={resetToDefault}
                  className="px-6 py-3 bg-surface-100 hover:bg-surface-200 text-charcoal-600 rounded-lg font-bold transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Test Email */}
              <div className="mt-6 pt-6 border-t border-surface-200">
                <label className="block text-sm font-bold text-charcoal-600 mb-2">
                  Send Test Email
                </label>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-3 border-2 border-surface-300 rounded-lg focus:border-primary-500 focus:outline-none"
                  />
                  <button
                    onClick={sendTestEmail}
                    disabled={sendingTest || !testEmail}
                    className="px-6 py-3 bg-charcoal-700 hover:bg-charcoal-800 text-white rounded-lg font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {sendingTest ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
                <p className="text-xs text-charcoal-400 mt-2">
                  Test emails are sent with sample data and marked with [TEST] in the subject
                </p>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="bento-card">
              <h3 className="font-bold text-charcoal-700 text-xl mb-6">Live Preview</h3>
              
              <div className="bg-surface-100 rounded-lg p-4 border border-surface-200">
                {/* Email Client Header Mock */}
                <div className="bg-surface-50 rounded-t-lg px-4 py-3 border-b border-surface-200 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      MS
                    </div>
                    <div>
                      <p className="text-sm font-bold text-charcoal-700">My Swag Co</p>
                      <p className="text-xs text-charcoal-400">noreply@myswagco.co</p>
                    </div>
                  </div>
                  <p className="text-sm text-charcoal-600 font-semibold">
                    {editedTemplate ? interpolate(editedTemplate.subject, getSampleData(editedTemplate.id, editedTemplate)) : ''}
                  </p>
                </div>

                {/* Email Content Preview */}
                <div 
                  className="bg-white rounded-lg overflow-hidden"
                  dangerouslySetInnerHTML={{ 
                    __html: editedTemplate ? generatePreviewHtml(editedTemplate) : '' 
                  }}
                />
              </div>

              <p className="text-xs text-charcoal-400 mt-4 text-center">
                Preview uses sample data. Actual emails will contain real order information.
              </p>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

