import type { Metadata } from 'next'
import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import { formatPrice } from '@/lib/utils'
import { AddToCartButton } from '@/components/AddToCartButton'

export const metadata: Metadata = {
  title: 'Boutique — Produits Capillaires Premium',
  description: 'Découvrez toute la gamme SP Barber : cire, shampooing, crème, accessoires et tondeuse professionnelle.',
}

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

export default function ProductsPage() {
  return (
    <>
      <section id="produits">
        <div className="sec-head">
          <div>
            <div className="sec-ey">— Toute la gamme —</div>
            <h1 className="sec-title">LA BOUTIQUE</h1>
          </div>
        </div>
        <div className="prod-grid">
          {PRODUCTS.map((product) => (
            <div key={product.id} className="prod-card">
              <Link href={`/products/${product.slug}`}>
                <div className="pc-img">
                  <div className="pc-ph">
                    <span className="pc-icon">{CATEGORY_ICONS[product.category] ?? '✨'}</span>
                  </div>
                  {product.id === '1' && <span className="pc-tagg">Bestseller</span>}
                  {product.stock <= 10 && product.stock > 0 && (
                    <span className="pc-tag">Dernières unités</span>
                  )}
                  <div className="pc-overlay">Voir le produit</div>
                </div>
              </Link>
              <div className="pc-info">
                <div className="pc-cat">{CATEGORY_LABELS[product.category] ?? product.category}</div>
                <Link href={`/products/${product.slug}`}>
                  <div className="pc-name">{product.name}</div>
                </Link>
                <div className="pc-bottom">
                  <div className="pc-price">
                    {product.variants
                      ? `À partir de ${formatPrice(Math.min(...product.variants.map((v) => v.price)))}`
                      : formatPrice(product.price)}
                  </div>
                  {!product.is_dropshipping && (
                    <AddToCartButton product={product} className="pc-atc" label="Ajouter" />
                  )}
                  {product.is_dropshipping && (
                    <Link href={`/products/${product.slug}`} className="pc-atc" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                      Voir les options →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
