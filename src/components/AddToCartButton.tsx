'use client'
import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { Product, ProductVariant } from '@/types'
import { ShoppingCart } from 'lucide-react'

interface Props {
  product: Product
  variant?: ProductVariant
  className?: string
  label?: string
}

export function AddToCartButton({ product, variant, className = 'fi-atc-btn', label = 'Ajouter au panier' }: Props) {
  const [added, setAdded] = useState(false)
  const addItem = useCart((s) => s.addItem)
  const openCart = useCart((s) => s.openCart)
  const items = useCart((s) => s.items)

  // Confort d'affichage, pas la garantie : la vraie limite est revalidee cote
  // serveur au checkout (pricing.ts), qui lit le stock reel au lieu de cette
  // copie potentiellement perimee du panier. Un produit en dropshipping (la
  // Tondeuse) est hors de ce systeme -- le fournisseur gere son propre stock.
  const dejaAuPanier = items.find(
    (i) => i.product.id === product.id && i.variant?.id === variant?.id,
  )?.quantity ?? 0
  const stockEpuise = !product.is_dropshipping && dejaAuPanier >= product.stock

  function handleClick() {
    if (stockEpuise) return
    addItem(product, variant)
    openCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <button
      className={className}
      onClick={handleClick}
      disabled={stockEpuise}
      style={added ? { background: 'var(--green)' } : stockEpuise ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    >
      {added
        ? '✓ Ajouté !'
        : stockEpuise
          ? 'Rupture de stock'
          : <><ShoppingCart size={13} strokeWidth={2} style={{ marginRight: 5, verticalAlign: 'middle' }} />{label}</>}
    </button>
  )
}
