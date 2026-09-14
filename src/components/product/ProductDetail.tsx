'use client'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Product, ProductVariant } from '@/types'
import { PaymentLogos } from '@/components/PaymentLogos'
import { AddToCartButton } from '@/components/AddToCartButton'
import { PRODUCTS } from '@/lib/products'
import { Lock, Truck, RotateCcw, CheckCircle2, AlertTriangle, ShoppingCart, Dumbbell, Sparkles, Leaf, FlaskConical, Scissors, Droplets, User, Zap, Clock, Waves, AlignJustify, Package, Wind } from 'lucide-react'
import { BeforeAfterSlider } from './BeforeAfterSlider'
import type { ReviewDisplay } from '@/lib/reviews'
import { ReviewsList } from '@/components/ReviewsList'
import { ReviewForm } from '@/components/ReviewForm'
import type { TrustItem } from '@/lib/site-content'

const TRUST_ICONS: Record<string, ReactNode> = {
  trust_securise: <Lock size={20} strokeWidth={1.5} />,
  trust_livraison: <Truck size={20} strokeWidth={1.5} />,
  trust_retour: <RotateCcw size={20} strokeWidth={1.5} />,
  trust_france: <span style={{ fontSize: 20, lineHeight: 1 }}>🇫🇷</span>,
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

export function ProductDetail({ product, reviews: productReviews, trustItems, socialProof }: { product: Product; reviews: ReviewDisplay[]; trustItems: TrustItem[]; socialProof: string | null }) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  )
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [added, setAdded] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const atcRef = useRef<HTMLButtonElement>(null)
  const addItem = useCart((s) => s.addItem)
  const openCart = useCart((s) => s.openCart)
  const cartTotal = useCart((s) => s.total())
  const cartItems = useCart((s) => s.items)

  const price = selectedVariant?.price ?? product.price
  const remaining = Math.max(0, FREE_SHIP - cartTotal)

  // Confort d'affichage, pas la garantie : la vraie limite est revalidee cote
  // serveur au checkout (pricing.ts). Dropshipping (la Tondeuse) est hors de
  // ce systeme -- le fournisseur gere son propre stock.
  const dejaAuPanier = cartItems.find(
    (i) => i.product.id === product.id && i.variant?.id === selectedVariant?.id,
  )?.quantity ?? 0
  const stockEpuise = !product.is_dropshipping && dejaAuPanier >= product.stock
  const pct = Math.min(100, (cartTotal / FREE_SHIP) * 100)
  const tomorrow = getTomorrowLabel()

  // Calcule depuis les vrais avis recus en prop -- plus de chiffre code en dur.
  // Sans avis, la ligne de resume disparait plutot que d'afficher une valeur
  // inventee ; avec des avis, le libelle ne dit plus "verifies" au global
  // puisque tous ne le sont pas forcement (le badge par avis, lui, l'est).
  const hasReviews = productReviews.length > 0
  const avgRating = hasReviews ? productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length : 0
  const avgRatingLabel = avgRating.toFixed(1).replace('.', ',')

  const relatedProducts = product.related
    ? PRODUCTS.filter((p) => product.related!.includes(p.id))
    : []

  // Le catalogue statique pointe toujours vers un chemin local qui n'existe pas
  // encore sur disque (aucune photo n'a ete deployee en dur) -- le meme test
  // que Stripe/JSON-LD distingue donc ici une vraie photo uploadee (URL
  // Supabase Storage, absolue) du placeholder statique.
  const hasGallery = product.images[0]?.url.startsWith('http') ?? false

  useEffect(() => {
    setSelectedPhoto(0)
  }, [product.id])

  useEffect(() => {
    const el = atcRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function handleAddToCart() {
    if (stockEpuise) return
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
            {hasGallery ? (
              <img
                src={product.images[selectedPhoto]?.url ?? product.images[0].url}
                alt={product.images[selectedPhoto]?.alt || product.name}
              />
            ) : (
              <div className="fi-img-ph">
                <span><CategoryIcon category={product.category} size={64} /></span>
                <small>Photo produit</small>
              </div>
            )}
            {product.id === '1' && <span className="fi-tagg">Bestseller</span>}
            {product.stock <= 10 && product.stock > 0 && <span className="fi-tag">Dernières unités</span>}
          </div>
          {hasGallery && product.images.length > 1 && (
            <div className="fi-thumbs">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={idx === selectedPhoto ? 'fi-thumb fi-thumb-active' : 'fi-thumb'}
                  onClick={() => setSelectedPhoto(idx)}
                  aria-label={`Voir la photo ${idx + 1}`}
                >
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}
          {trustItems.length > 0 && (
            <div className="trust-row">
              {trustItems.map((item) => (
                <div className="trust-i" key={item.key}>
                  {TRUST_ICONS[item.key]}
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          )}
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
            {hasReviews ? (
              <>
                <span className="fi-stars">{'★'.repeat(Math.round(avgRating))}</span>
                <span className="fi-stars-lbl">{avgRatingLabel}/5 · {productReviews.length} avis</span>
                <a href="#avis" className="fi-stars-link">Voir les avis →</a>
              </>
            ) : (
              <a href="#avis" className="fi-stars-link">Soyez le premier à donner votre avis →</a>
            )}
          </div>
          {socialProof && (
            <div className="fi-social">🔥 {socialProof}</div>
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
            disabled={stockEpuise}
            style={added ? { background: 'var(--green)' } : stockEpuise ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {added
              ? '✓ Ajouté au panier !'
              : stockEpuise
                ? 'Rupture de stock'
                : <><ShoppingCart size={15} strokeWidth={2} style={{ marginRight: 6, verticalAlign: 'middle' }} />Ajouter au panier</>}
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

      {/* Avis clients — filtres a ce produit */}
      <div id="avis" className="fi-revs-sec">
        {hasReviews && (
          <div className="fi-revs-head">
            <div>
              <div className="fi-score-n">{avgRatingLabel}</div>
              <div className="fi-score-s">{'★'.repeat(Math.round(avgRating))}</div>
              <div className="fi-score-c">{productReviews.length} avis</div>
            </div>
          </div>
        )}
        <ReviewsList reviews={productReviews} variant="product" emptyMessage="Aucun avis pour le moment sur ce produit — soyez le premier à en laisser un." />
        <ReviewForm productId={product.id} />
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
          <button
            className="fi-sticky-btn"
            onClick={handleAddToCart}
            disabled={stockEpuise}
            style={stockEpuise ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <ShoppingCart size={14} strokeWidth={2} />
            {added ? 'Ajouté !' : stockEpuise ? 'Rupture de stock' : 'Ajouter au panier'}
          </button>
        </div>
      )}
    </div>
  )
}
