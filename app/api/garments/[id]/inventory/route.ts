import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { GarmentInventory, InventoryLevel } from '@/types'

// S&S Activewear API Configuration
const SSACTIVEWEAR_API_BASE = 'https://api.ssactivewear.com/v2'
const SSACTIVEWEAR_API_KEY = process.env.SSACTIVEWEAR_API_KEY
const SSACTIVEWEAR_ACCOUNT_NUMBER = process.env.SSACTIVEWEAR_ACCOUNT_NUMBER

// Cache inventory results for 5 minutes to reduce API calls
const inventoryCache = new Map<string, { data: GarmentInventory; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Fetch live inventory from S&S Activewear API
 * Returns inventory levels keyed by color and size
 */
async function fetchSSActivewearInventory(ssStyleId: string): Promise<Record<string, InventoryLevel> | null> {
  if (!SSACTIVEWEAR_API_KEY) {
    console.error('S&S Activewear API key not configured')
    return null
  }

  try {
    // S&S API uses Basic Auth with Account Number as username and API Key as password
    const credentials = SSACTIVEWEAR_ACCOUNT_NUMBER 
      ? `${SSACTIVEWEAR_ACCOUNT_NUMBER}:${SSACTIVEWEAR_API_KEY}`
      : `${SSACTIVEWEAR_API_KEY}:`
    
    const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`
    
    // Fetch products for this style - includes inventory data
    const productsResponse = await fetch(`${SSACTIVEWEAR_API_BASE}/products/?style=${ssStyleId}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })

    if (!productsResponse.ok) {
      console.error('S&S API products fetch failed:', productsResponse.status, productsResponse.statusText)
      return null
    }

    const products = await productsResponse.json()
    
    if (!Array.isArray(products) || products.length === 0) {
      console.warn('No products found for S&S style:', ssStyleId)
      return null
    }

    // Build inventory map: { colorName: { sizeName: quantity } }
    const inventory: Record<string, InventoryLevel> = {}
    
    products.forEach((product: any) => {
      const colorName = product.colorName || product.color
      const sizeName = product.sizeName || product.size
      
      // S&S API returns quantity in 'qty' or 'quantity' field
      const qty = product.qty ?? product.quantity ?? product.available ?? 0
      
      if (colorName && sizeName) {
        if (!inventory[colorName]) {
          inventory[colorName] = {}
        }
        inventory[colorName][sizeName] = parseInt(qty) || 0
      }
    })

    console.log('S&S inventory fetched:', {
      ssStyleId,
      colorCount: Object.keys(inventory).length,
      sampleColors: Object.keys(inventory).slice(0, 3)
    })

    return inventory
  } catch (error) {
    console.error('Error fetching S&S inventory:', error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const garmentId = params.id

    // Check cache first
    const cached = inventoryCache.get(garmentId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=300' // 5 minutes
        }
      })
    }

    // Fetch garment to get supplier info
    const { data: garment, error } = await supabase
      .from('garments')
      .select('id, ss_style_id, supplier_source, available_colors, size_range')
      .eq('id', garmentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Garment not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // Check if this is an S&S sourced garment with a style ID
    if (garment.supplier_source !== 'ssactivewear' || !garment.ss_style_id) {
      // Return empty inventory for non-S&S garments
      const response: GarmentInventory = {
        supplier: garment.supplier_source || null,
        has_inventory: false,
        inventory: {},
        last_updated: new Date().toISOString()
      }
      
      return NextResponse.json(response)
    }

    // Fetch live inventory from S&S API
    const inventory = await fetchSSActivewearInventory(garment.ss_style_id)

    const response: GarmentInventory = {
      supplier: 'ssactivewear',
      has_inventory: inventory !== null && Object.keys(inventory).length > 0,
      inventory: inventory || {},
      last_updated: new Date().toISOString()
    }

    // Cache the result
    inventoryCache.set(garmentId, {
      data: response,
      timestamp: Date.now()
    })

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300' // 5 minutes
      }
    })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

