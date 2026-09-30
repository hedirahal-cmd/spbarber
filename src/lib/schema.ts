import { Product } from '@/types'
import { Salon } from '@/lib/salons'

const BASE = 'https://spbarber.fr'

/**
 * Serialise un bloc de donnees structurees pour insertion dans un <script>.
 *
 * A UTILISER PARTOUT a la place de JSON.stringify dans un dangerouslySetInnerHTML :
 * JSON.stringify n'echappe PAS la sequence de fermeture de balise, donc une valeur
 * venant de la base -- le nom ou la description d'un produit, editables depuis
 * l'administration -- pouvait fermer le script et en ouvrir un autre : une XSS
 * stockee servie a tout visiteur de la fiche.
 *
 * Les echappements ci-dessous restent du JSON valide : < se relit en "<".
 * Les donnees structurees lues par les moteurs sont donc inchangees.
 *
 * On n'echappe PAS U+2028/U+2029 : ces separateurs cassent l'analyse JavaScript,
 * mais un bloc type="application/ld+json" n'est jamais execute comme du script.
 */
export function jsonLd(donnees: unknown): string {
  return JSON.stringify(donnees)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

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

/**
 * `reviewSummary` vient des vrais avis (table `reviews`), calcule par
 * l'appelant -- jamais invente ici. Absent ou count:0, `aggregateRating` est
 * omis plutot que rempli d'un chiffre par defaut (meme principe que
 * schemaSalon ci-dessous pour note_google/nombre_avis).
 */
export function schemaProduct(product: Product, reviewSummary?: { count: number; rating: string } | null) {
  const price = ((product.variants?.[0]?.price ?? product.price) / 100).toFixed(2)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image:
      product.images[0]?.url?.startsWith('http')
        ? product.images[0].url
        : `${BASE}${product.images[0]?.url ?? '/og-default.jpg'}`,
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
        // schema.org n'a pas de notion native de "gratuit au-dessus d'un
        // seuil" -- le forfait reel (5,90e, offert des 60e) est reduit au
        // tarif facture le plus courant plutot que de declarer "0" comme si
        // la livraison etait toujours gratuite, ce qui etait faux en dessous
        // du seuil.
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '5.90',
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
          // Tondeuses = dropshipping manuel, delai reel ~2 semaines -- tres
          // different du reste du catalogue (2-5 jours). Categorie utilisee
          // plutot qu'un id en dur pour rester correct si d'autres tondeuses
          // rejoignent le catalogue.
          handlingTime: product.category === 'tondeuse' ? {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY',
          } : {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY',
          },
          transitTime: product.category === 'tondeuse' ? {
            '@type': 'QuantitativeValue',
            minValue: 10,
            maxValue: 14,
            unitCode: 'DAY',
          } : {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 5,
            unitCode: 'DAY',
          },
        },
      },
    },
    ...(reviewSummary && reviewSummary.count > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reviewSummary.rating,
        reviewCount: reviewSummary.count,
        bestRating: '5',
        worstRating: '1',
      },
    } : {}),
  }
}

/**
 * Genere les donnees structurees LocalBusiness d'un salon a partir de ses seuls
 * champs reels -- rien n'est invente quand une donnee manque : `geo` est absent
 * sans latitude/longitude, `aggregateRating` absent sans note_google/nombre_avis,
 * `openingHoursSpecification` toujours absent (horaires en texte libre, non
 * structure -- decision actee au bloc Salons plutot que d'inventer des horaires).
 */
export function schemaSalon(salon: Salon) {
  const hasRating = !!(salon.note_google && salon.nombre_avis)
  const hasGeo = salon.latitude != null && salon.longitude != null
  const image = salon.photos?.[0]?.startsWith('http') ? salon.photos[0] : `${BASE}/og-default.jpg`

  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HairSalon', 'BarberShop'],
    name: salon.nom ?? 'SP Barber',
    description: salon.description ?? `Salon de coiffure barbier professionnel à ${salon.ville ?? ''}.`,
    url: `${BASE}/salon/${salon.slug}`,
    telephone: salon.telephone ?? '',
    address: {
      '@type': 'PostalAddress',
      streetAddress: salon.adresse ?? '',
      addressLocality: salon.ville ?? '',
      postalCode: salon.code_postal ?? '',
      addressCountry: 'FR',
    },
    ...(hasGeo ? { geo: { '@type': 'GeoCoordinates', latitude: salon.latitude, longitude: salon.longitude } } : {}),
    priceRange: '€€',
    ...(salon.lien_google_maps ? { hasMap: salon.lien_google_maps } : {}),
    image,
    sameAs: [],
    ...(hasRating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: salon.note_google,
        reviewCount: salon.nombre_avis,
        bestRating: '5',
        worstRating: '1',
      },
    } : {}),
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
