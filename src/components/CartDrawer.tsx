'use client'
import { useCart } from '@/hooks/useCart'
import { X, Lock, Truck, RotateCcw, ShoppingCart, Scissors, Droplets, User, Zap, Sparkles, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { PaymentLogos } from './PaymentLogos'
import { formatPrice } from '@/lib/utils'
import { PRODUCTS } from '@/lib/products'

const FREE_SHIP = 4900
const FREE_GIFT = 7000

function fmt(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function CatIcon({ cat, size = 22 }: { cat: string; size?: number }) {
  const sw = 1.4
  if (cat === 'coiffant') return <Scissors size={size} strokeWidth={sw} />
  if (cat === 'soin')     return <Droplets size={size} strokeWidth={sw} />
  if (cat === 'barbe')    return <User size={size} strokeWidth={sw} />
  if (cat === 'accessoire') return <Zap size={size} strokeWidth={sw} />
  return <Sparkles size={size} strokeWidth={sw} />
}

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, addItem, total, itemCount } = useCart()
  const [loading, setLoading]           = useState(false)
  const [couponOpen, setCouponOpen]     = useState(false)
  const [couponCode, setCouponCode]     = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError]   = useState('')
  const [suggOpen, setSuggOpen]         = useState(true)

  const cartTotal = total()
  const count     = itemCount()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeCart])

  // Barre de progression
  let progMsg: React.ReactNode
  let progPct: number
  if (count === 0) {
    progMsg = <>Ajoutez un produit pour la <strong>livraison offerte dès 49&nbsp;€</strong></>
    progPct = 0
  } else if (cartTotal >= FREE_GIFT) {
    progMsg = <><strong>Cadeau offert&nbsp;!</strong> Livraison offerte incluse</>
    progPct = 100
  } else if (cartTotal >= FREE_SHIP) {
    progMsg = <>Livraison offerte&nbsp;! Plus que <strong>{fmt(FREE_GIFT - cartTotal)}</strong> pour un cadeau</>
    progPct = ((cartTotal - FREE_SHIP) / (FREE_GIFT - FREE_SHIP)) * 100
  } else {
    progMsg = <>Plus que <strong>{fmt(FREE_SHIP - cartTotal)}</strong> pour la livraison offerte</>
    progPct = (cartTotal / FREE_SHIP) * 100
  }

  const suggestions = PRODUCTS.filter(
    p => !p.is_dropshipping && !items.find(i => i.product.id === p.id)
  ).slice(0, 2)

  // Smart upsell: pick cheapest product that covers the free-shipping gap;
  // fall back to cheapest available if none covers it alone.
  const shipGap = FREE_SHIP - cartTotal
  const availableForUpsell = PRODUCTS.filter(
    p => !p.is_dropshipping && !items.find(i => i.product.id === p.id)
  )
  const upsell = count > 0 && cartTotal < FREE_SHIP
    ? (availableForUpsell.filter(p => p.price >= shipGap).sort((a, b) => a.price - b.price)[0]
       ?? availableForUpsell.sort((a, b) => a.price - b.price)[0]
       ?? null)
    : null

  async function handleCheckout() {
    if (!items.length) return
    setLoading(true)
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          ...(couponApplied && couponCode.trim() ? { coupon: couponCode.trim().toUpperCase() } : {}),
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        if (data.couponError) { setCouponError(data.couponError); setCouponApplied(false) }
        else alert(data.error || 'Erreur paiement. Réessayez.')
        setLoading(false)
      }
    } catch {
      alert('Erreur de connexion. Réessayez.')
      setLoading(false)
    }
  }

  function applyCoupon() {
    if (!couponCode.trim()) return
    setCouponApplied(true)
    setCouponError('')
  }

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className={`cd-overlay${isOpen ? ' is-open' : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* ── Drawer ── */}
      <aside className={`cd-drawer${isOpen ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Panier">

        {/* ── En-tête ── */}
        <div className="cd-head">
          <span className="cd-head-title">MON PANIER</span>
          {count > 0 && <span className="cd-head-count">{count}</span>}
          <button className="cd-head-close" onClick={closeCart} aria-label="Fermer le panier">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* ── Barre de progression ── */}
        <div className="cd-prog">
          <p className="cd-prog-msg">{progMsg}</p>
          <div className="cd-prog-track">
            <div className="cd-prog-fill" style={{ width: `${Math.min(100, progPct)}%` }} />
          </div>
        </div>

        {/* ── Zone scrollable (upsell + items + suggestions) ── */}
        <div className="cd-body">

          {/* Upsell livraison */}
          {upsell && (
            <div className="cd-upsell">
              <p className="cd-upsell-msg">Plus que <strong>{fmt(shipGap)}</strong> pour la livraison offerte — ajoutez ce produit :</p>
              <div className="cd-upsell-row">
                <div className="cd-upsell-icon"><CatIcon cat={upsell.category} size={20} /></div>
                <div className="cd-upsell-info">
                  <div className="cd-upsell-name">{upsell.name}</div>
                  <div className="cd-upsell-price">{formatPrice(upsell.price)}</div>
                </div>
                <button className="cd-upsell-btn" onClick={() => addItem(upsell)}>+ Ajouter</button>
              </div>
            </div>
          )}

          {/* Liste produits */}
          {count === 0 ? (
            <div className="cd-empty">
              <ShoppingCart size={40} strokeWidth={1.1} className="cd-empty-icon" />
              <p>Votre panier est vide</p>
              <button className="cd-empty-cta" onClick={closeCart}>Voir nos produits →</button>
            </div>
          ) : (
            <ul className="cd-list">
              {items.map(item => {
                const price = item.variant?.price ?? item.product.price
                const key   = `${item.product.id}-${item.variant?.id ?? ''}`
                return (
                  <li key={key} className="cd-item">
                    {/* Photo placeholder */}
                    <div className="cd-item-thumb">
                      <CatIcon cat={item.product.category} size={24} />
                    </div>
                    {/* Infos */}
                    <div className="cd-item-info">
                      <div className="cd-item-name">{item.product.name}</div>
                      {item.variant && <div className="cd-item-variant">{item.variant.name}</div>}
                      {/* Quantité */}
                      <div className="cd-item-qty">
                        <button
                          className="cd-qty-btn"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)}
                          aria-label="Diminuer la quantité"
                        >
                          <Minus size={10} strokeWidth={2.5} />
                        </button>
                        <span className="cd-qty-val">{item.quantity}</span>
                        <button
                          className="cd-qty-btn"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)}
                          aria-label="Augmenter la quantité"
                        >
                          <Plus size={10} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                    {/* Prix + supprimer */}
                    <div className="cd-item-right">
                      <span className="cd-item-price">{fmt(price * item.quantity)}</span>
                      <button
                        className="cd-item-rm"
                        onClick={() => removeItem(item.product.id, item.variant?.id)}
                        aria-label={`Supprimer ${item.product.name}`}
                      >
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Suggestions */}
          {count > 0 && suggestions.length > 0 && (
            <div className="cd-sugg">
              {/* Séparateur visuel */}
              <button
                className="cd-sugg-toggle"
                onClick={() => setSuggOpen(v => !v)}
                aria-expanded={suggOpen}
              >
                <span className="cd-sugg-line" />
                <span className="cd-sugg-label">VOUS AIMEREZ AUSSI</span>
                <span className="cd-sugg-line" />
                {suggOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {suggOpen && (
                <ul className="cd-sugg-list">
                  {suggestions.map(p => (
                    <li key={p.id} className="cd-sugg-item">
                      <div className="cd-sugg-icon"><CatIcon cat={p.category} size={18} /></div>
                      <div className="cd-sugg-info">
                        <span className="cd-sugg-badge">Suggestion</span>
                        <div className="cd-sugg-name">{p.name}</div>
                        <div className="cd-sugg-price">{formatPrice(p.price)}</div>
                      </div>
                      <button
                        className="cd-sugg-btn"
                        onClick={() => { addItem(p); setSuggOpen(false) }}
                        aria-label={`Ajouter ${p.name} au panier`}
                      >
                        + Ajouter
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Pied fixe ── */}
        {count > 0 && (
          <footer className="cd-foot">
            {/* Total */}
            <div className="cd-total">
              <span className="cd-total-lbl">Total</span>
              <span className="cd-total-val">{fmt(cartTotal)}</span>
            </div>

            {/* Code promo */}
            <div className="cd-coupon">
              {!couponOpen ? (
                <button className="cd-coupon-toggle" onClick={() => setCouponOpen(true)}>
                  J&apos;ai un code promo
                </button>
              ) : (
                <div className="cd-coupon-row">
                  <input
                    type="text"
                    className="cd-coupon-input"
                    placeholder="Code promo"
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value); setCouponError(''); setCouponApplied(false) }}
                    onKeyDown={e => { if (e.key === 'Enter') applyCoupon() }}
                    autoFocus
                  />
                  <button
                    className={`cd-coupon-btn${couponApplied ? ' ok' : ''}`}
                    onClick={applyCoupon}
                    disabled={!couponCode.trim()}
                  >
                    {couponApplied ? '✓' : 'OK'}
                  </button>
                </div>
              )}
              {couponApplied && !couponError && <p className="cd-coupon-ok">Code appliqué ✓</p>}
              {couponError && <p className="cd-coupon-err">{couponError}</p>}
            </div>

            {/* CTA paiement */}
            <button
              className="cd-checkout"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading
                ? 'Chargement…'
                : <><Lock size={12} strokeWidth={2.5} />Valider ma commande →</>
              }
            </button>

            {/* Logos paiement */}
            <PaymentLogos />

            {/* Trust icons */}
            <div className="cd-trust">
              <div className="cd-trust-item">
                <Lock size={11} strokeWidth={2} />
                Sécurisé
              </div>
              <div className="cd-trust-item">
                <Truck size={11} strokeWidth={2} />
                Expédition 48h
              </div>
              <div className="cd-trust-item">
                <RotateCcw size={11} strokeWidth={2} />
                Retour 30j
              </div>
            </div>
          </footer>
        )}
      </aside>
    </>
  )
}
