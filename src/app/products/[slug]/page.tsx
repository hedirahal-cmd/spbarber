import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { PRODUCTS } from '@/lib/products'
import { ProductDetail } from '@/components/product/ProductDetail'

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
  const product = PRODUCTS.find((p) => p.slug === slug)
  if (!product) notFound()

  if (product.is_dropshipping && product.dsers_url) {
    redirect(product.dsers_url)
  }

  return <ProductDetail product={product} />
}
