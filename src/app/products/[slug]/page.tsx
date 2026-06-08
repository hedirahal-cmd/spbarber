import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { PRODUCTS } from '@/lib/products'
import { ProductDetail } from '@/components/product/ProductDetail'
import { schemaProduct, schemaBreadcrumb } from '@/lib/schema'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = PRODUCTS.find((p) => p.slug === slug)
  if (!product) return {}

  const title = product.seo_title ?? product.name
  const description = product.seo_description ?? product.description
  const url = `https://spbarber.fr/products/${product.slug}`
  const price = ((product.variants?.[0]?.price ?? product.price) / 100).toFixed(2)

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'SP Barber',
      images: [
        {
          url: product.images[0]?.startsWith('http')
            ? product.images[0]
            : `https://spbarber.fr${product.images[0] ?? '/og-default.jpg'}`,
          width: 800,
          height: 800,
          alt: `${product.name} — SP Barber`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    other: {
      'product:price:amount': price,
      'product:price:currency': 'EUR',
    },
  }
}

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }))
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const rawProduct = PRODUCTS.find((p) => p.slug === slug)
  if (!rawProduct) notFound()
  let product = rawProduct!

  try {
    const { data, error } = await supabaseAdmin.from('product_overrides').select('name,price,description,stock,benefit').eq('id', product.id).maybeSingle()
    console.log('[product-page] id:', product.id, 'slug:', slug, '| override:', JSON.stringify(data), '| error:', error?.message ?? null)
    if (data) product = {
      ...product,
      ...(data.name != null ? { name: String(data.name) } : {}),
      ...(data.price != null ? { price: Number(data.price) } : {}),
      ...(data.description != null ? { description: String(data.description) } : {}),
      ...(data.stock != null ? { stock: Number(data.stock) } : {}),
      ...(data.benefit != null ? { benefit: String(data.benefit) } : {}),
    }
  } catch (e) {
    console.error('[product-page] catch:', e instanceof Error ? e.message : String(e))
  }

  if (product.is_dropshipping && product.dsers_url) {
    redirect(product.dsers_url)
  }

  const productSchema   = schemaProduct(product)
  const breadcrumbSchema = schemaBreadcrumb([
    { name: 'Accueil', url: 'https://spbarber.fr' },
    { name: 'Boutique', url: 'https://spbarber.fr/products' },
    { name: product.name, url: `https://spbarber.fr/products/${product.slug}` },
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
      <ProductDetail product={product} />
    </>
  )
}
