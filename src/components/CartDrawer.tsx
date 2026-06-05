'use client'
import { useCart } from '@/hooks/useCart'
import { useRouter } from 'next/navigation'
import { X, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { PaymentLogos } from './PaymentLogos'
import { formatPrice } from '@/lib/utils'

const FREE_SHIP = 5000
const FREE_GIFT = 7000

function formatEur(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function ProgressBar({ total }: { total: number }) {
  let msg: React.ReactNode
  let pct: number

  if (total >= FREE_GIFT) {
    msg = <><strong>Cadeau offert !</strong> + Livraison offerte 🎁</>
    pct = 100
  } else if (total >= FREE_SHIP) {
    msg = <>Livraison offerte ! Plus que <strong>{formatEur(FREE_GIFT - total)}</strong> pour un cadeau 🎁</>
    pct = ((total - FREE_SHIP) / (FREE_GIFT - FREE_SHIP)) * 100
  } else {
    msg = <>Plus que <strong>{formatEur(FREE_SHIP - total)}</strong> pour la livraison offerte 🚚</>
    pct = (total / FREE_SHIP) * 100
  }

  return (
    <div className="cart-prog">
      <div className="cart-prog-msg">{msg}</div>
      <div className="cart-prog-track">
        <div className="cart-prog-fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}

export function CartDrawer() {
  const { items, isOpen, openCart, closeCart, removeItem, total, itemCount } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const cartTotal = total()
  const count = itemCount()

  async function handleCheckout() {
    if (items.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product.id,
            variantId: item.variant?.id,
            quantity: item.quantity,
          })),
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating cart button */}
      <button className="float-cart" onClick={openCart} title="Mon panier" aria-label="Ouvrir le panier">
        <ShoppingBag size={18} color="white" strokeWidth={1.8} />
        {count > 0 && <span className="float-cart-badge">{count}</span>}
      </button>

      {/* Overlay */}
      <div
        className={`cart-overlay${isOpen ? ' open' : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className={`cart-drawer${isOpen ? ' open' : ''}`} role="dialog" aria-label="Panier">
        <div className="cart-head">
          <span className="cart-head-title">MON PANIER</span>
          <button className="cart-head-close" onClick={closeCart} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <ProgressBar total={cartTotal} />

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty-state">
              <span className="cart-empty-icon">🛒</span>
              <p>Votre panier est vide</p>
            </div>
          ) : (
            items.map((item) => {
              const price = item.variant?.price ?? item.product.price
              return (
                <div key={`${item.product.id}-${item.variant?.id ?? ''}`} className="cart-row">
                  <div className="cart-row-ph">
                    <span style={{ fontSize: 28 }}>
                      {item.product.category === 'coiffant' ? '🪮' :
                       item.product.category === 'soin' ? '🧴' :
                       item.product.category === 'barbe' ? '🧔' : '⚡'}
                    </span>
                  </div>
                  <div>
                    <div className="cart-row-name">{item.product.name}</div>
                    {item.variant && <div className="cart-row-variant">{item.variant.name}</div>}
                    {item.quantity > 1 && (
                      <div style={{ fontSize: 11, color: 'var(--gt)' }}>Qté : {item.quantity}</div>
                    )}
                    <div className="cart-row-price">{formatEur(price * item.quantity)}</div>
                  </div>
                  <button
                    className="cart-row-rm"
                    onClick={() => removeItem(item.product.id, item.variant?.id)}
                    aria-label="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              )
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-foot">
            <div className="cart-total-row">
              <span className="cart-total-lbl">Total</span>
              <span className="cart-total-price">{formatEur(cartTotal)}</span>
            </div>
            <button
              className="cart-checkout"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? 'Chargement...' : 'Valider ma commande →'}
            </button>
            <PaymentLogos />
          </div>
        )}
      </div>
    </>
  )
}
