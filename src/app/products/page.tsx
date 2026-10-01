export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { PRODUCTS } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase'
import { ProductsGrid } from '@/components/product/ProductsGrid'

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

type ProdOv = { id: string; name?: string | null; price?: number | null; description?: string | null; stock?: number | null; benefit?: string | null; images?: { url: string; alt: string }[] | null; actif?: boolean | null }

export default async function ProductsPage() {
  let overrides: Record<string, ProdOv> = {}
  try {
    const { data, error } = await supabaseAdmin.from('product_overrides').select('id,name,price,description,stock,benefit,images,actif')
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
        <ProductsGrid products={sorted} />
      </section>
    </>
  )
}
