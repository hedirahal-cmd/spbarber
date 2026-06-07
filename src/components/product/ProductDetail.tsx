'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Product, ProductVariant } from '@/types'
import { PaymentLogos } from '@/components/PaymentLogos'
import { AddToCartButton } from '@/components/AddToCartButton'
import { PRODUCTS } from '@/lib/products'
import { Lock, Truck, RotateCcw, CheckCircle2, AlertTriangle, ShoppingCart, Dumbbell, Sparkles, Leaf, FlaskConical, Scissors, Droplets, User, Zap, Clock, Waves, AlignJustify, Package, Wind } from 'lucide-react'
import { BeforeAfterSlider } from './BeforeAfterSlider'

const SOCIAL_PROOF: Record<string, number> = {
  '1': 34, '2': 51, '3': 12, '4': 18, '5': 89, '6': 7,
}

const PRODUCT_REVIEWS: Record<string, { count: number; rating: string }> = {
  '1': { count: 214, rating: '4,9' },
  '2': { count: 87,  rating: '4,8' },
  '3': { count: 53,  rating: '4,7' },
  '4': { count: 31,  rating: '4,9' },
  '5': { count: 312, rating: '5,0' },
  '6': { count: 18,  rating: '4,6' },
}

function getTomorrowLabel() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function CategoryIcon({ category, size = 64 }: { category: string; size?: number }) {
  if (category === 'coiffant') return <Scissors size={size} strokeWidth={1.2} />
  if (category === 'soin') return <Droplets size={size} strokeWidth={1.2} />
  if (category === 'barbe') return <User size={size} strokeWidth={1.2} />
  if (category === 'accessoire') return <Zap size={size} strokeWidth={1.2} />
  return <Sparkles size={size} strokeWidth={1.2} />
}

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

const FREE_SHIP = 4900

export function ProductDetail({ product }: { product: Product }) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  )
  const [added, setAdded] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const atcRef = useRef<HTMLButtonElement>(null)
  const addItem = useCart((s) => s.addItem)
  const openCart = useCart((s) => s.openCart)
  const cartTotal = useCart((s) => s.total())

  const price = selectedVariant?.price ?? product.price
  const remaining = Math.max(0, FREE_SHIP - cartTotal)
  const pct = Math.min(100, (cartTotal / FREE_SHIP) * 100)
  const reviews = PRODUCT_REVIEWS[product.id] ?? { count: 12, rating: '4,8' }
  const tomorrow = getTomorrowLabel()

  const relatedProducts = product.related
    ? PRODUCTS.filter((p) => product.related!.includes(p.id))
    : []

  useEffect(() => {
    const el = atcRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function handleAddToCart() {
    addItem(product, selectedVariant)
    openCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div className="fiche-page">
      <div className="fi-inner">
        {/* Galerie */}
        <div className="fi-gallery">
          <div className="fi-img-main">
            <div className="fi-img-ph">
              <span><CategoryIcon category={product.category} size={64} /></span>
              <small>Photo produit</small>
            </div>
            {product.id === '1' && <span className="fi-tagg">Bestseller</span>}
            {product.stock <= 10 && product.stock > 0 && <span className="fi-tag">Dernières unités</span>}
          </div>
          <div className="trust-row">
            <div className="trust-i">
              <Lock size={20} strokeWidth={1.5} />
              <span>Sécurisé</span>
            </div>
            <div className="trust-i">
              <Truck size={20} strokeWidth={1.5} />
              <span>Livraison 48h</span>
            </div>
            <div className="trust-i">
              <RotateCcw size={20} strokeWidth={1.5} />
              <span>Retour 30j</span>
            </div>
            <div className="trust-i">
              <span style={{ fontSize: 20, lineHeight: 1 }}>🇫🇷</span>
              <span>France</span>
            </div>
          </div>
        </div>

        {/* Détails */}
        <div className="fi-details">
          <div className="fi-bc">
            <Link href="/" passHref legacyBehavior>
              <span>Accueil</span>
            </Link>
            {' › '}
            <span>{product.name}</span>
          </div>
          <div className="fi-cat">{CATEGORY_LABELS[product.category] ?? product.category}</div>
          {product.benefit && (
            <div className="fi-hook-hero">{product.benefit}</div>
          )}
          <h1 className="fi-title-secondary">{product.name}</h1>

          <div className="fi-stars-row">
            <span className="fi-stars">★★★★★</span>
            <span className="fi-stars-lbl">{reviews.rating}/5 · {reviews.count} avis vérifiés</span>
            <a href="#avis" className="fi-stars-link">Voir les avis →</a>
          </div>
          {SOCIAL_PROOF[product.id] && (
            <div className="fi-social">🔥 {SOCIAL_PROOF[product.id]} personnes ont acheté ce produit cette semaine</div>
          )}

          <div className="fi-price-block">
            <div className="fi-price">{formatPrice(price)}</div>
            <div className="fi-price-note">Prix TTC · Livraison offerte dès 49€</div>
          </div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="fi-vars">
              <div className="fi-var-lbl">Choisir le modèle</div>
              <div className="fi-var-btns">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    className={selectedVariant?.id === v.id ? 'fi-vara' : 'fi-var'}
                    onClick={() => setSelectedVariant(v)}
                  >
                    <span>{v.name}</span>
                    <span>{formatPrice(v.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trust checklist — avant le CTA */}
          {product.trust && product.trust.length > 0 && (
            <div className="fi-trust-list">
              {product.trust.map((item, i) => (
                <div key={i} className="fi-trust-item">
                  <span className="fi-trust-v">✓</span>
                  {item}
                </div>
              ))}
            </div>
          )}

          {product.stock > 0 ? (
            <div className="stock-ok" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={13} strokeWidth={2} />En stock — expédié sous 48h
              {product.stock <= 10 && <span className="stock-urgent">Seulement {product.stock} restants</span>}
            </div>
          ) : (
            <div className="stock-warn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} strokeWidth={2} />Stock limité</div>
          )}

          {/* Urgence livraison */}
          <div className="fi-urgence">
            <Clock size={12} strokeWidth={2} />
            Commandez avant 16h — livraison le <strong>{tomorrow}</strong>
          </div>

          <button
            ref={atcRef}
            className="fi-atc-btn"
            onClick={handleAddToCart}
            style={added ? { background: 'var(--green)' } : undefined}
          >
            {added ? '✓ Ajouté au panier !' : <><ShoppingCart size={15} strokeWidth={2} style={{ marginRight: 6, verticalAlign: 'middle' }} />Ajouter au panier</>}
          </button>

          {/* Mini progress */}
          <div className="mini-prog">
            <div className="mini-prog-msg">
              {remaining > 0
                ? <>Plus que <strong>{(remaining / 100).toFixed(2).replace('.', ',')} €</strong> pour la livraison offerte</>
                : <><strong>Livraison offerte !</strong></>
              }
            </div>
            <div className="mini-prog-track">
              <div className="mini-prog-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Logos paiement */}
          <PaymentLogos />

        </div>
      </div>

      {/* ── AVANT / APRÈS — Shampooing Noir uniquement ── juste après le CTA ── */}
      {product.id === '2' && <BeforeAfterSlider />}

      {/* ── Bénéfices + Description — pour tous les produits, après le slider ── */}
      <div className="fi-post">
        <div className="fi-bens">
          <div className="fi-ben">
            <span><Dumbbell size={18} strokeWidth={1.6} /></span>
            <div><b>Qualité professionnelle</b><p>Les mêmes produits qu&apos;en salon.</p></div>
          </div>
          <div className="fi-ben">
            <span><Sparkles size={18} strokeWidth={1.6} /></span>
            <div><b>Résultats visibles</b><p>Efficacité prouvée dès la première utilisation.</p></div>
          </div>
          <div className="fi-ben">
            <span><Leaf size={18} strokeWidth={1.6} /></span>
            <div><b>Formule soignée</b><p>Ingrédients sélectionnés, sans compromis.</p></div>
          </div>
          <div className="fi-ben">
            <span><FlaskConical size={18} strokeWidth={1.6} /></span>
            <div><b>Testé par des barbiers</b><p>Formulé et validé par des professionnels.</p></div>
          </div>
        </div>
        <div className="fi-desc-block">
          <div className="fi-desc-ttl">Description</div>
          <p>{product.description}</p>
        </div>
      </div>

      {/* Complétez votre routine */}
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

      {/* Sticky ATC mobile — apparaît quand le bouton principal sort du viewport */}
      {stickyVisible && product.stock > 0 && (
        <div className="fi-sticky-atc">
          <div className="fi-sticky-info">
            <span className="fi-sticky-name">{product.name}</span>
            <span className="fi-sticky-price">{formatPrice(price)}</span>
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
