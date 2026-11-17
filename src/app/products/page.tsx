export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { PRODUCTS } from '@/lib/products'
import { ProductsGrid } from '@/components/product/ProductsGrid'
import { getProductOverrides } from '@/lib/product-overrides-server'
import { applyOverride } from '@/lib/product-overrides'

export const metadata: Metadata = {
  title: 'Boutique Produits Capillaires Homme — Shampooing, Soins & Tondeuses',
  description:
    'Découvrez la gamme complète SP Barber : shampooing colorant noir, crème curl, poudre texturante, kit barbe complet et tondeuses professionnelles. Livraison offerte dès 59€.',
  alternates: { canonical: 'https://spbarber.fr/products' },
  openGraph: {
    title: 'Boutique SP Barber — Produits Capillaires Homme Premium',
    description: 'Shampooing colorant, crème curl, kit barbe complet, tondeuses pro. Formules pro expédiées sous 48h.',
    url: 'https://spbarber.fr/products',
    type: 'website',
  },
}

export default async function ProductsPage() {
  const overrides = await getProductOverrides()

  const sorted = [
    ...PRODUCTS.filter((p) => p.id === '5'),
    ...PRODUCTS.filter((p) => p.id === '2'),
    ...PRODUCTS.filter((p) => p.id !== '5' && p.id !== '2'),
  ].map((p) => applyOverride(p, overrides)).filter((p) => p.actif !== false)

  return (
    <>
      <section id="produits">
        <div className="sec-head">
          <div>
            <div className="sec-ey">— Toute la gamme —</div>
            <h1 className="sec-title">LA BOUTIQUE</h1>
          </div>
        </div>
        <ProductsGrid products={sorted} />
      </section>
    </>
  )
}
