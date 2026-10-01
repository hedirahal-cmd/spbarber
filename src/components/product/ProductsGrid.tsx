'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { AddToCartButton } from '@/components/AddToCartButton'
import { Scissors, Droplets, User, Zap, Sparkles, Cog } from 'lucide-react'
import type { Product } from '@/types'

function CategoryIcon({ category, size = 50 }: { category: string; size?: number }) {
  if (category === 'coiffant') return <Scissors size={size} strokeWidth={1.2} />
  if (category === 'soin') return <Droplets size={size} strokeWidth={1.2} />
  if (category === 'barbe') return <User size={size} strokeWidth={1.2} />
  if (category === 'accessoire') return <Zap size={size} strokeWidth={1.2} />
  if (category === 'tondeuse') return <Cog size={size} strokeWidth={1.2} />
  return <Sparkles size={size} strokeWidth={1.2} />
}

const CATEGORY_LABELS: Record<string, string> = {
  coiffant: 'Coiffant',
  soin: 'Soin',
  barbe: 'Barbe',
  accessoire: 'Accessoire',
  tondeuse: 'Tondeuse',
}

function getBadge(id: string) {
  if (id === '5') return <span className="pc-tagg">Meilleure vente</span>
  return null
}

// Regroupement en 3 familles simples pour les raccourcis -- "Cheveux" inclut
// l'accessoire (peigne), qui est un outil de coiffage capillaire comme les
// autres categories de ce groupe.
type Famille = 'tous' | 'cheveux' | 'barbe' | 'tondeuses'
const FAMILLES: { id: Famille; label: string; categories: string[] | null }[] = [
  { id: 'tous', label: 'Tout', categories: null },
  { id: 'cheveux', label: 'Cheveux', categories: ['coiffant', 'soin', 'accessoire'] },
  { id: 'barbe', label: 'Barbe', categories: ['barbe'] },
  { id: 'tondeuses', label: 'Tondeuses', categories: ['tondeuse'] },
]

export function ProductsGrid({ products }: { products: Product[] }) {
  const [filtre, setFiltre] = useState<Famille>('tous')
  const famille = FAMILLES.find((f) => f.id === filtre)!
  const visibles = famille.categories ? products.filter((p) => famille.categories!.includes(p.category)) : products

  return (
    <>
      <div className="pc-filters" role="tablist" aria-label="Filtrer par catégorie">
        {FAMILLES.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filtre === f.id}
            className={filtre === f.id ? 'pc-filter pc-filter-active' : 'pc-filter'}
            onClick={() => setFiltre(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="prod-grid">
        {visibles.map((product) => (
          <div key={product.id} className="prod-card">
            <Link href={`/products/${product.slug}`}>
              <div className="pc-img">
                {product.images[0]?.url.startsWith('http') ? (
                  <img src={product.images[0].url} alt={product.images[0].alt || product.name} />
                ) : (
                  <div className="pc-ph">
                    <span className="pc-icon"><CategoryIcon category={product.category} size={50} /></span>
                  </div>
                )}
                {getBadge(product.id)}
                {product.stock <= 10 && product.stock > 0 && (
                  <span className="pc-tag">Dernières unités</span>
                )}
                <div className="pc-overlay">Voir le produit</div>
              </div>
            </Link>
            <div className="pc-info">
              <div className="pc-cat">{CATEGORY_LABELS[product.category] ?? product.category}</div>
              {product.benefit && <div className="pc-benefit">{product.benefit}</div>}
              <Link href={`/products/${product.slug}`}>
                <div className="pc-name">{product.name}</div>
              </Link>
              {product.usageTag && <div className="pc-usage">{product.usageTag}</div>}
              <div className="pc-bottom">
                <div className="pc-price">
                  {/* variantKind 'color' = meme prix pour tous les choix, "a partir
                      de" n'aurait pas de sens ; seuls de vrais modeles a prix
                      differents affichent une fourchette. */}
                  {product.variants && product.variantKind !== 'color'
                    ? `À partir de ${formatPrice(Math.min(...product.variants.map((v) => v.price ?? product.price)))}`
                    : formatPrice(product.price)}
                </div>
                {!product.is_dropshipping && (
                  <AddToCartButton product={product} className="pc-atc" label="Ajouter" />
                )}
                {product.is_dropshipping && (
                  <Link href={`/products/${product.slug}`} className="pc-atc" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                    {product.variants && product.variants.length > 0 ? 'Voir les options →' : 'Voir le produit →'}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtre === 'tondeuses' && <ComparatifTondeuses />}
    </>
  )
}

// Specs reelles tirees des fiches/visuels produit (description, photos
// fournisseur) -- rien d'invente, cf. diff pour le detail de chaque ligne.
function ComparatifTondeuses() {
  return (
    <div className="pc-compare">
      <div className="pc-compare-ttl">Laquelle choisir ?</div>
      <div className="pc-compare-scroll">
        <table className="pc-compare-table">
          <thead>
            <tr>
              <th></th>
              <th>BRDCLIP FA1T</th>
              <th>Kemei KM-999</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Usage principal</td><td>Finitions précises et dégradés</td><td>Coupe complète à la maison</td></tr>
            <tr><td>Longueurs de coupe</td><td>Embouts 0,5 à 5 mm</td><td>7 sabots fournis</td></tr>
            <tr><td>Accessoires inclus</td><td>4 sabots, tête de lame de rechange, câble USB, brosse</td><td>7 sabots, câble USB, brosse, écran LED de charge</td></tr>
            <tr><td>Autonomie</td><td>~90 min</td><td>~3h d&apos;utilisation continue</td></tr>
            <tr><td>Recharge</td><td>~2h (USB)</td><td>~3h (USB)</td></tr>
            <tr><td>Entretien</td><td>Lames amovibles, rinçables à l&apos;eau (usage à sec)</td><td>Lame DLC, nettoyage à la brosse fournie</td></tr>
            <tr><td>Prix</td><td>69,90 €</td><td>89,90 €</td></tr>
          </tbody>
        </table>
      </div>
      <div className="pc-compare-reco">
        <div><strong>Pour des finitions et dégradés ponctuels</strong> → BRDCLIP FA1T</div>
        <div><strong>Pour une coupe complète, avec plus d&apos;autonomie et de sabots</strong> → Kemei KM-999</div>
      </div>
    </div>
  )
}
