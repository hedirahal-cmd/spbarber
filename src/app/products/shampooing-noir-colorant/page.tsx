export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { PRODUCTS } from '@/lib/products'
import { ShampooingNoirPage } from '@/components/product/ShampooingNoirPage'
import { schemaProduct, schemaBreadcrumb } from '@/lib/schema'
import { supabaseAdmin } from '@/lib/supabase'

const BASE_PRODUCT = PRODUCTS.find((p) => p.id === '2')!

export const metadata: Metadata = {
  title: BASE_PRODUCT.seo_title ?? BASE_PRODUCT.name,
  description: BASE_PRODUCT.seo_description ?? BASE_PRODUCT.description,
  alternates: { canonical: 'https://spbarber.fr/products/shampooing-noir-colorant' },
  openGraph: {
    title: BASE_PRODUCT.seo_title ?? BASE_PRODUCT.name,
    description: BASE_PRODUCT.seo_description ?? BASE_PRODUCT.description,
    url: 'https://spbarber.fr/products/shampooing-noir-colorant',
    type: 'website',
    siteName: 'SP Barber',
    images: [
      {
        url: BASE_PRODUCT.images[0]?.startsWith('http')
          ? BASE_PRODUCT.images[0]
          : `https://spbarber.fr${BASE_PRODUCT.images[0] ?? '/og-default.jpg'}`,
        width: 800,
        height: 800,
        alt: `${BASE_PRODUCT.name} — SP Barber`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: BASE_PRODUCT.seo_title ?? BASE_PRODUCT.name,
    description: BASE_PRODUCT.seo_description ?? BASE_PRODUCT.description,
  },
  other: {
    'product:price:amount': (BASE_PRODUCT.price / 100).toFixed(2),
    'product:price:currency': 'EUR',
  },
}

export default async function ShampooingNoirRoute() {
  let product = BASE_PRODUCT

  try {
    const { data, error } = await supabaseAdmin
      .from('product_overrides')
      .select('name,price,description,stock,benefit')
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ShampooingNoirPage product={product} />
    </>
  )
}
