export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { AddToCartButton } from '@/components/AddToCartButton'
import { Scissors, Droplets, User, Zap, Sparkles } from 'lucide-react'
import { resolveSocialProof } from '@/lib/social-proof'

export const metadata: Metadata = {
  title: 'Boutique Produits Capillaires Homme — Cire, Shampooing, Kit Barbe',
  description:
    'Découvrez la gamme complète SP Barber : cire cheveux fixation forte, shampooing colorant noir, crème curl, kit barbe et tondeuse dégradé. Livraison offerte dès 49€.',
  alternates: { canonical: 'https://spbarber.fr/products' },
  openGraph: {
    title: 'Boutique SP Barber — Produits Capillaires Homme Premium',
    description: 'Cire cheveux, shampooing colorant, kit barbe complet. Formules pro livrées en 48h.',
    url: 'https://spbarber.fr/products',
    type: 'website',
  },
}

function CategoryIcon({ category, size = 50 }: { category: string; size?: number }) {
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

function getBadge(id: string) {
  if (id === '5') return <span className="pc-tagg">Meilleure vente</span>
  if (id === '2') return <span className="pc-tag-fm">Forte marge</span>
  if (id === '1') return <span className="pc-tagg">Bestseller</span>
  return null
}

type ProdOv = { id: string; name?: string | null; price?: number | null; description?: string | null; stock?: number | null; benefit?: string | null; images?: { url: string; alt: string }[] | null; social_proof_text?: string | null; social_proof_visible?: boolean | null; actif?: boolean | null }

export default async function ProductsPage() {
  let overrides: Record<string, ProdOv> = {}
  try {
    const { data, error } = await supabaseAdmin.from('product_overrides').select('id,name,price,description,stock,benefit,images,social_proof_text,social_proof_visible,actif')
    console.log('[products-page] overrides count:', data?.length ?? 0, '| error:', error?.message ?? null)
    if (data) (data as ProdOv[]).forEach(r => { overrides[r.id] = r })
  } catch (e) {
    console.error('[products-page] catch:', e instanceof Error ? e.message : String(e))
  }

  function applyOv(p: (typeof PRODUCTS)[0]) {
    const o = overrides[p.id]
    if (!o) return p
    return {
      ...p,
      name: o.name ?? p.name,
      price: o.price ?? p.price,
      description: o.description ?? p.description,
      stock: o.stock ?? p.stock,
      benefit: o.benefit ?? p.benefit,
      images: (o.images && o.images.length > 0) ? o.images : p.images,
      actif: o.actif !== false,
    }
  }

  const sorted = [
    ...PRODUCTS.filter((p) => p.id === '5'),
    ...PRODUCTS.filter((p) => p.id === '2'),
    ...PRODUCTS.filter((p) => p.id !== '5' && p.id !== '2'),
  ].map(applyOv).filter((p) => p.actif !== false)

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
          {sorted.map((product) => (
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
                {(() => {
                  const socialProof = resolveSocialProof(product.id, overrides[product.id])
                  return socialProof && <div className="pc-social">🔥 {socialProof}</div>
                })()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
