import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Force dynamic rendering for routes using cookies/auth
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Helper to create Supabase client with auth
function createAuthClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )
}

// GET - Retrieve all orders for the authenticated customer
export async function GET() {
  try {
    const supabase = createAuthClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Fetch orders for this customer
    // Orders can be linked by customer_id OR by email (for orders placed before signing up)
    const { data: customer } = await supabase
      .from('customers')
      .select('email')
      .eq('id', user.id)
      .single()
    
    if (!customer) {
      return NextResponse.json([])
    }
    
    // Get orders linked to customer_id OR matching email
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .or(`customer_id.eq.${user.id},email.eq.${customer.email}`)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching customer orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(orders || [])
  } catch (error) {
    console.error('Error in GET /api/orders/customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

