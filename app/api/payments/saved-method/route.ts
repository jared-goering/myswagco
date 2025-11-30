import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId')
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing customerId' },
        { status: 400 }
      )
    }

    // Get the customer's saved payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1
    })

    if (paymentMethods.data.length === 0) {
      return NextResponse.json({ paymentMethod: null })
    }

    const pm = paymentMethods.data[0]
    
    return NextResponse.json({
      paymentMethod: {
        id: pm.id,
        card: {
          brand: pm.card?.brand || 'unknown',
          last4: pm.card?.last4 || '****',
          exp_month: pm.card?.exp_month || 0,
          exp_year: pm.card?.exp_year || 0
        }
      }
    })
  } catch (error: any) {
    console.error('Error fetching saved payment method:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment method' },
      { status: 500 }
    )
  }
}


