'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Trash2, Plus, Minus, Lock } from 'lucide-react'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCart()
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    if (items.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Erreur lors du paiement. Veuillez réessayer.')
        setLoading(false)
      }
    } catch {
      alert('Erreur de connexion. Veuillez réessayer.')
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--fs)', fontSize: 'clamp(28px,5vw,40px)', color: 'var(--b)', marginBottom: 12 }}>Votre panier</h1>
        <p style={{ color: 'var(--gt)', marginBottom: 32 }}>Votre panier est vide.</p>
        <Link href="/products" style={{ display: 'inline-block', padding: '12px 32px', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', border: '1px solid var(--gold)', color: 'var(--gold)', textDecoration: 'none', fontFamily: 'var(--fb)' }}>
          Continuer les achats
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 60px' }}>
      <h1 style={{ fontFamily: 'var(--fs)', fontSize: 'clamp(28px,5vw,40px)', color: 'var(--b)', marginBottom: 40 }}>Votre panier</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'start' }}>
        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((item) => (
            <div key={`${item.product.id}-${item.variant?.id}`} style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--g)', border: '1px solid var(--gm)' }}>
              <div style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gm)', flexShrink: 0 }}>
                <span style={{ color: 'var(--gold)', opacity: 0.5, fontFamily: 'var(--fd)', fontSize: 14 }}>SP</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'var(--fs)', fontSize: 16, color: 'var(--b)', marginBottom: 2 }}>{item.product.name}</p>
                {item.variant && <p style={{ fontSize: 12, color: 'var(--gt)', marginBottom: 4 }}>{item.variant.name}</p>}
                <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 14 }}>{formatPrice((item.variant?.price ?? item.product.price) * item.quantity)}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <button onClick={() => removeItem(item.product.id, item.variant?.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gt)', padding: 4 }}>
                  <Trash2 size={15} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--gm)', background: 'none', cursor: 'pointer', color: 'var(--b)' }}>
                    <Minus size={11} />
                  </button>
                  <span style={{ minWidth: 20, textAlign: 'center', fontSize: 13, color: 'var(--b)' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--gm)', background: 'none', cursor: 'pointer', color: 'var(--b)' }}>
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Récapitulatif */}
        <div style={{ width: 280, padding: 24, background: 'var(--g)', border: '1px solid var(--gm)', position: 'sticky', top: 100 }}>
          <h2 style={{ fontFamily: 'var(--fs)', fontSize: 20, color: 'var(--b)', marginBottom: 24 }}>Récapitulatif</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--gt)' }}>
            <span>Sous-total</span>
            <span style={{ color: 'var(--b)' }}>{formatPrice(total())}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, fontSize: 13, color: 'var(--gt)' }}>
            <span>Livraison</span>
            <span style={{ color: 'var(--gold)' }}>Gratuite</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600, marginBottom: 24, paddingTop: 16, borderTop: '1px solid var(--gm)', color: 'var(--b)' }}>
            <span>Total</span>
            <span style={{ color: 'var(--gold)' }}>{formatPrice(total())}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px 0', background: loading ? 'var(--gm)' : 'var(--b)', color: 'var(--w)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--fb)', fontWeight: 700, border: 'none', cursor: loading ? 'wait' : 'pointer' }}
          >
            <Lock size={12} strokeWidth={2} />
            {loading ? 'Chargement...' : 'Passer commande'}
          </button>
        </div>
      </div>
    </div>
  )
}
