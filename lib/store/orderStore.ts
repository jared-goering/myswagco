import { create } from 'zustand'
import { PrintConfig, SizeQuantities, QuoteResponse, ArtworkTransform, PrintLocation } from '@/types'

interface OrderState {
  // Garment selection
  garmentId: string | null
  garmentColor: string
  
  // Size and quantities
  sizeQuantities: SizeQuantities
  
  // Print configuration
  printConfig: PrintConfig
  
  // Customer info
  customerName: string
  email: string
  phone: string
  organizationName: string
  needByDate: string
  shippingAddress: {
    line1: string
    line2: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  
  // Artwork files
  artworkFiles: { [location: string]: File | null }
  
  // Artwork transforms (position, scale, rotation)
  artworkTransforms: { [location: string]: ArtworkTransform }
  
  // Quote
  quote: QuoteResponse | null
  
  // Actions
  setGarmentId: (id: string) => void
  setGarmentColor: (color: string) => void
  setSizeQuantities: (quantities: SizeQuantities) => void
  setPrintConfig: (config: PrintConfig) => void
  setCustomerInfo: (info: Partial<OrderState>) => void
  setArtworkFile: (location: string, file: File | null) => void
  setArtworkTransform: (location: PrintLocation, transform: ArtworkTransform) => void
  setQuote: (quote: QuoteResponse | null) => void
  reset: () => void
}

const initialState = {
  garmentId: null,
  garmentColor: '',
  sizeQuantities: {},
  printConfig: {
    locations: {}
  },
  customerName: '',
  email: '',
  phone: '',
  organizationName: '',
  needByDate: '',
  shippingAddress: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US'
  },
  artworkFiles: {},
  artworkTransforms: {},
  quote: null
}

export const useOrderStore = create<OrderState>((set) => ({
  ...initialState,
  
  setGarmentId: (id) => set({ garmentId: id }),
  setGarmentColor: (color) => set({ garmentColor: color }),
  setSizeQuantities: (quantities) => set({ sizeQuantities: quantities }),
  setPrintConfig: (config) => set({ printConfig: config }),
  setCustomerInfo: (info) => set(info),
  setArtworkFile: (location, file) => 
    set((state) => ({
      artworkFiles: { ...state.artworkFiles, [location]: file }
    })),
  setArtworkTransform: (location, transform) =>
    set((state) => ({
      artworkTransforms: { ...state.artworkTransforms, [location]: transform }
    })),
  setQuote: (quote) => set({ quote }),
  reset: () => set(initialState)
}))

