'use client'
import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Product, ProductVariant } from '@/types'
import { ShoppingBag, Check } from 'lucide-react'

export function ProductDetail({ product }: { product: Product }) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  )
  const [added, setAdded] = useState(false)
  const addItem = useCart((s) => s.addItem)

  const price = selectedVariant?.price ?? product.price

  function handleAddToCart() {
    addItem(product, selectedVariant)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image */}
        <div className="aspect-square flex items-center justify-center rounded-sm" style={{ background: 'var(--black-soft)' }}>
          <span className="text-[12rem] opacity-10" style={{ color: 'var(--gold)' }}>SP</span>
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--gold)' }}>{product.category}</p>
          <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{product.name}</h1>
          <p className="text-base mb-6" style={{ color: 'var(--white-muted)' }}>{product.description}</p>

          {/* Variants */}
          {product.variants && (
            <div className="mb-6">
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--white-muted)' }}>Choisir le modèle</p>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className="px-4 py-2 text-sm border transition-all"
                    style={{
                      borderColor: selectedVariant?.id === v.id ? 'var(--gold)' : 'var(--black-border)',
                      color: selectedVariant?.id === v.id ? 'var(--gold)' : 'var(--white-muted)',
                      background: selectedVariant?.id === v.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                    }}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-3xl font-light mb-8" style={{ color: 'var(--gold)', fontFamily: 'Cormorant Garamond, serif' }}>
            {formatPrice(price)}
          </p>

          <button
            onClick={handleAddToCart}
            className="flex items-center justify-center gap-3 py-4 text-sm tracking-widest uppercase font-semibold transition-all"
            style={{ background: added ? '#2d7a2d' : 'var(--gold)', color: 'var(--black)' }}
          >
            {added ? <Check size={18} /> : <ShoppingBag size={18} />}
            {added ? 'Ajouté au panier' : 'Ajouter au panier'}
          </button>
        </div>
      </div>
    </div>
  )
}
