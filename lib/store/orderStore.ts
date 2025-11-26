import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PrintConfig, SizeQuantities, ColorSizeQuantities, QuoteResponse, ArtworkTransform, PrintLocation, ArtworkFile, VectorizationStatus, OrderDraft, OrderDraftInput, SelectedGarments, GarmentSelection, MultiGarmentQuoteResponse } from '@/types'

interface OrderState {
  // Draft tracking
  draftId: string | null
  
  // Multi-garment selection (new)
  selectedGarments: SelectedGarments
  
  // Legacy single-garment fields (kept for backwards compatibility)
  garmentId: string | null
  selectedColors: string[]
  colorSizeQuantities: ColorSizeQuantities
  
  // Print configuration (shared across all garments)
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
  
  // Artwork files (client-side File objects - NOT persisted)
  artworkFiles: { [location: string]: File | null }
  
  // Artwork file records (from database - persisted)
  artworkFileRecords: { [location: string]: ArtworkFile | null }
  
  // Vectorized SVG data (as data URLs for preview and upload - persisted)
  vectorizedSvgData: { [location: string]: string | null }
  
  // Artwork transforms (position, scale, rotation - persisted)
  artworkTransforms: { [location: string]: ArtworkTransform }
  
  // Quote (multi-garment)
  quote: QuoteResponse | null
  multiGarmentQuote: MultiGarmentQuoteResponse | null
  
  // Text description for artwork (persisted)
  textDescription: string
  
  // Multi-garment actions
  addGarment: (garmentId: string) => void
  removeGarment: (garmentId: string) => void
  getSelectedGarmentIds: () => string[]
  hasGarment: (garmentId: string) => boolean
  
  // Per-garment color/quantity actions
  addGarmentColor: (garmentId: string, color: string) => void
  removeGarmentColor: (garmentId: string, color: string) => void
  setGarmentSizeQuantity: (garmentId: string, color: string, size: string, quantity: number) => void
  getGarmentColors: (garmentId: string) => string[]
  getGarmentQuantity: (garmentId: string) => number
  
  // Legacy single-garment actions (kept for compatibility)
  setGarmentId: (id: string) => void
  addColor: (color: string) => void
  removeColor: (color: string) => void
  setColorSizeQuantity: (color: string, size: string, quantity: number) => void
  
  // Shared actions
  getTotalQuantity: () => number
  setPrintConfig: (config: PrintConfig) => void
  setCustomerInfo: (info: Partial<OrderState>) => void
  setArtworkFile: (location: string, file: File | null) => void
  setArtworkFileRecord: (location: string, record: ArtworkFile | null) => void
  setArtworkTransform: (location: PrintLocation, transform: ArtworkTransform) => void
  setVectorizedFile: (location: string, vectorizedUrl: string, status: VectorizationStatus) => void
  hasUnvectorizedRasterFiles: () => boolean
  setQuote: (quote: QuoteResponse | null) => void
  setMultiGarmentQuote: (quote: MultiGarmentQuoteResponse | null) => void
  setTextDescription: (text: string) => void
  reset: () => void
  
  // Draft management actions
  setDraftId: (id: string | null) => void
  getDraftData: () => OrderDraftInput
  saveDraft: () => Promise<OrderDraft | null>
  loadDraft: (draft: OrderDraft) => void
  deleteDraft: () => Promise<boolean>
  clearDraft: () => void
}

const initialState = {
  draftId: null as string | null,
  selectedGarments: {} as SelectedGarments,
  garmentId: null as string | null,
  selectedColors: [] as string[],
  colorSizeQuantities: {} as ColorSizeQuantities,
  printConfig: {
    locations: {}
  } as PrintConfig,
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
  artworkFiles: {} as { [location: string]: File | null },
  artworkFileRecords: {} as { [location: string]: ArtworkFile | null },
  vectorizedSvgData: {} as { [location: string]: string | null },
  artworkTransforms: {} as { [location: string]: ArtworkTransform },
  quote: null as QuoteResponse | null,
  multiGarmentQuote: null as MultiGarmentQuoteResponse | null,
  textDescription: ''
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Multi-garment actions
      addGarment: (garmentId) => set((state) => ({
        selectedGarments: {
          ...state.selectedGarments,
          [garmentId]: {
            selectedColors: [],
            colorSizeQuantities: {}
          }
        }
      })),
      
      removeGarment: (garmentId) => set((state) => {
        const newSelectedGarments = { ...state.selectedGarments }
        delete newSelectedGarments[garmentId]
        return { selectedGarments: newSelectedGarments }
      }),
      
      getSelectedGarmentIds: () => {
        const state = get()
        return Object.keys(state.selectedGarments)
      },
      
      hasGarment: (garmentId) => {
        const state = get()
        return garmentId in state.selectedGarments
      },
      
      // Per-garment color/quantity actions
      addGarmentColor: (garmentId, color) => set((state) => {
        const garment = state.selectedGarments[garmentId]
        if (!garment) return state
        
        return {
          selectedGarments: {
            ...state.selectedGarments,
            [garmentId]: {
              ...garment,
              selectedColors: [...garment.selectedColors, color],
              colorSizeQuantities: {
                ...garment.colorSizeQuantities,
                [color]: {}
              }
            }
          }
        }
      }),
      
      removeGarmentColor: (garmentId, color) => set((state) => {
        const garment = state.selectedGarments[garmentId]
        if (!garment) return state
        
        const newColorSizeQuantities = { ...garment.colorSizeQuantities }
        delete newColorSizeQuantities[color]
        
        return {
          selectedGarments: {
            ...state.selectedGarments,
            [garmentId]: {
              ...garment,
              selectedColors: garment.selectedColors.filter(c => c !== color),
              colorSizeQuantities: newColorSizeQuantities
            }
          }
        }
      }),
      
      setGarmentSizeQuantity: (garmentId, color, size, quantity) => set((state) => {
        const garment = state.selectedGarments[garmentId]
        if (!garment) return state
        
        return {
          selectedGarments: {
            ...state.selectedGarments,
            [garmentId]: {
              ...garment,
              colorSizeQuantities: {
                ...garment.colorSizeQuantities,
                [color]: {
                  ...garment.colorSizeQuantities[color],
                  [size]: quantity
                }
              }
            }
          }
        }
      }),
      
      getGarmentColors: (garmentId) => {
        const state = get()
        return state.selectedGarments[garmentId]?.selectedColors || []
      },
      
      getGarmentQuantity: (garmentId) => {
        const state = get()
        const garment = state.selectedGarments[garmentId]
        if (!garment) return 0
        
        let total = 0
        Object.values(garment.colorSizeQuantities).forEach(sizeQty => {
          Object.values(sizeQty).forEach(qty => {
            total += qty || 0
          })
        })
        return total
      },
      
      // Legacy single-garment actions (for backwards compatibility)
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
      
      // Get total quantity across all garments
      getTotalQuantity: () => {
        const state = get()
        let total = 0
        
        // Sum from multi-garment selections
        Object.values(state.selectedGarments).forEach(garment => {
          Object.values(garment.colorSizeQuantities).forEach(sizeQty => {
            Object.values(sizeQty).forEach(qty => {
              total += qty || 0
            })
          })
        })
        
        // Also include legacy single-garment quantities if present
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
      setMultiGarmentQuote: (quote) => set({ multiGarmentQuote: quote }),
      setTextDescription: (text) => set({ textDescription: text }),
      reset: () => set(initialState),
      
      // Draft management
      setDraftId: (id) => set({ draftId: id }),
      
      getDraftData: () => {
        const state = get()
        return {
          garment_id: state.garmentId,
          selected_colors: state.selectedColors,
          selected_garments: Object.keys(state.selectedGarments).length > 0 ? state.selectedGarments : undefined,
          color_size_quantities: state.colorSizeQuantities,
          print_config: state.printConfig,
          artwork_file_records: state.artworkFileRecords,
          artwork_transforms: state.artworkTransforms,
          vectorized_svg_data: state.vectorizedSvgData,
          customer_name: state.customerName || undefined,
          email: state.email || undefined,
          phone: state.phone || undefined,
          organization_name: state.organizationName || undefined,
          need_by_date: state.needByDate || undefined,
          shipping_address: state.shippingAddress.line1 ? state.shippingAddress : undefined,
          quote: state.quote,
          text_description: state.textDescription || undefined,
        }
      },
      
      saveDraft: async () => {
        const state = get()
        
        // Don't save if there's no meaningful data
        const hasGarments = Object.keys(state.selectedGarments).length > 0
        const hasLegacyData = state.garmentId || state.selectedColors.length > 0
        
        if (!hasGarments && !hasLegacyData) {
          return null
        }
        
        try {
          const draftData = state.getDraftData()
          const response = await fetch('/api/order-drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              draft_id: state.draftId,
              ...draftData
            })
          })
          
          if (!response.ok) {
            const error = await response.json()
            console.error('Failed to save draft:', error)
            return null
          }
          
          const draft: OrderDraft = await response.json()
          
          // Update draftId if this was a new draft
          if (!state.draftId && draft.id) {
            set({ draftId: draft.id })
          }
          
          return draft
        } catch (error) {
          console.error('Error saving draft:', error)
          return null
        }
      },
      
      loadDraft: (draft) => {
        set({
          draftId: draft.id,
          garmentId: draft.garment_id || null,
          selectedColors: draft.selected_colors || [],
          selectedGarments: draft.selected_garments || {},
          colorSizeQuantities: draft.color_size_quantities || {},
          printConfig: draft.print_config || { locations: {} },
          artworkFileRecords: draft.artwork_file_records || {},
          artworkTransforms: draft.artwork_transforms || {},
          vectorizedSvgData: draft.vectorized_svg_data || {},
          customerName: draft.customer_name || '',
          email: draft.email || '',
          phone: draft.phone || '',
          organizationName: draft.organization_name || '',
          needByDate: draft.need_by_date || '',
          shippingAddress: draft.shipping_address ? {
            ...draft.shipping_address,
            line2: draft.shipping_address.line2 || ''
          } : {
            line1: '',
            line2: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'US'
          },
          quote: draft.quote || null,
          textDescription: draft.text_description || '',
          // Clear artworkFiles as they can't be restored from draft
          artworkFiles: {},
        })
      },
      
      deleteDraft: async () => {
        const state = get()
        if (!state.draftId) return true
        
        try {
          const response = await fetch(`/api/order-drafts/${state.draftId}`, {
            method: 'DELETE'
          })
          
          if (!response.ok) {
            console.error('Failed to delete draft')
            return false
          }
          
          set({ draftId: null })
          return true
        } catch (error) {
          console.error('Error deleting draft:', error)
          return false
        }
      },
      
      clearDraft: () => {
        set({ draftId: null })
      }
    }),
    {
      name: 'myswagco-order-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist serializable data - exclude File objects
      partialize: (state) => ({
        draftId: state.draftId,
        selectedGarments: state.selectedGarments,
        garmentId: state.garmentId,
        selectedColors: state.selectedColors,
        colorSizeQuantities: state.colorSizeQuantities,
        printConfig: state.printConfig,
        customerName: state.customerName,
        email: state.email,
        phone: state.phone,
        organizationName: state.organizationName,
        needByDate: state.needByDate,
        shippingAddress: state.shippingAddress,
        artworkFileRecords: state.artworkFileRecords,
        vectorizedSvgData: state.vectorizedSvgData,
        artworkTransforms: state.artworkTransforms,
        quote: state.quote,
        multiGarmentQuote: state.multiGarmentQuote,
        textDescription: state.textDescription,
        // Note: artworkFiles is NOT persisted as File objects can't be serialized
      }),
    }
  )
)
