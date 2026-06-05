'use client'
import { useCart } from '@/hooks/useCart'
import { X, ShoppingBag } from 'lucide-react'
import { useState, useEffect } from 'react'
import { PaymentLogos } from './PaymentLogos'
import { formatPrice } from '@/lib/utils'
import { PRODUCTS } from '@/lib/products'

const FREE_SHIP = 4900
const FREE_GIFT = 7000

const ICONS: Record<string, string> = {
  coiffant: '🪮', soin: '🧴', barbe: '🧔', accessoire: '⚡',
}

function formatEur(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function ProgressBar({ total, isEmpty }: { total: number; isEmpty: boolean }) {
  let msg: React.ReactNode
  let pct: number

  if (isEmpty) {
    msg = <>Ajoutez un produit pour débloquer la <strong>livraison offerte dès 49 €</strong> 🚚</>
    pct = 0
  } else if (total >= FREE_GIFT) {
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
  const { items, isOpen, openCart, closeCart, removeItem, addItem, total, itemCount } = useCart()
  const [loading, setLoading] = useState(false)

  const cartTotal = total()
  const count = itemCount()

  // Fermeture via touche Échap
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeCart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeCart])

  const suggestions = PRODUCTS.filter(
    (p) => !p.is_dropshipping && !items.find((i) => i.product.id === p.id)
  ).slice(0, 2)

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
            <X size={20} />
          </button>
        </div>

        <ProgressBar total={cartTotal} isEmpty={items.length === 0} />

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
                      {ICONS[item.product.category] ?? '✨'}
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

        {/* Upsell strip */}
        {items.length > 0 && suggestions.length > 0 && (
          <div className="cart-upsell">
            <div className="cart-upsell-ttl">Compléter votre routine</div>
            {suggestions.map((p) => (
              <div key={p.id} className="cart-upsell-row">
                <div className="cart-upsell-ico">{ICONS[p.category] ?? '✨'}</div>
                <div className="cart-upsell-inf">
                  <div className="cart-upsell-nm">{p.name}</div>
                  <div className="cart-upsell-pr">{formatPrice(p.price)}</div>
                </div>
                <button
                  className="cart-upsell-btn"
                  onClick={() => addItem(p)}
                  aria-label={`Ajouter ${p.name}`}
                >
                  + Ajouter
                </button>
              </div>
            ))}
          </div>
        )}

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
              {loading ? 'Chargement...' : '🔒 Valider ma commande →'}
            </button>
            <PaymentLogos />
            <div className="cart-trust-foot">
              <div className="cart-trust-item">
                <span className="cart-trust-icon">🔒</span>
                Paiement sécurisé
              </div>
              <div className="cart-trust-item">
                <span className="cart-trust-icon">🚚</span>
                Expédition 24–48h
              </div>
              <div className="cart-trust-item">
                <span className="cart-trust-icon">↩️</span>
                Retour facile 30j
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
