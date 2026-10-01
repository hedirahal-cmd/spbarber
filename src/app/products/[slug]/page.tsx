export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { PRODUCTS } from '@/lib/products'
import { ProductDetail } from '@/components/product/ProductDetail'
import { schemaProduct, schemaBreadcrumb, jsonLd } from '@/lib/schema'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { toReviewDisplay, summarizeReviews, type ReviewDisplay } from '@/lib/reviews'
import { getSiteContent, getTrustItems } from '@/lib/site-content'
import { applyOverride } from '@/lib/product-overrides'
import { getProductOverrides } from '@/lib/product-overrides-server'
import type { BeforeAfterImage } from '@/components/product/BeforeAfterSlider'

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

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = PRODUCTS.find((p) => p.slug === slug)
  if (!product) return {}

  // generateMetadata et le composant de page ci-dessous sont deux fonctions
  // distinctes appelees separement par Next.js : cette lecture est necessaire
  // pour que l'image partagee (og:image) reflete une vraie photo uploadee,
  // meme si le reste de la fiche (titre, description) reste sur le catalogue
  // statique -- ce dernier point est un ecart preexistant, hors perimetre ici.
  let images = product.images
  try {
    const { data } = await supabaseAdmin.from('product_overrides').select('images,actif').eq('id', product.id).maybeSingle()
    // L'override l'emporte s'il existe ; sinon le catalogue statique fait foi
    // -- sans ce repli, un produit jamais encore publie (actif:false depuis
    // sa creation, aucune ligne d'override) resterait indexable/partageable
    // (titre, description, og:image) alors que la fiche elle-meme rend 404.
    const actifEffectif = data?.actif ?? product.actif ?? true
    if (!actifEffectif) return {}
    if (Array.isArray(data?.images) && data.images.length > 0) images = data.images
  } catch {}
  const hasRealPhoto = images[0]?.url?.startsWith('http') ?? false

  const title = product.seo_title ?? product.name
  const description = product.seo_description ?? product.description
  const url = `https://spbarber.fr/products/${product.slug}`
  const price = ((product.variants?.[0]?.price ?? product.price) / 100).toFixed(2)

  return {
    title: { absolute: title },
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
          url: hasRealPhoto ? images[0].url : 'https://spbarber.fr/og-default.jpg',
          width: 800,
          height: 800,
          alt: hasRealPhoto && images[0]?.alt ? images[0].alt : `${product.name} — SP Barber`,
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

  const overrides = await getProductOverrides()
  const product = applyOverride(rawProduct, overrides)
  const productOverride = overrides[rawProduct.id] ?? null

  if (product.actif === false) notFound()

  if (product.is_dropshipping && product.dsers_url && !product.skip_dsers_redirect) {
    redirect(product.dsers_url)
  }

  // Memes prix/statut que partout ailleurs sur le site (fiche, panier) : sans
  // cette fusion, le bloc "Completez votre routine" affichait le prix brut du
  // catalogue statique et pouvait proposer un produit desactive.
  //
  // genericRecommendations (2026-10-01, decision Hedi) : plus de paire fixe
  // pour certains produits -- on pioche plutot parmi les autres produits
  // actifs du catalogue (hors tondeuses, qui attendent un chantier separe
  // avant d'apparaitre en recommandation ailleurs sur le site).
  const relatedProducts = rawProduct.genericRecommendations
    ? PRODUCTS
        .filter((p) => p.id !== rawProduct.id && p.category !== 'tondeuse')
        .map((p) => applyOverride(p, overrides))
        .filter((p) => p.actif !== false)
        .slice(0, 3)
    : (rawProduct.related ?? [])
        .map((id) => PRODUCTS.find((p) => p.id === id))
        .filter((p): p is (typeof PRODUCTS)[number] => !!p)
        .map((p) => applyOverride(p, overrides))
        .filter((p) => p.actif !== false)

  const productReviews  = await getProductReviews(product.id)
  const siteContent     = await getSiteContent()
  const trustItems      = getTrustItems(siteContent)
  // Blocs texte specifiques aux tondeuses (editables depuis l'onglet Contenu,
  // memes cles pour tous les produits de cette categorie -- pas par produit).
  const tondeuseContent = product.category === 'tondeuse' ? {
    pourquoiMarque: siteContent.tondeuse_pourquoi_marque,
    delaiLivraison: siteContent.tondeuse_delai_livraison,
    livraisonSeparee: siteContent.tondeuse_livraison_separee,
  } : null
  let beforeImage: BeforeAfterImage | null = null
  let afterImage: BeforeAfterImage | null = null
  if (typeof productOverride?.before_image_url === 'string' && productOverride.before_image_url) {
    beforeImage = { url: productOverride.before_image_url, alt: `${product.name} — avant` }
  }
  if (typeof productOverride?.after_image_url === 'string' && productOverride.after_image_url) {
    afterImage = { url: productOverride.after_image_url, alt: `${product.name} — après` }
  }
  const productSchema   = schemaProduct(product, summarizeReviews(productReviews))
  const breadcrumbSchema = schemaBreadcrumb([
    { name: 'Accueil', url: 'https://spbarber.fr' },
    { name: 'Boutique', url: 'https://spbarber.fr/products' },
    { name: product.name, url: `https://spbarber.fr/products/${product.slug}` },
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
      <ProductDetail product={product} relatedProducts={relatedProducts} reviews={productReviews} trustItems={trustItems} tondeuseContent={tondeuseContent} beforeImage={beforeImage} afterImage={afterImage} />
    </>
  )
}
