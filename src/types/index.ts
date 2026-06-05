export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  images: string[]
  category: string
  stock: number
  is_dropshipping: boolean
  dsers_url?: string
  variants?: ProductVariant[]
  seo_title?: string
  seo_description?: string
  created_at: string
  benefit?: string
  trust?: string[]
  related?: string[]
}

export interface ProductVariant {
  id: string
  name: string
  price: number
  stock: number
}

export interface CartItem {
  product: Product
  quantity: number
  variant?: ProductVariant
}

export interface Order {
  id: string
  user_id?: string
  email: string
  items: CartItem[]
  total: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  stripe_payment_intent_id: string
  shipping_address: ShippingAddress
  created_at: string
}

export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  postal_code: string
  country: string
}
