import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { CartItem, Product, ProductVariant } from '@/types'
import { getSessionId } from '@/lib/session'

const sessionCartStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(`${name}_${getSessionId()}`)
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(`${name}_${getSessionId()}`, value)
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`${name}_${getSessionId()}`)
  },
}))

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (product: Product, variant?: ProductVariant) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addItem: (product, variant) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.product.id === product.id && i.variant?.id === variant?.id
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id && i.variant?.id === variant?.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity: 1, variant }] }
        })
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.product.id === productId && i.variant?.id === variantId)
          ),
        }))
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId && i.variant?.id === variantId
              ? { ...i, quantity }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce((sum, item) => {
          const price = item.variant?.price ?? item.product.price
          return sum + price * item.quantity
        }, 0),

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: 'cart',
      storage: sessionCartStorage,
      partialize: (state) => ({ items: state.items }),
      // SSR (2026-11-19, audit externe relaye par Hedi, cause reelle de
      // l'erreur d'hydratation React #418 sur TOUTE page) : sans ceci, la
      // rehydratation depuis localStorage se declenche a la creation du
      // store, au chargement du bundle navigateur -- donc AVANT la passe
      // d'hydratation React. Le serveur rend toujours un panier vide (pas
      // de localStorage cote serveur) ; un visiteur avec un panier non vide
      // voyait donc le badge du panier (Header, CartDrawer) differer entre
      // le HTML serveur et le premier rendu client, exactement ce que
      // #418 signale. La vraie rehydratation est desormais declenchee
      // manuellement, apres le montage (voir SessionInit.tsx) -- le
      // premier rendu client est alors garanti identique au serveur.
      skipHydration: true,
    }
  )
)
