export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { PRODUCTS } from '@/lib/products'
import { ShampooingNoirPage } from '@/components/product/ShampooingNoirPage'
import { schemaProduct, schemaBreadcrumb, jsonLd } from '@/lib/schema'
import { supabaseAdmin } from '@/lib/supabase'

const BASE_PRODUCT = PRODUCTS.find((p) => p.id === '2')!

// Etait un objet statique `export const metadata` -- ne pouvait donc pas lire
// Supabase. Converti en generateMetadata() pour que og:image/alt refletent une
// vraie photo uploadee, au meme titre que products/[slug]/page.tsx.
export async function generateMetadata(): Promise<Metadata> {
  let images = BASE_PRODUCT.images
  try {
    const { data } = await supabaseAdmin.from('product_overrides').select('images').eq('id', '2').maybeSingle()
    if (Array.isArray(data?.images) && data.images.length > 0) images = data.images
  } catch {}
  const hasRealPhoto = images[0]?.url?.startsWith('http') ?? false

  const title = BASE_PRODUCT.seo_title ?? BASE_PRODUCT.name
  const description = BASE_PRODUCT.seo_description ?? BASE_PRODUCT.description

  return {
    title,
    description,
    alternates: { canonical: 'https://spbarber.fr/products/shampooing-noir-colorant' },
    openGraph: {
      title,
      description,
      url: 'https://spbarber.fr/products/shampooing-noir-colorant',
      type: 'website',
      siteName: 'SP Barber',
      images: [
        {
          url: hasRealPhoto ? images[0].url : 'https://spbarber.fr/og-default.jpg',
          width: 800,
          height: 800,
          alt: hasRealPhoto && images[0]?.alt ? images[0].alt : `${BASE_PRODUCT.name} — SP Barber`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    other: {
      'product:price:amount': (BASE_PRODUCT.price / 100).toFixed(2),
      'product:price:currency': 'EUR',
    },
  }
}

export default async function ShampooingNoirRoute() {
  let product = BASE_PRODUCT

  try {
    const { data, error } = await supabaseAdmin
      .from('product_overrides')
      .select('name,price,description,stock,benefit,images')
      .eq('id', '2')
      .maybeSingle()
    console.log('[shampooing-page] override:', JSON.stringify(data), '| error:', error?.message ?? null)
    if (data) product = {
      ...product,
      ...(data.name != null ? { name: String(data.name) } : {}),
      ...(data.price != null ? { price: Number(data.price) } : {}),
      ...(data.description != null ? { description: String(data.description) } : {}),
      ...(data.stock != null ? { stock: Number(data.stock) } : {}),
      ...(data.benefit != null ? { benefit: String(data.benefit) } : {}),
      ...(Array.isArray(data.images) && data.images.length > 0 ? { images: data.images } : {}),
    }
  } catch (e) {
    console.error('[shampooing-page] catch:', e instanceof Error ? e.message : String(e))
  }

  const productSchema = schemaProduct(product)
  const breadcrumbSchema = schemaBreadcrumb([
    { name: 'Accueil', url: 'https://spbarber.fr' },
    { name: 'Boutique', url: 'https://spbarber.fr/products' },
    { name: product.name, url: 'https://spbarber.fr/products/shampooing-noir-colorant' },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      <ShampooingNoirPage product={product} />
    </>
  )
}
