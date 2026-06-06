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

  function handleClick() {
    addItem(product, variant)
    openCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <button
      className={className}
      onClick={handleClick}
      style={added ? { background: 'var(--green)' } : undefined}
    >
      {added ? '✓ Ajouté !' : <><ShoppingCart size={13} strokeWidth={2} style={{ marginRight: 5, verticalAlign: 'middle' }} />{label}</>}
    </button>
  )
}
