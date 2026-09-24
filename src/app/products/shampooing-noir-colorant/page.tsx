export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PRODUCTS } from '@/lib/products'
import { ShampooingNoirPage } from '@/components/product/ShampooingNoirPage'
import { schemaProduct, schemaBreadcrumb, jsonLd } from '@/lib/schema'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { toReviewDisplay, type ReviewDisplay } from '@/lib/reviews'
import { resolveSocialProof } from '@/lib/social-proof'
import type { BeforeAfterImage } from '@/components/product/BeforeAfterSlider'

const BASE_PRODUCT = PRODUCTS.find((p) => p.id === '2')!

async function getProductReviews(productId: string): Promise<ReviewDisplay[]> {
  try {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('visible', true)
      .contains('product_ids', [productId])
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) return data.map(toReviewDisplay)
  } catch {}
  return []
}

// Etait un objet statique `export const metadata` -- ne pouvait donc pas lire
// Supabase. Converti en generateMetadata() pour que og:image/alt refletent une
// vraie photo uploadee, au meme titre que products/[slug]/page.tsx.
export async function generateMetadata(): Promise<Metadata> {
  let images = BASE_PRODUCT.images
  try {
    const { data } = await supabaseAdmin.from('product_overrides').select('images,actif').eq('id', '2').maybeSingle()
    if (data?.actif === false) return {}
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
  let socialProofOverride: { social_proof_text?: string | null; social_proof_visible?: boolean | null } | null = null
  let beforeImage: BeforeAfterImage | null = null
  let afterImage: BeforeAfterImage | null = null

  try {
    const { data, error } = await supabaseAdmin
      .from('product_overrides')
      .select('name,price,description,stock,benefit,images,social_proof_text,social_proof_visible,before_image_url,after_image_url,actif')
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
      actif: data.actif !== false,
    }
    socialProofOverride = data
    if (typeof data?.before_image_url === 'string' && data.before_image_url) {
      beforeImage = { url: data.before_image_url, alt: `${product.name} — avant` }
    }
    if (typeof data?.after_image_url === 'string' && data.after_image_url) {
      afterImage = { url: data.after_image_url, alt: `${product.name} — après` }
    }
  } catch (e) {
    console.error('[shampooing-page] catch:', e instanceof Error ? e.message : String(e))
  }

  if (product.actif === false) notFound()

  const socialProof = resolveSocialProof('2', socialProofOverride)
  const productReviews = await getProductReviews('2')
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
      <ShampooingNoirPage product={product} reviews={productReviews} socialProof={socialProof} beforeImage={beforeImage} afterImage={afterImage} />
    </>
  )
}
