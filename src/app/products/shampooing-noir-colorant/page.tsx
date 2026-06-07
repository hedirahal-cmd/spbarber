import type { Metadata } from 'next'
import { PRODUCTS } from '@/lib/products'
import { ShampooingNoirPage } from '@/components/product/ShampooingNoirPage'
import { schemaProduct, schemaBreadcrumb } from '@/lib/schema'

const product = PRODUCTS.find((p) => p.id === '2')!

export const metadata: Metadata = {
  title: product.seo_title ?? product.name,
  description: product.seo_description ?? product.description,
  alternates: { canonical: 'https://spbarber.fr/products/shampooing-noir-colorant' },
  openGraph: {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.description,
    url: 'https://spbarber.fr/products/shampooing-noir-colorant',
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
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.description,
  },
  other: {
    'product:price:amount': ((product.price) / 100).toFixed(2),
    'product:price:currency': 'EUR',
  },
}

export default function ShampooingNoirRoute() {
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
      <ShampooingNoirPage />
    </>
  )
}
