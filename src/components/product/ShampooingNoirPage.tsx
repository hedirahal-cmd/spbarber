'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { PRODUCTS } from '@/lib/products'
import { PaymentLogos } from '@/components/PaymentLogos'
import { AddToCartButton } from '@/components/AddToCartButton'
import { BeforeAfterSlider } from '@/components/product/BeforeAfterSlider'
import {
  CheckCircle2, ShoppingCart, Clock, Truck,
  Dumbbell, Sparkles, Leaf, FlaskConical,
  Droplets, Scissors, Zap, Waves, AlignJustify, Package, Wind,
} from 'lucide-react'

const PRODUCT = PRODUCTS.find((p) => p.id === '2')!
const REVIEWS = { count: 87, rating: '4,8' }
const SOCIAL_COUNT = 51
const FREE_SHIP = 4900

function ProductIcon({ productId, size = 40 }: { productId: string; size?: number }) {
  if (productId === '1') return <Scissors   size={size} strokeWidth={1.2} />
  if (productId === '2') return <Droplets   size={size} strokeWidth={1.2} />
  if (productId === '3') return <Waves      size={size} strokeWidth={1.2} />
  if (productId === '4') return <AlignJustify size={size} strokeWidth={1.2} />
  if (productId === '5') return <Zap        size={size} strokeWidth={1.2} />
  if (productId === '6') return <Package    size={size} strokeWidth={1.2} />
  if (productId === '7') return <Wind       size={size} strokeWidth={1.2} />
  return <Scissors size={size} strokeWidth={1.2} />
}

const CATEGORY_LABELS: Record<string, string> = {
  coiffant: 'Coiffant',
  soin: 'Soin',
  barbe: 'Barbe',
  accessoire: 'Accessoire',
}

function getTomorrowLabel() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function ShampooingNoirPage() {
  const [added, setAdded] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const atcRef = useRef<HTMLButtonElement>(null)
  const addItem = useCart((s) => s.addItem)
  const openCart = useCart((s) => s.openCart)
  const cartTotal = useCart((s) => s.total())

  const remaining = Math.max(0, FREE_SHIP - cartTotal)
  const pct = Math.min(100, (cartTotal / FREE_SHIP) * 100)
  const tomorrow = getTomorrowLabel()

  const relatedProducts = PRODUCT.related
    ? PRODUCTS.filter((p) => PRODUCT.related!.includes(p.id))
    : []

  useEffect(() => {
    const el = atcRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function handleAddToCart() {
    addItem(PRODUCT, undefined)
    openCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div className="sn-page">

      {/* ── BLOC 1 — Hero 2 colonnes ── */}
      <section className="sn-hero">

        {/* Colonne gauche — scroll interne, photo + slider */}
        <div className="sn-hero-left">
          {/* Photo produit placeholder */}
          <div className="sn-hero-photo">
            <Droplets size={56} strokeWidth={0.9} />
            <span>Photo produit</span>
          </div>

          {/* Slider avant/après — hauteur 280px max */}
          <BeforeAfterSlider bare className="sn-hero-slider" />

          <div className="sn-pills">
            <span className="sn-pill">Sans ammoniaque</span>
            <span className="sn-pill">Résultat en 1 lavage</span>
            <span className="sn-pill">Tient 3–4 semaines</span>
          </div>
        </div>

        {/* Colonne droite — bloc achat */}
        <div className="sn-hero-right">
          <div className="sn-bc">
            <Link href="/">Accueil</Link>
            {' › '}
            <span>Shampooing Noir Colorant</span>
          </div>

          <div className="sn-badge-cat">Soin Colorant</div>

          <h1 className="sn-h1">Shampooing Noir Colorant</h1>
          <div className="sn-sub">Cheveux noirs intenses dès 1 lavage</div>

          <div className="sn-stars-row">
            <span className="sn-stars">★★★★★</span>
            <span className="sn-stars-lbl">{REVIEWS.rating}/5 · {REVIEWS.count} avis vérifiés</span>
          </div>

          <div className="sn-social">
            <Sparkles size={13} strokeWidth={2} />
            {SOCIAL_COUNT} achetés cette semaine
          </div>

          <div className="sn-price-block">
            <div className="sn-price">{formatPrice(PRODUCT.price)}</div>
            <div className="sn-price-note">Prix TTC · Livraison offerte dès 49€</div>
          </div>

          <div className="sn-check-list">
            {(PRODUCT.trust ?? []).map((item, i) => (
              <div key={i} className="sn-check">
                <CheckCircle2 size={14} strokeWidth={2} />
                {item}
              </div>
            ))}
          </div>

          <div className="sn-stock">
            <CheckCircle2 size={13} strokeWidth={2} />
            En stock — Commandez avant 16h, livraison {tomorrow}
          </div>

          <button
            ref={atcRef}
            className={`sn-atc${added ? ' sn-atc-added' : ''}`}
            onClick={handleAddToCart}
          >
            <ShoppingCart size={16} strokeWidth={2} />
            {added ? '✓ Ajouté au panier !' : 'Ajouter au panier'}
          </button>

          <div className="sn-prog">
            <div className="sn-prog-msg">
              {remaining > 0 ? (
                <>Plus que <strong>{(remaining / 100).toFixed(2).replace('.', ',')} €</strong> pour la livraison offerte</>
              ) : (
                <strong>Livraison offerte !</strong>
              )}
            </div>
            <div className="sn-prog-track">
              <div className="sn-prog-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <PaymentLogos />
        </div>
      </section>

      {/* ── BLOC 2 — Photo produit + Description ── */}
      <section className="sn-pd-sec">
        <div className="sn-pd-left">
          <div className="sn-ph">
            <div className="sn-ph-icon">
              <Droplets size={64} strokeWidth={0.9} color="var(--gt)" />
            </div>
            <div className="sn-ph-lbl">Photo produit</div>
          </div>
        </div>

        <div className="sn-pd-right">
          <div className="sn-desc-ttl">Description</div>
          <p className="sn-desc-txt">{PRODUCT.description}</p>

          <div className="sn-bens">
            <div className="sn-ben">
              <div className="sn-ben-icon"><Dumbbell size={18} strokeWidth={1.5} /></div>
              <div>
                <div className="sn-ben-title">Qualité professionnelle</div>
                <div className="sn-ben-sub">Les mêmes produits qu&apos;en salon.</div>
              </div>
            </div>
            <div className="sn-ben">
              <div className="sn-ben-icon"><Sparkles size={18} strokeWidth={1.5} /></div>
              <div>
                <div className="sn-ben-title">Résultats visibles</div>
                <div className="sn-ben-sub">Efficacité prouvée dès la 1ère utilisation.</div>
              </div>
            </div>
            <div className="sn-ben">
              <div className="sn-ben-icon"><Leaf size={18} strokeWidth={1.5} /></div>
              <div>
                <div className="sn-ben-title">Formule soignée</div>
                <div className="sn-ben-sub">Sans ammoniaque ni oxydant.</div>
              </div>
            </div>
            <div className="sn-ben">
              <div className="sn-ben-icon"><FlaskConical size={18} strokeWidth={1.5} /></div>
              <div>
                <div className="sn-ben-title">Testé par des barbiers</div>
                <div className="sn-ben-sub">Formulé et validé par des professionnels.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BLOC 3 — Comment ça fonctionne ── */}
      <section className="sn-how">
        <div className="sn-how-inner">
          <div className="sn-how-eyebrow">— Mode d&apos;emploi —</div>
          <h2 className="sn-how-title">COMMENT ÇA FONCTIONNE</h2>
          <div className="sn-how-steps">
            <div className="sn-step">
              <div className="sn-step-num">1</div>
              <div className="sn-step-label">Appliquez</div>
              <div className="sn-step-desc">Utilisez comme un shampooing ordinaire sur cheveux mouillés</div>
            </div>
            <div className="sn-step-arrow" aria-hidden="true">&#8594;</div>
            <div className="sn-step">
              <div className="sn-step-num">2</div>
              <div className="sn-step-label">Laissez poser</div>
              <div className="sn-step-desc">Laissez agir 3 minutes — les pigments pénètrent en profondeur</div>
            </div>
            <div className="sn-step-arrow" aria-hidden="true">&#8594;</div>
            <div className="sn-step">
              <div className="sn-step-num">3</div>
              <div className="sn-step-label">Rincez</div>
              <div className="sn-step-desc">Rincez abondamment — couleur ravivée, cheveux brillants</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BLOC 4 — Produits complémentaires ── */}
      {relatedProducts.length > 0 && (
        <div className="sac-sec">
          <div className="sac-hd">
            <div className="sac-ttl">COMPLÉTEZ VOTRE ROUTINE</div>
            <div className="sac-sub">Ces produits sont souvent achetés ensemble</div>
          </div>
          <div className="sac-grid">
            {relatedProducts.map((rp) => (
              <div key={rp.id} className="sac-card">
                <Link href={`/products/${rp.slug}`} className="sac-card-link">
                  <div className="sac-img">
                    <div className="sac-icon-ring">
                      <ProductIcon productId={rp.id} size={56} />
                    </div>
                  </div>
                  <div className="sac-info">
                    <div className="sac-cat">{CATEGORY_LABELS[rp.category] ?? rp.category}</div>
                    {rp.benefit && <div className="sac-benefit">{rp.benefit}</div>}
                    <div className="sac-name">{rp.name}</div>
                    <div className="sac-price">{formatPrice(rp.price)}</div>
                  </div>
                </Link>
                {!rp.is_dropshipping && (
                  <AddToCartButton product={rp} className="sac-atc" label="Ajouter au panier" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky ATC — apparaît quand le bouton sort du viewport */}
      {stickyVisible && (
        <div className="fi-sticky-atc">
          <div className="fi-sticky-info">
            <span className="fi-sticky-name">Shampooing Noir Colorant</span>
            <span className="fi-sticky-price">{formatPrice(PRODUCT.price)}</span>
          </div>
          <button className="fi-sticky-btn" onClick={handleAddToCart}>
            <ShoppingCart size={14} strokeWidth={2} />
            {added ? 'Ajouté !' : 'Ajouter au panier'}
          </button>
        </div>
      )}
    </div>
  )
}
