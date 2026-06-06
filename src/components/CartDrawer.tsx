'use client'
import { useCart } from '@/hooks/useCart'
import {
  X, ShoppingCart, Plus, Minus, ChevronDown, ChevronUp,
  Lock, Scissors, Droplets, User, Zap, Sparkles,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { PaymentLogos } from './PaymentLogos'
import { formatPrice } from '@/lib/utils'
import { PRODUCTS } from '@/lib/products'

const FREE_SHIP = 4900
const FREE_GIFT = 7000

function euros(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function CatIcon({ cat, size = 20 }: { cat: string; size?: number }) {
  const sw = 1.5
  if (cat === 'coiffant')   return <Scissors   size={size} strokeWidth={sw} />
  if (cat === 'soin')       return <Droplets   size={size} strokeWidth={sw} />
  if (cat === 'barbe')      return <User       size={size} strokeWidth={sw} />
  if (cat === 'accessoire') return <Zap        size={size} strokeWidth={sw} />
  return <Sparkles size={size} strokeWidth={sw} />
}

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, addItem, total, itemCount } = useCart()

  const [loading, setLoading]           = useState(false)
  const [suggOpen, setSuggOpen]         = useState(false)
  const [couponOpen, setCouponOpen]     = useState(false)
  const [couponCode, setCouponCode]     = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError]   = useState('')

  const cartTotal = total()
  const count     = itemCount()

  /* ── Fermeture Échap ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeCart])

  /* ── Blocage scroll body ── */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  /* ── Barre de progression ── */
  let progMsg: React.ReactNode
  let progPct: number
  let progDone = false

  if (count === 0) {
    progMsg = <>Ajoutez un produit pour la <strong>livraison offerte dès 49 €</strong></>
    progPct = 0
  } else if (cartTotal >= FREE_GIFT) {
    progMsg = <><strong>🎉 Livraison offerte + Cadeau inclus !</strong></>
    progPct = 100; progDone = true
  } else if (cartTotal >= FREE_SHIP) {
    progMsg = <>🎉 <strong>Livraison offerte !</strong> Plus que <strong>{euros(FREE_GIFT - cartTotal)}</strong> pour un cadeau</>
    progPct = ((cartTotal - FREE_SHIP) / (FREE_GIFT - FREE_SHIP)) * 100
    progDone = true
  } else {
    progMsg = <>Plus que <strong>{euros(FREE_SHIP - cartTotal)}</strong> pour la livraison offerte</>
    progPct = (cartTotal / FREE_SHIP) * 100
  }

  /* ── Upsell intelligent ── */
  const shipGap  = FREE_SHIP - cartTotal
  const available = PRODUCTS.filter(p => !p.is_dropshipping && !items.find(i => i.product.id === p.id))
  const upsell = count > 0 && cartTotal < FREE_SHIP
    ? (available.filter(p => p.price >= shipGap).sort((a, b) => a.price - b.price)[0]
       ?? available.sort((a, b) => a.price - b.price)[0]
       ?? null)
    : null

  /* ── Suggestions (max 2) ── */
  const suggestions = available.slice(0, 2)

  /* ── Checkout ── */
  async function handleCheckout() {
    if (!items.length) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
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
      {/* ── Overlay — clic ferme le drawer ── */}
      <div
        className={`cdr-overlay${isOpen ? ' cdr-overlay--open' : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* ── Drawer ── */}
      <aside
        className={`cdr-drawer${isOpen ? ' cdr-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Panier"
      >

        {/* ①  HEADER — noir, texte crème */}
        <div className="cdr-head">
          <div className="cdr-head-left">
            <span className="cdr-head-title">MON PANIER</span>
            {count > 0 && <span className="cdr-head-count">({count})</span>}
          </div>
          <button
            className="cdr-head-close"
            onClick={closeCart}
            aria-label="Fermer le panier"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* ②  BARRE PROGRESSION */}
        <div className={`cdr-prog${progDone ? ' cdr-prog--done' : ''}`}>
          <p className="cdr-prog-msg">{progMsg}</p>
          <div className="cdr-prog-track">
            <div
              className="cdr-prog-fill"
              style={{ width: `${Math.min(100, Math.max(0, progPct))}%` }}
            />
          </div>
        </div>

        {/* ③  ZONE SCROLLABLE */}
        <div className="cdr-body">

          {/* État vide */}
          {count === 0 && (
            <div className="cdr-empty">
              <ShoppingCart size={52} strokeWidth={1} className="cdr-empty-icon" />
              <p className="cdr-empty-txt">Votre panier est vide</p>
              <button className="cdr-empty-btn" onClick={closeCart}>
                Voir les produits →
              </button>
            </div>
          )}

          {/* Upsell livraison */}
          {upsell && (
            <div className="cdr-upsell">
              <p className="cdr-upsell-msg">
                Plus que <strong>{euros(shipGap)}</strong> pour la livraison offerte
              </p>
              <div className="cdr-upsell-row">
                <div className="cdr-upsell-icon">
                  <CatIcon cat={upsell.category} size={18} />
                </div>
                <div className="cdr-upsell-info">
                  {upsell.benefit && (
                    <div className="cdr-upsell-benefit">{upsell.benefit}</div>
                  )}
                  <div className="cdr-upsell-name">{upsell.name}</div>
                  <div className="cdr-upsell-price">{formatPrice(upsell.price)}</div>
                </div>
                <button
                  className="cdr-upsell-btn"
                  onClick={() => addItem(upsell)}
                  aria-label={`Ajouter ${upsell.name}`}
                >
                  + Ajouter
                </button>
              </div>
            </div>
          )}

          {/* ── Liste produits ── */}
          {count > 0 && (
            <ul className="cdr-list" role="list">
              {items.map(item => {
                const price = item.variant?.price ?? item.product.price
                const key   = `${item.product.id}-${item.variant?.id ?? ''}`
                return (
                  <li key={key} className="cdr-item">

                    {/* Thumb 60×60 */}
                    <div className="cdr-item-thumb">
                      <CatIcon cat={item.product.category} size={22} />
                    </div>

                    {/* Info : nom + variante + prix + quantité */}
                    <div className="cdr-item-info">
                      <div className="cdr-item-name">{item.product.name}</div>
                      {item.variant && (
                        <div className="cdr-item-variant">{item.variant.name}</div>
                      )}
                      <div className="cdr-item-price-row">
                        <span className="cdr-item-price">{euros(price * item.quantity)}</span>
                        {item.quantity > 1 && (
                          <span className="cdr-item-unit">({euros(price)} / u)</span>
                        )}
                      </div>
                      {/* Quantité */}
                      <div className="cdr-item-qty">
                        <button
                          className="cdr-qty-btn"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)}
                          aria-label="Diminuer la quantité"
                        >
                          <Minus size={11} strokeWidth={2.5} />
                        </button>
                        <span className="cdr-qty-val">{item.quantity}</span>
                        <button
                          className="cdr-qty-btn"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)}
                          aria-label="Augmenter la quantité"
                        >
                          <Plus size={11} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    {/* Supprimer — haut droite */}
                    <button
                      className="cdr-item-rm"
                      onClick={() => removeItem(item.product.id, item.variant?.id)}
                      aria-label={`Supprimer ${item.product.name}`}
                    >
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* ── Suggestions : COMPLÉTEZ VOTRE ROUTINE ── */}
          {count > 0 && suggestions.length > 0 && (
            <div className="cdr-sugg">
              <button
                className="cdr-sugg-toggle"
                onClick={() => setSuggOpen(v => !v)}
                aria-expanded={suggOpen}
              >
                <span className="cdr-sugg-label">
                  {suggOpen ? 'COMPLÉTEZ VOTRE ROUTINE' : 'Voir les suggestions ▼'}
                </span>
                {suggOpen
                  ? <ChevronUp size={14} strokeWidth={2} />
                  : <ChevronDown size={14} strokeWidth={2} />
                }
              </button>

              {!suggOpen && (
                <p className="cdr-sugg-sub">Ces produits ne sont pas dans votre panier</p>
              )}

              {suggOpen && (
                <ul className="cdr-sugg-list" role="list">
                  {suggestions.map(p => (
                    <li key={p.id} className="cdr-sugg-item">
                      <div className="cdr-sugg-icon">
                        <CatIcon cat={p.category} size={17} />
                      </div>
                      <div className="cdr-sugg-info">
                        <div className="cdr-sugg-name">{p.name}</div>
                        <div className="cdr-sugg-price">{formatPrice(p.price)}</div>
                      </div>
                      <button
                        className="cdr-sugg-btn"
                        onClick={() => { addItem(p); setSuggOpen(false) }}
                        aria-label={`Ajouter ${p.name}`}
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

        {/* ④  FOOTER FIXE — toujours visible */}
        {count > 0 && (
          <footer className="cdr-foot">

            {/* Code promo */}
            <div className="cdr-coupon">
              {!couponOpen ? (
                <button className="cdr-coupon-toggle" onClick={() => setCouponOpen(true)}>
                  J&apos;ai un code promo
                </button>
              ) : (
                <div className="cdr-coupon-row">
                  <input
                    type="text"
                    className="cdr-coupon-input"
                    placeholder="Code promo"
                    value={couponCode}
                    onChange={e => {
                      setCouponCode(e.target.value)
                      setCouponError('')
                      setCouponApplied(false)
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') applyCoupon() }}
                    autoFocus
                  />
                  <button
                    className={`cdr-coupon-btn${couponApplied ? ' cdr-coupon-btn--ok' : ''}`}
                    onClick={applyCoupon}
                    disabled={!couponCode.trim()}
                  >
                    {couponApplied ? '✓' : 'OK'}
                  </button>
                </div>
              )}
              {couponApplied && !couponError && (
                <p className="cdr-coupon-ok">Code appliqué ✓</p>
              )}
              {couponError && (
                <p className="cdr-coupon-err">{couponError}</p>
              )}
            </div>

            {/* Total */}
            <div className="cdr-total">
              <span className="cdr-total-lbl">Total</span>
              <span className="cdr-total-val">{euros(cartTotal)}</span>
            </div>

            {/* CTA — fond doré, texte noir, 52px */}
            <button
              className="cdr-checkout"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading
                ? 'Chargement…'
                : <><Lock size={14} strokeWidth={2.5} /> Valider ma commande →</>
              }
            </button>

            <p className="cdr-secure-txt">Paiement 100% sécurisé · SSL 256 bits</p>

            {/* Logos paiement */}
            <PaymentLogos />
          </footer>
        )}
      </aside>
    </>
  )
}
