'use client'
import { useCart } from '@/hooks/useCart'
import { useState } from 'react'
import { getSessionId } from '@/lib/session'
import Link from 'next/link'
import {
  Lock, Truck, RotateCcw, ArrowLeft,
  Scissors, Droplets, User, Zap, Sparkles,
} from 'lucide-react'
import { PaymentLogos } from '@/components/PaymentLogos'
import { formatPrice } from '@/lib/utils'

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

export default function CheckoutPage() {
  const { items, total, itemCount } = useCart()
  const [email, setEmail]               = useState('')
  const [couponCode, setCouponCode]     = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError]   = useState('')
  const [loading, setLoading]           = useState(false)

  const cartTotal  = total()
  const count      = itemCount()
  const isFreeShip = cartTotal >= 4900
  const colissimo  = isFreeShip ? 0 : 690

  function applyCoupon() {
    if (!couponCode.trim()) return
    setCouponApplied(true)
    setCouponError('')
  }

  async function handleCheckout() {
    if (!items.length) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          session_id: getSessionId(),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(couponApplied && couponCode.trim()
            ? { coupon: couponCode.trim().toUpperCase() }
            : {}),
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        if (data.couponError) {
          setCouponError(data.couponError)
          setCouponApplied(false)
        } else {
          alert(data.error || 'Erreur paiement. Veuillez reessayer.')
        }
        setLoading(false)
      }
    } catch {
      alert('Erreur de connexion. Veuillez reessayer.')
      setLoading(false)
    }
  }

  /* ── Panier vide ── */
  if (count === 0) {
    return (
      <div className="chk-empty">
        <p>Votre panier est vide.</p>
        <Link href="/" className="chk-empty-btn">Voir les produits</Link>
      </div>
    )
  }

  return (
    <div className="chk-page">
      <div className="chk-inner">

        {/* ── COLONNE GAUCHE : récapitulatif commande ── */}
        <div className="chk-left">
          <Link href="/" className="chk-back">
            <ArrowLeft size={13} strokeWidth={2} /> Continuer mes achats
          </Link>

          <h1 className="chk-title">Votre commande</h1>

          {/* Liste produits */}
          <ul className="chk-list">
            {items.map(item => {
              const price = item.variant?.price ?? item.product.price
              return (
                <li
                  key={`${item.product.id}-${item.variant?.id ?? ''}`}
                  className="chk-item"
                >
                  <div className="chk-item-thumb">
                    <CatIcon cat={item.product.category} size={22} />
                    {item.quantity > 1 && (
                      <span className="chk-item-qty-badge">{item.quantity}</span>
                    )}
                  </div>
                  <div className="chk-item-info">
                    <div className="chk-item-name">{item.product.name}</div>
                    {item.variant && (
                      <div className="chk-item-variant">{item.variant.name}</div>
                    )}
                  </div>
                  <div className="chk-item-price">{euros(price * item.quantity)}</div>
                </li>
              )
            })}
          </ul>

          {/* Code promo */}
          <div className="chk-coupon">
            <div className="chk-coupon-row">
              <input
                type="text"
                className="chk-coupon-input"
                placeholder="Code promo"
                value={couponCode}
                onChange={e => {
                  setCouponCode(e.target.value)
                  setCouponError('')
                  setCouponApplied(false)
                }}
                onKeyDown={e => { if (e.key === 'Enter') applyCoupon() }}
              />
              <button
                className={`chk-coupon-btn${couponApplied ? ' ok' : ''}`}
                onClick={applyCoupon}
                disabled={!couponCode.trim() || couponApplied}
              >
                {couponApplied ? 'Applique !' : 'Appliquer'}
              </button>
            </div>
            {couponError && <p className="chk-coupon-err">{couponError}</p>}
          </div>

          {/* Totaux */}
          <div className="chk-totals">
            <div className="chk-total-row">
              <span>Sous-total</span>
              <span>{euros(cartTotal)}</span>
            </div>
            <div className="chk-total-row">
              <span>Livraison Colissimo</span>
              <span className={isFreeShip ? 'chk-free' : ''}>
                {isFreeShip ? 'Offerte !' : euros(colissimo)}
              </span>
            </div>
            {!isFreeShip && (
              <p className="chk-total-hint">
                Plus que <strong>{euros(4900 - cartTotal)}</strong> pour la livraison offerte
              </p>
            )}
            <div className="chk-total-row chk-total-row--grand">
              <span>Total</span>
              <span>{euros(cartTotal + colissimo)}</span>
            </div>
          </div>
        </div>

        {/* ── COLONNE DROITE : paiement ── */}
        <div className="chk-right">
          <h2 className="chk-pay-title">Paiement</h2>

          {/* Email invité (optionnel) */}
          <div className="chk-guest">
            <label className="chk-label" htmlFor="chk-email">
              Email — pour recevoir votre confirmation
            </label>
            <input
              id="chk-email"
              type="email"
              className="chk-input"
              placeholder="votre@email.fr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* Garanties */}
          <div className="chk-trust">
            <div className="chk-trust-item">
              <Lock size={12} strokeWidth={2} /> Paiement SSL securise
            </div>
            <div className="chk-trust-item">
              <Truck size={12} strokeWidth={2} /> Colissimo 2-5 jours
            </div>
            <div className="chk-trust-item">
              <RotateCcw size={12} strokeWidth={2} /> Retours 30 jours
            </div>
          </div>

          {/* Bouton paiement */}
          <button
            className="chk-cta"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading
              ? 'Chargement...'
              : <><Lock size={14} strokeWidth={2.5} /> Passer au paiement &rarr;</>
            }
          </button>

          <p className="chk-cta-note">
            Achat en tant qu&apos;invite &mdash; aucun compte requis
          </p>

          {/* Modes de paiement */}
          <PaymentLogos />
        </div>
      </div>
    </div>
  )
}
