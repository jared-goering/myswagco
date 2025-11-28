import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { OrderDraftInput } from '@/types'

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

// Helper to generate a user-friendly draft name
function generateDraftName(garmentName?: string, colors?: string[]): string {
  const colorPart = colors && colors.length > 0 ? colors[0] : ''
  const garmentPart = garmentName || 'Order'
  if (colorPart) {
    return `${colorPart} ${garmentPart} Draft`
  }
  return `${garmentPart} Draft`
}

// GET - Retrieve all order drafts for the authenticated user
export async function GET(request: NextRequest) {
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
    
    // Fetch order drafts for this user with garment details
    const { data: drafts, error } = await supabase
      .from('order_drafts')
      .select(`
        *,
        garment:garments(id, name, brand, thumbnail_url, available_colors, color_images)
      `)
      .eq('customer_id', user.id)
      .order('updated_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching order drafts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch order drafts' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(drafts)
  } catch (error) {
    console.error('Error in GET /api/order-drafts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create or update an order draft
export async function POST(request: NextRequest) {
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
    
    const body = await request.json()
    const { 
      draft_id, // Optional - if provided, update existing draft
      ...draftData 
    }: { draft_id?: string } & OrderDraftInput = body
    
    // Ensure customer record exists
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (!existingCustomer) {
      console.log(`[order-drafts POST] Creating customer record for user ${user.id}`)
      const { error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null
        })
      
      if (customerError) {
        console.error('Error creating customer record:', customerError)
        return NextResponse.json(
          { error: 'Failed to create customer record' },
          { status: 500 }
        )
      }
    }
    
    // Get garment name for draft naming
    let garmentName: string | undefined
    if (draftData.garment_id) {
      const { data: garment } = await supabaseAdmin
        .from('garments')
        .select('name')
        .eq('id', draftData.garment_id)
        .single()
      garmentName = garment?.name
    }
    
    // Generate a user-friendly name for the draft
    const draftName = generateDraftName(garmentName, draftData.selected_colors)
    
    // Prepare draft data for database
    const dbDraftData = {
      customer_id: user.id,
      name: draftName,
      garment_id: draftData.garment_id || null,
      selected_colors: draftData.selected_colors || [],
      selected_garments: draftData.selected_garments || {}, // Multi-garment selection
      color_size_quantities: draftData.color_size_quantities || {},
      print_config: draftData.print_config || { locations: {} },
      artwork_file_records: draftData.artwork_file_records || {},
      artwork_transforms: draftData.artwork_transforms || {},
      vectorized_svg_data: draftData.vectorized_svg_data || {},
      customer_name: draftData.customer_name || null,
      email: draftData.email || null,
      phone: draftData.phone || null,
      organization_name: draftData.organization_name || null,
      need_by_date: draftData.need_by_date || null,
      shipping_address: draftData.shipping_address || null,
      quote: draftData.quote || null,
      text_description: draftData.text_description || null,
    }
    
    let draft
    
    if (draft_id) {
      // Try to update existing draft
      const { data, error } = await supabaseAdmin
        .from('order_drafts')
        .update(dbDraftData)
        .eq('id', draft_id)
        .eq('customer_id', user.id) // Ensure user owns this draft
        .select(`
          *,
          garment:garments(id, name, brand, thumbnail_url, available_colors, color_images)
        `)
        .single()
      
      if (error) {
        // If the draft doesn't exist (PGRST116 = no rows found), create a new one instead
        if (error.code === 'PGRST116') {
          console.log(`Draft ${draft_id} not found for user ${user.id}, creating new draft`)
          const { data: newData, error: createError } = await supabaseAdmin
            .from('order_drafts')
            .insert(dbDraftData)
            .select(`
              *,
              garment:garments(id, name, brand, thumbnail_url, available_colors, color_images)
            `)
            .single()
          
          if (createError) {
            console.error('Error creating draft after failed update:', createError)
            return NextResponse.json(
              { error: 'Failed to create draft' },
              { status: 500 }
            )
          }
          
          draft = newData
        } else {
          console.error('Error updating draft:', error)
          return NextResponse.json(
            { error: 'Failed to update draft' },
            { status: 500 }
          )
        }
      } else {
        draft = data
      }
    } else {
      // Create new draft
      const { data, error } = await supabaseAdmin
        .from('order_drafts')
        .insert(dbDraftData)
        .select(`
          *,
          garment:garments(id, name, brand, thumbnail_url, available_colors, color_images)
        `)
        .single()
      
      if (error) {
        console.error('Error creating draft:', error)
        return NextResponse.json(
          { error: 'Failed to create draft' },
          { status: 500 }
        )
      }
      
      draft = data
    }
    
    return NextResponse.json(draft, { status: draft_id ? 200 : 201 })
  } catch (error) {
    console.error('Error in POST /api/order-drafts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

