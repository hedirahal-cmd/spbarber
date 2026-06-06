'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Product, ProductVariant } from '@/types'
import { PaymentLogos } from '@/components/PaymentLogos'
import { PRODUCTS } from '@/lib/products'
import { Lock, Truck, RotateCcw, CheckCircle2, AlertTriangle, ShoppingCart, Dumbbell, Sparkles, Leaf, FlaskConical, Scissors, Droplets, User, Zap } from 'lucide-react'

function CategoryIcon({ category, size = 64 }: { category: string; size?: number }) {
  if (category === 'coiffant') return <Scissors size={size} strokeWidth={1.2} />
  if (category === 'soin') return <Droplets size={size} strokeWidth={1.2} />
  if (category === 'barbe') return <User size={size} strokeWidth={1.2} />
  if (category === 'accessoire') return <Zap size={size} strokeWidth={1.2} />
  return <Sparkles size={size} strokeWidth={1.2} />
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
  const addItem = useCart((s) => s.addItem)
  const openCart = useCart((s) => s.openCart)
  const cartTotal = useCart((s) => s.total())

  const price = selectedVariant?.price ?? product.price
  const remaining = Math.max(0, FREE_SHIP - cartTotal)
  const pct = Math.min(100, (cartTotal / FREE_SHIP) * 100)

  const relatedProducts = product.related
    ? PRODUCTS.filter((p) => product.related!.includes(p.id))
    : []

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
            <div className="trust-i"><Lock size={10} strokeWidth={2} style={{ marginRight: 3, verticalAlign: 'middle' }} />Sécurisé</div>
            <div className="trust-i"><Truck size={10} strokeWidth={2} style={{ marginRight: 3, verticalAlign: 'middle' }} />48h</div>
            <div className="trust-i"><RotateCcw size={10} strokeWidth={2} style={{ marginRight: 3, verticalAlign: 'middle' }} />30 jours</div>
            <div className="trust-i">🇫🇷 France</div>
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
          <h1 className="fi-title">{product.name}</h1>
          {product.benefit && (
            <div className="fi-hook">{product.benefit}</div>
          )}

          <div className="fi-stars-row">
            <span className="fi-stars">★★★★★</span>
            <span className="fi-stars-lbl">4,9/5 · 3 avis vérifiés</span>
            <a href="#avis" className="fi-stars-link">Voir les avis →</a>
          </div>

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
            <div className="stock-ok" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={13} strokeWidth={2} />En stock — expédié sous 48h</div>
          ) : (
            <div className="stock-warn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} strokeWidth={2} />Stock limité</div>
          )}

          <button
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

          {/* Bénéfices */}
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

          {/* Description */}
          <div className="fi-desc-block">
            <div className="fi-desc-ttl">Description</div>
            <p>{product.description}</p>
          </div>
        </div>
      </div>

      {/* ── AVANT / APRÈS — Shampooing Noir uniquement ── */}
      {product.id === '2' && (
        <div className="aa-sec">
          <div className="aa-inner">
            <div className="aa-head">
              <div className="aa-eyebrow">Résultat constaté</div>
              <h2 className="aa-title">RÉSULTAT VISIBLE DÈS LE 1<sup>ER</sup> LAVAGE</h2>
              <p className="aa-sub">Sans ammoniaque · Formule douce · Tient jusqu&apos;à 4 semaines</p>
            </div>
            <div className="aa-grid">
              {/* Avant */}
              <div className="aa-card aa-card-before">
                <div className="aa-label">AVANT</div>
                <div className="aa-visual aa-visual-before">
                  <div className="aa-visual-lines">
                    <div className="aa-line aa-line-light" />
                    <div className="aa-line aa-line-light" />
                    <div className="aa-line aa-line-light" />
                    <div className="aa-line aa-line-mixed" />
                    <div className="aa-line aa-line-dark" />
                    <div className="aa-line aa-line-light" />
                    <div className="aa-line aa-line-mixed" />
                  </div>
                </div>
                <div className="aa-desc">
                  <div className="aa-desc-title">Cheveux grisonnants</div>
                  <div className="aa-desc-text">Racines blanches visibles, manque d&apos;uniformité et de profondeur</div>
                </div>
              </div>
              {/* Après */}
              <div className="aa-card aa-card-after">
                <div className="aa-label aa-label-after">APRÈS</div>
                <div className="aa-visual aa-visual-after">
                  <div className="aa-visual-lines">
                    <div className="aa-line aa-line-dark" />
                    <div className="aa-line aa-line-dark" />
                    <div className="aa-line aa-line-dark" />
                    <div className="aa-line aa-line-dark" />
                    <div className="aa-line aa-line-dark" />
                    <div className="aa-line aa-line-dark" />
                    <div className="aa-line aa-line-dark" />
                  </div>
                  <div className="aa-glow" />
                </div>
                <div className="aa-desc">
                  <div className="aa-desc-title">Couleur restaurée</div>
                  <div className="aa-desc-text">Cheveux uniformément assombris, brillants et revitalisés</div>
                </div>
              </div>
            </div>
            <div className="aa-checks">
              <div className="aa-check"><CheckCircle2 size={14} strokeWidth={2} />Colorant naturel à la kératine</div>
              <div className="aa-check"><CheckCircle2 size={14} strokeWidth={2} />Résultat durable 3–4 semaines</div>
              <div className="aa-check"><CheckCircle2 size={14} strokeWidth={2} />Sans ammoniaque ni oxydant</div>
              <div className="aa-check"><CheckCircle2 size={14} strokeWidth={2} />Utilisable seul, sans préparation</div>
            </div>
          </div>
        </div>
      )}

      {/* Souvent achetés ensemble */}
      {relatedProducts.length > 0 && (
        <div className="sac-sec">
          <div className="sac-ttl">Souvent achetés ensemble</div>
          <div className="sac-grid">
            {relatedProducts.map((rp) => (
              <Link key={rp.id} href={`/products/${rp.slug}`} className="sac-card">
                <div className="sac-img">
                  <CategoryIcon category={rp.category} size={32} />
                </div>
                <div className="sac-info">
                  <div className="sac-cat">{CATEGORY_LABELS[rp.category] ?? rp.category}</div>
                  <div className="sac-name">{rp.name}</div>
                  <div className="sac-price">{formatPrice(rp.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
