import { Product } from '@/types'

const BASE = 'https://spbarber.fr'

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${BASE}/#organization`,
  name: 'SP Barber',
  url: BASE,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE}/og-default.jpg`,
  },
  sameAs: [],
}

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${BASE}/#website`,
  url: BASE,
  name: 'SP Barber',
  publisher: { '@id': `${BASE}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/products?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

export function schemaOrganizationLocal() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION,
      WEBSITE,
      {
        '@type': ['LocalBusiness', 'HairSalon'],
        '@id': `${BASE}/#localbusiness`,
        name: 'SP Barber',
        description:
          'Salon de coiffure barbier à Fougères et boutique en ligne de produits capillaires premium pour hommes.',
        url: BASE,
        telephone: '',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '48 Boulevard Jean Jaurès',
          addressLocality: 'Fougères',
          postalCode: '35300',
          addressCountry: 'FR',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 48.3522,
          longitude: -1.2038,
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            opens: '09:00',
            closes: '19:00',
          },
        ],
        priceRange: '€€',
        servesCuisine: undefined,
        hasMap: 'https://maps.google.com/?q=48+Boulevard+Jean+Jaurès,+35300+Fougères',
        image: `${BASE}/og-default.jpg`,
        sameAs: [],
      },
    ],
  }
}

const PRODUCT_REVIEWS: Record<string, { count: number; rating: string }> = {
  '1': { count: 214, rating: '4.9' },
  '2': { count: 87, rating: '4.8' },
  '3': { count: 53, rating: '4.7' },
  '4': { count: 31, rating: '4.9' },
  '5': { count: 312, rating: '5.0' },
  '6': { count: 18, rating: '4.6' },
}

export function schemaProduct(product: Product) {
  const reviews = PRODUCT_REVIEWS[product.id] ?? { count: 12, rating: '4.8' }
  const price = ((product.variants?.[0]?.price ?? product.price) / 100).toFixed(2)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image:
      product.images[0]?.startsWith('http')
        ? product.images[0]
        : `${BASE}${product.images[0] ?? '/og-default.jpg'}`,
    url: `${BASE}/products/${product.slug}`,
    brand: {
      '@type': 'Brand',
      name: 'SP Barber',
    },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'EUR',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'SP Barber',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'EUR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'FR',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          businessDays: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          },
          cutoffTime: '16:00',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 5,
            unitCode: 'DAY',
          },
        },
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: reviews.rating,
      reviewCount: reviews.count,
      bestRating: '5',
      worstRating: '1',
    },
  }
}

export function schemaBreadcrumb(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function schemaFAQ(
  faqs: { cat: string; items: { q: string; a: string }[] }[],
) {
  const mainEntity = faqs.flatMap((section) =>
    section.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  )
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  }
}
