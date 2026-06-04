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
  return {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.description,
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
