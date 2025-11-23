import { create } from 'zustand'
import { PrintConfig, SizeQuantities, ColorSizeQuantities, QuoteResponse, ArtworkTransform, PrintLocation, ArtworkFile, VectorizationStatus } from '@/types'

interface OrderState {
  // Garment selection
  garmentId: string | null
  selectedColors: string[]
  
  // Size and quantities (multi-color support)
  colorSizeQuantities: ColorSizeQuantities
  
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
  
  // Artwork files (client-side File objects)
  artworkFiles: { [location: string]: File | null }
  
  // Artwork file records (from database)
  artworkFileRecords: { [location: string]: ArtworkFile | null }
  
  // Vectorized SVG data (as data URLs for preview and upload)
  vectorizedSvgData: { [location: string]: string | null }
  
  // Artwork transforms (position, scale, rotation)
  artworkTransforms: { [location: string]: ArtworkTransform }
  
  // Quote
  quote: QuoteResponse | null
  
  // Actions
  setGarmentId: (id: string) => void
  addColor: (color: string) => void
  removeColor: (color: string) => void
  setColorSizeQuantity: (color: string, size: string, quantity: number) => void
  getTotalQuantity: () => number
  setPrintConfig: (config: PrintConfig) => void
  setCustomerInfo: (info: Partial<OrderState>) => void
  setArtworkFile: (location: string, file: File | null) => void
  setArtworkFileRecord: (location: string, record: ArtworkFile | null) => void
  setArtworkTransform: (location: PrintLocation, transform: ArtworkTransform) => void
  setVectorizedFile: (location: string, vectorizedUrl: string, status: VectorizationStatus) => void
  hasUnvectorizedRasterFiles: () => boolean
  setQuote: (quote: QuoteResponse | null) => void
  reset: () => void
}

const initialState = {
  garmentId: null,
  selectedColors: [] as string[],
  colorSizeQuantities: {} as ColorSizeQuantities,
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
  artworkFileRecords: {},
  vectorizedSvgData: {},
  artworkTransforms: {},
  quote: null
}

export const useOrderStore = create<OrderState>((set, get) => ({
  ...initialState,
  
  setGarmentId: (id) => set({ garmentId: id }),
  
  addColor: (color) => set((state) => ({
    selectedColors: [...state.selectedColors, color],
    colorSizeQuantities: {
      ...state.colorSizeQuantities,
      [color]: {}
    }
  })),
  
  removeColor: (color) => set((state) => {
    const newSelectedColors = state.selectedColors.filter(c => c !== color)
    const newColorSizeQuantities = { ...state.colorSizeQuantities }
    delete newColorSizeQuantities[color]
    return {
      selectedColors: newSelectedColors,
      colorSizeQuantities: newColorSizeQuantities
    }
  }),
  
  setColorSizeQuantity: (color, size, quantity) => set((state) => ({
    colorSizeQuantities: {
      ...state.colorSizeQuantities,
      [color]: {
        ...state.colorSizeQuantities[color],
        [size]: quantity
      }
    }
  })),
  
  getTotalQuantity: () => {
    const state = get()
    let total = 0
    Object.values(state.colorSizeQuantities).forEach(sizeQty => {
      Object.values(sizeQty).forEach(qty => {
        total += qty || 0
      })
    })
    return total
  },
  
  setPrintConfig: (config) => set({ printConfig: config }),
  setCustomerInfo: (info) => set(info),
  setArtworkFile: (location, file) => 
    set((state) => ({
      artworkFiles: { ...state.artworkFiles, [location]: file }
    })),
  setArtworkFileRecord: (location, record) =>
    set((state) => ({
      artworkFileRecords: { ...state.artworkFileRecords, [location]: record }
    })),
  setArtworkTransform: (location, transform) =>
    set((state) => ({
      artworkTransforms: { ...state.artworkTransforms, [location]: transform }
    })),
  setVectorizedFile: (location, vectorizedUrl, status) =>
    set((state) => {
      const record = state.artworkFileRecords[location]
      if (record) {
        return {
          artworkFileRecords: {
            ...state.artworkFileRecords,
            [location]: {
              ...record,
              vectorized_file_url: vectorizedUrl,
              vectorization_status: status
            }
          },
          vectorizedSvgData: {
            ...state.vectorizedSvgData,
            [location]: vectorizedUrl
          }
        }
      }
      return state
    }),
  hasUnvectorizedRasterFiles: () => {
    const state = get()
    return Object.values(state.artworkFileRecords).some(
      record => record && !record.is_vector && record.vectorization_status !== 'completed'
    )
  },
  setQuote: (quote) => set({ quote }),
  reset: () => set(initialState)
}))

