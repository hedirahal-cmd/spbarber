'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Product, ProductVariant } from '@/types'
import { PaymentLogos } from '@/components/PaymentLogos'

const CATEGORY_ICONS: Record<string, string> = {
  coiffant: '🪮',
  soin: '🧴',
  barbe: '🧔',
  accessoire: '⚡',
}

const CATEGORY_LABELS: Record<string, string> = {
  coiffant: 'Coiffant',
  soin: 'Soin',
  barbe: 'Barbe',
  accessoire: 'Accessoire',
}

const FREE_SHIP = 5000

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
              <span>{CATEGORY_ICONS[product.category] ?? '✨'}</span>
              <small>Photo produit</small>
            </div>
            {product.id === '1' && <span className="fi-tagg">Bestseller</span>}
            {product.stock <= 10 && product.stock > 0 && <span className="fi-tag">Dernières unités</span>}
          </div>
          <div className="trust-row">
            <div className="trust-i">🔒 Sécurisé</div>
            <div className="trust-i">🚚 48h</div>
            <div className="trust-i">↩️ 30 jours</div>
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
          <p className="fi-hook">{product.description}</p>

          <div className="fi-stars-row">
            <span className="fi-stars">★★★★★</span>
            <span className="fi-stars-lbl">4,9/5 · 3 avis vérifiés</span>
            <a href="#avis" className="fi-stars-link">Voir les avis →</a>
          </div>

          <div className="fi-price-block">
            <div className="fi-price">{formatPrice(price)}</div>
            <div className="fi-price-note">Prix TTC · Livraison offerte dès 50€</div>
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

          {product.stock > 0 ? (
            <div className="stock-ok">✅ En stock — expédié sous 48h</div>
          ) : (
            <div className="stock-warn">⚠️ Stock limité</div>
          )}

          <button
            className="fi-atc-btn"
            onClick={handleAddToCart}
            style={added ? { background: 'var(--green)' } : undefined}
          >
            {added ? '✓ Ajouté au panier !' : '🛒 Ajouter au panier'}
          </button>

          {/* Mini progress */}
          <div className="mini-prog">
            <div className="mini-prog-msg">
              {remaining > 0
                ? <>Plus que <strong>{(remaining / 100).toFixed(2).replace('.', ',')} €</strong> pour la livraison offerte 🚚</>
                : <><strong>Livraison offerte !</strong> 🎉</>
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
              <span>💪</span>
              <div><b>Qualité professionnelle</b><p>Les mêmes produits qu&apos;en salon.</p></div>
            </div>
            <div className="fi-ben">
              <span>✨</span>
              <div><b>Résultats visibles</b><p>Efficacité prouvée dès la première utilisation.</p></div>
            </div>
            <div className="fi-ben">
              <span>🌿</span>
              <div><b>Formule soignée</b><p>Ingrédients sélectionnés, sans compromis.</p></div>
            </div>
            <div className="fi-ben">
              <span>👨‍🔬</span>
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
    </div>
  )
}
