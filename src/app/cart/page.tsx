'use client'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Trash2, Plus, Minus } from 'lucide-react'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-32 pb-20 text-center">
        <h1 className="text-4xl mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Votre panier</h1>
        <p className="mb-8" style={{ color: 'var(--white-muted)' }}>Votre panier est vide.</p>
        <Link href="/products" className="inline-block px-8 py-3 text-sm tracking-widest uppercase border" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
          Continuer les achats
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-20">
      <h1 className="text-4xl mb-10" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Votre panier</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map((item) => (
            <div key={`${item.product.id}-${item.variant?.id}`} className="flex gap-4 p-4 border" style={{ background: 'var(--black-card)', borderColor: 'var(--black-border)' }}>
              <div className="w-20 h-20 flex items-center justify-center flex-shrink-0" style={{ background: 'var(--black-soft)' }}>
                <span style={{ color: 'var(--gold)', opacity: 0.3 }}>SP</span>
              </div>
              <div className="flex-1">
                <p className="font-medium" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{item.product.name}</p>
                {item.variant && <p className="text-xs mb-2" style={{ color: 'var(--white-muted)' }}>{item.variant.name}</p>}
                <p style={{ color: 'var(--gold)' }}>{formatPrice(item.variant?.price ?? item.product.price)}</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => removeItem(item.product.id, item.variant?.id)}>
                  <Trash2 size={16} style={{ color: 'var(--white-muted)' }} />
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)} className="w-7 h-7 flex items-center justify-center border" style={{ borderColor: 'var(--black-border)' }}>
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)} className="w-7 h-7 flex items-center justify-center border" style={{ borderColor: 'var(--black-border)' }}>
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border self-start" style={{ background: 'var(--black-card)', borderColor: 'var(--black-border)' }}>
          <h2 className="text-xl mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Récapitulatif</h2>
          <div className="flex justify-between mb-2">
            <span style={{ color: 'var(--white-muted)' }}>Sous-total</span>
            <span>{formatPrice(total())}</span>
          </div>
          <div className="flex justify-between mb-6">
            <span style={{ color: 'var(--white-muted)' }}>Livraison</span>
            <span style={{ color: 'var(--gold)' }}>Gratuite</span>
          </div>
          <div className="flex justify-between text-lg font-semibold mb-8 pt-4 border-t" style={{ borderColor: 'var(--black-border)' }}>
            <span>Total</span>
            <span style={{ color: 'var(--gold)' }}>{formatPrice(total())}</span>
          </div>
          <Link href="/checkout" className="block text-center py-4 text-sm tracking-widest uppercase font-semibold" style={{ background: 'var(--gold)', color: 'var(--black)' }}>
            Passer commande
          </Link>
        </div>
      </div>
    </div>
  )
}
