import { NextRequest, NextResponse } from 'next/server'
import { quoteRequestSchema } from '@/lib/schemas'
import { calculateQuote, calculateGarmentCost, calculatePrintCost, getDepositPercentage } from '@/lib/pricing'
import { PrintConfig, MultiGarmentQuoteResponse } from '@/types'

interface MultiGarmentRequest {
  garments: { garment_id: string; quantity: number }[]
  print_config: PrintConfig
  multi_garment: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is a multi-garment quote request
    if (body.multi_garment && body.garments && Array.isArray(body.garments)) {
      return handleMultiGarmentQuote(body as MultiGarmentRequest)
    }
    
    // Single garment quote (legacy)
    const validatedData = quoteRequestSchema.parse(body)
    
    const quote = await calculateQuote(
      validatedData.garment_id,
      validatedData.quantity,
      validatedData.print_config
    )
    
    return NextResponse.json(quote)
  } catch (error: any) {
    console.error('Error calculating quote:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to calculate quote' },
      { status: 500 }
    )
  }
}

async function handleMultiGarmentQuote(request: MultiGarmentRequest): Promise<NextResponse> {
  const { garments, print_config } = request
  
  // Calculate total quantity across all garments
  const totalQuantity = garments.reduce((sum, g) => sum + g.quantity, 0)
  
  if (totalQuantity < 24) {
    return NextResponse.json(
      { error: 'Minimum order quantity is 24 pieces' },
      { status: 400 }
    )
  }
  
  // Calculate garment costs for each garment
  const garmentBreakdown: {
    garment_id: string
    quantity: number
    garment_cost: number
    garment_cost_per_shirt: number
  }[] = []
  
  let totalGarmentCost = 0
  
  for (const garment of garments) {
    if (garment.quantity <= 0) continue
    
    const { totalCost, costPerShirt } = await calculateGarmentCost(
      garment.garment_id,
      garment.quantity
    )
    
    garmentBreakdown.push({
      garment_id: garment.garment_id,
      quantity: garment.quantity,
      garment_cost: totalCost,
      garment_cost_per_shirt: costPerShirt
    })
    
    totalGarmentCost += totalCost
  }
  
  // Calculate print cost (based on total quantity for volume pricing)
  const { totalCost: printCost, costPerShirt: printCostPerShirt, setupFees, totalScreens } = 
    await calculatePrintCost(totalQuantity, print_config)
  
  // Calculate totals
  const subtotal = totalGarmentCost + printCost
  const total = subtotal
  
  // Calculate deposit
  const depositPercentage = await getDepositPercentage()
  const depositAmount = total * (depositPercentage / 100)
  const balanceDue = total - depositAmount
  
  const response: MultiGarmentQuoteResponse = {
    garment_breakdown: garmentBreakdown,
    total_quantity: totalQuantity,
    garment_cost: totalGarmentCost,
    print_cost: printCost - setupFees,
    print_cost_per_shirt: printCostPerShirt,
    setup_fees: setupFees,
    total_screens: totalScreens,
    subtotal,
    total,
    per_shirt_price: total / totalQuantity,
    deposit_amount: Math.round(depositAmount * 100) / 100,
    balance_due: Math.round(balanceDue * 100) / 100
  }
  
  return NextResponse.json(response)
}
