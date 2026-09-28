import type { Product, ProductImage } from '@/types'

// Type pur (aucune dependance Supabase) pour rester importable depuis un
// composant client (CartDrawer) comme depuis une page serveur.
export type ProductOverride = {
  id: string
  name?: string | null
  price?: number | null
  description?: string | null
  stock?: number | null
  benefit?: string | null
  images?: ProductImage[] | null
  social_proof_text?: string | null
  social_proof_visible?: boolean | null
  actif?: boolean | null
}

// Meme regle partout dans le code (pricing.ts, sitemap.ts, generateMetadata) :
// l'override l'emporte s'il existe, sinon le catalogue statique fait foi. Sans
// ce repli sur base.actif, un produit desactive UNIQUEMENT dans le catalogue
// statique (jamais encore touche en admin, donc sans ligne d'override, ou avec
// une ligne d'override qui ne renseigne pas ce champ) redeviendrait actif des
// qu'une ligne d'override existe pour lui.
export function applyOverride(product: Product, overrides: Record<string, ProductOverride>): Product {
  const o = overrides[product.id]
  if (!o) return product
  return {
    ...product,
    name: o.name ?? product.name,
    price: o.price ?? product.price,
    description: o.description ?? product.description,
    stock: o.stock ?? product.stock,
    benefit: o.benefit ?? product.benefit,
    images: (o.images && o.images.length > 0) ? o.images : product.images,
    actif: o.actif ?? product.actif ?? true,
  }
}
