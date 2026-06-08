'use client'
import { useCart } from '@/hooks/useCart'
import {
  X, ShoppingCart, Plus, Minus, ChevronDown, ChevronUp,
  Lock, Scissors, Droplets, User, Zap, Sparkles,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { PaymentLogos } from './PaymentLogos'
import { formatPrice } from '@/lib/utils'
import { PRODUCTS } from '@/lib/products'
import { getSessionId } from '@/lib/session'

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

  const [loading, setLoading]             = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [cancelMsg, setCancelMsg]         = useState(false)
  const [suggOpen, setSuggOpen]           = useState(true)
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [couponOpen, setCouponOpen]       = useState(false)
  const [couponCode, setCouponCode]       = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError]     = useState('')

  const cartTotal = total()
  const count     = itemCount()

  /* Fermeture Échap */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeCart])

  /* Blocage scroll body */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  /* Reset loading si l'utilisateur revient en arrière depuis Stripe */
  useEffect(() => {
    const resetOnReturn = () => {
      setLoading((prev) => {
        if (prev) setCancelMsg(true)
        return false
      })
      if (safetyTimer.current) clearTimeout(safetyTimer.current)
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') resetOnReturn() }
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) resetOnReturn() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  /* Auto-dismiss du message d'annulation après 3s */
  useEffect(() => {
    if (!cancelMsg) return
    const t = setTimeout(() => setCancelMsg(false), 3000)
    return () => clearTimeout(t)
  }, [cancelMsg])

  /* Barre de progression */
  let progMsg: React.ReactNode
  let progPct: number
  let progDone = false

  if (count === 0) {
    progMsg = <>Ajoutez un produit pour la <strong>livraison offerte dès 49 €</strong></>
    progPct = 0
  } else if (cartTotal >= FREE_GIFT) {
    progMsg = <><strong>Livraison offerte + Cadeau inclus !</strong></>
    progPct = 100; progDone = true
  } else if (cartTotal >= FREE_SHIP) {
    progMsg = <><strong>Livraison offerte !</strong> Plus que <strong>{euros(FREE_GIFT - cartTotal)}</strong> pour un cadeau</>
    progPct = ((cartTotal - FREE_SHIP) / (FREE_GIFT - FREE_SHIP)) * 100
    progDone = true
  } else {
    progMsg = <>Plus que <strong>{euros(FREE_SHIP - cartTotal)}</strong> pour la livraison offerte</>
    progPct = (cartTotal / FREE_SHIP) * 100
  }

  /* Suggestions (max 2, produits absents du panier) */
  const available   = PRODUCTS.filter(p => !p.is_dropshipping && !items.find(i => i.product.id === p.id))
  const suggestions = available.slice(0, 2)

  /* Checkout */
  async function handleCheckout() {
    if (!items.length || loading) return
    setLoading(true)
    setCheckoutError('')
    setCancelMsg(false)

    /* Timeout de sécurité : si après 8s aucune redirection n'a eu lieu, reset */
    safetyTimer.current = setTimeout(() => {
      setLoading(false)
      setCheckoutError('Une erreur est survenue, réessayez.')
    }, 8000)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          session_id: getSessionId(),
          ...(couponApplied && couponCode.trim() ? { coupon: couponCode.trim().toUpperCase() } : {}),
        }),
      })
      const data = await res.json()
      if (data.url) {
        clearTimeout(safetyTimer.current)
        window.location.href = data.url
        /* loading reste true pendant la navigation vers Stripe */
      } else {
        clearTimeout(safetyTimer.current)
        if (data.couponError) { setCouponError(data.couponError); setCouponApplied(false) }
        else setCheckoutError('Une erreur est survenue, réessayez.')
        setLoading(false)
      }
    } catch {
      clearTimeout(safetyTimer.current!)
      setCheckoutError('Une erreur est survenue, réessayez.')
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
      {/* Overlay */}
      <div
        className={`cdr-overlay${isOpen ? ' cdr-overlay--open' : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside
        className={`cdr-drawer${isOpen ? ' cdr-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Panier"
      >

        {/* ① HEADER — fixe, noir, 56px */}
        <div className="cdr-head">
          <div className="cdr-head-left">
            <span className="cdr-head-title">MON PANIER</span>
            {count > 0 && <span className="cdr-head-count">({count})</span>}
          </div>
          <button className="cdr-head-close" onClick={closeCart} aria-label="Fermer le panier">
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* ② BARRE PROGRESSION — fixe, 48px */}
        <div className={`cdr-prog${progDone ? ' cdr-prog--done' : ''}`}>
          <p className="cdr-prog-msg">{progMsg}</p>
          <div className="cdr-prog-track">
            <div className="cdr-prog-fill" style={{ width: `${Math.min(100, Math.max(0, progPct))}%` }} />
          </div>
        </div>

        {/* ③ ZONE SCROLLABLE — produits uniquement */}
        <div className="cdr-body">

          {count === 0 && (
            <div className="cdr-empty">
              <ShoppingCart size={48} strokeWidth={1} className="cdr-empty-icon" />
              <p className="cdr-empty-txt">Votre panier est vide</p>
              <button className="cdr-empty-btn" onClick={closeCart}>Voir les produits</button>
            </div>
          )}

          {count > 0 && (
            <ul className="cdr-list" role="list">
              {items.map(item => {
                const price = item.variant?.price ?? item.product.price
                const key   = `${item.product.id}-${item.variant?.id ?? ''}`
                return (
                  <li key={key} className="cdr-item">

                    <div className="cdr-item-thumb">
                      <CatIcon cat={item.product.category} size={22} />
                    </div>

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
        </div>

        {/* ④ FOOTER FIXE */}
        {count > 0 && (
          <footer className="cdr-foot">

            {/* Code promo — 1 ligne, repliable */}
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
                    onChange={e => { setCouponCode(e.target.value); setCouponError(''); setCouponApplied(false) }}
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
              {couponApplied && !couponError && <p className="cdr-coupon-ok">Code appliqué ✓</p>}
              {couponError && <p className="cdr-coupon-err">{couponError}</p>}
            </div>

            {/* Total */}
            <div className="cdr-total">
              <span className="cdr-total-lbl">TOTAL</span>
              <span className="cdr-total-val">{euros(cartTotal)}</span>
            </div>

            {/* CTA — or, texte noir, 52px */}
            <button
              className={`cdr-checkout${loading ? ' cdr-checkout--loading' : ''}`}
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="cdr-spinner" aria-hidden="true" />
                  Redirection en cours...
                </>
              ) : (
                <><Lock size={14} strokeWidth={2.5} /> Valider ma commande</>
              )}
            </button>
            {checkoutError && (
              <p className="cdr-checkout-err" role="alert">{checkoutError}</p>
            )}
            {cancelMsg && !checkoutError && (
              <p className="cdr-checkout-cancel" role="status">Paiement annulé — votre panier est intact</p>
            )}

            {/* Sécurité + logos — 1 seule rangée compacte */}
            <div className="cdr-foot-secure">
              <Lock size={10} strokeWidth={2} />
              <span>Paiement sécurisé · SSL 256 bits</span>
            </div>
            <div className="cdr-pay-wrap">
              <PaymentLogos />
            </div>

            {/* Suggestions — accordéon replié par défaut */}
            {suggestions.length > 0 && (
              <div className="cdr-sugg">
                <button
                  className="cdr-sugg-toggle"
                  onClick={() => setSuggOpen(v => !v)}
                  aria-expanded={suggOpen}
                >
                  <span>Compl&eacute;ter ma routine</span>
                  {suggOpen ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                </button>

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
          </footer>
        )}
      </aside>
    </>
  )
}
