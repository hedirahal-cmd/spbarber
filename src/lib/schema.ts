import { Product } from '@/types'
import { Salon } from '@/lib/salons'
import { EXPEDITION_JOURS_OUVRES, TRANSIT_JOURS_MIN, TRANSIT_JOURS_MAX } from '@/lib/delais'

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

/**
 * Valide note_google/nombre_avis AVANT de les emettre en aggregateRating
 * (2026-11-17, demande Hedi) -- une simple presence ne suffit pas : note
 * DOIT etre un nombre entre 1 et 5 inclus, nombre_avis DOIT etre un entier
 * >= 1. Toute valeur incoherente (texte non numerique, note hors bornes,
 * zero/negatif, decimal pour le compte d'avis) fait OMETTRE le champ
 * entier plutot que publier une donnee fausse ou invraisemblable aux
 * moteurs de recherche.
 */
function avisGoogleValides(noteGoogle: string | null | undefined, nombreAvis: string | null | undefined): boolean {
  if (!noteGoogle || !nombreAvis) return false
  const note = Number(noteGoogle)
  const nombre = Number(nombreAvis)
  if (!Number.isFinite(note) || note < 1 || note > 5) return false
  if (!Number.isInteger(nombre) || nombre < 1) return false
  return true
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
  sameAs: ['https://www.instagram.com/sp_barbershop_/'],
}

/**
 * Convertit le texte d'horaires EXACTEMENT au format utilise dans la table
 * `salons` (ex. "Lun–Sam 9h–19h") en openingHoursSpecification structuree --
 * SANS jamais inventer : un format inattendu (jour inconnu, plage "a
 * l'envers", etc.) rend `undefined`, jamais une valeur approximative. Un
 * SEUL jour de depart, un SEUL jour de fin, UNE SEULE plage horaire --
 * volontairement etroit (le format reel des deux salons a ce jour), pas un
 * parseur d'horaires general (2026-11-17, demande Hedi).
 */
const ORDRE_JOURS_FR = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
const JOUR_FR_VERS_EN: Record<string, string> = {
  lun: 'Monday', mar: 'Tuesday', mer: 'Wednesday', jeu: 'Thursday', ven: 'Friday', sam: 'Saturday', dim: 'Sunday',
}

export function openingHoursDepuisTexte(horaires: string | null | undefined): Record<string, unknown>[] | undefined {
  if (!horaires) return undefined
  const m = horaires.trim().match(
    /^(lun|mar|mer|jeu|ven|sam|dim)\.?\s*[–-]\s*(lun|mar|mer|jeu|ven|sam|dim)\.?\s+(\d{1,2})h(\d{2})?\s*[–-]\s*(\d{1,2})h(\d{2})?$/i,
  )
  if (!m) return undefined
  const [, jourDebut, jourFin, hDebut, mDebut, hFin, mFin] = m
  const iDebut = ORDRE_JOURS_FR.indexOf(jourDebut.toLowerCase())
  const iFin = ORDRE_JOURS_FR.indexOf(jourFin.toLowerCase())
  if (iDebut === -1 || iFin === -1 || iFin < iDebut) return undefined

  const deuxChiffres = (n: string) => n.padStart(2, '0')
  return [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ORDRE_JOURS_FR.slice(iDebut, iFin + 1).map((j) => JOUR_FR_VERS_EN[j]),
    opens: `${deuxChiffres(hDebut)}:${mDebut ?? '00'}`,
    closes: `${deuxChiffres(hFin)}:${mFin ?? '00'}`,
  }]
}

// potentialAction/SearchAction retire (2026-11-18, demande Hedi) : /products
// ne lit aucun parametre de recherche (q=...), la promesse etait fausse --
// aucune recherche ne fonctionne reellement sur le site a ce jour.
const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${BASE}/#website`,
  url: BASE,
  name: 'SP Barber',
  publisher: { '@id': `${BASE}/#organization` },
}

/**
 * `salonPrincipal` (2026-11-17, demande Hedi) : le LocalBusiness de la page
 * d'accueil reprend desormais les VRAIES donnees du salon (au lieu d'une
 * copie figee en dur, qui dupliquait -- et pouvait faire deriver -- les
 * donnees de la fiche /salon/fougeres, et qui inventait des coordonnees
 * geo jamais presentes dans la vraie table `salons`, latitude/longitude
 * etant NULL pour les deux salons a ce jour). Sans salon fourni (lecture
 * Supabase en panne), repli sur les memes valeurs par defaut que
 * DEFAULT_SALONS -- jamais un bloc invente a part.
 */
export function schemaOrganizationLocal(salonPrincipal?: Salon) {
  const hasRating = avisGoogleValides(salonPrincipal?.note_google, salonPrincipal?.nombre_avis)
  const hasGeo = salonPrincipal?.latitude != null && salonPrincipal?.longitude != null
  const openingHours = openingHoursDepuisTexte(salonPrincipal?.horaires)

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
          salonPrincipal?.description ||
          'Salon de coiffure barbier à Fougères et boutique en ligne de produits capillaires premium pour hommes.',
        url: BASE,
        ...(salonPrincipal?.telephone ? { telephone: salonPrincipal.telephone } : {}),
        address: {
          '@type': 'PostalAddress',
          streetAddress: salonPrincipal?.adresse || '48 Boulevard Jean Jaurès',
          addressLocality: salonPrincipal?.ville || 'Fougères',
          postalCode: salonPrincipal?.code_postal || '35300',
          addressCountry: 'FR',
        },
        ...(hasGeo ? { geo: { '@type': 'GeoCoordinates', latitude: salonPrincipal!.latitude, longitude: salonPrincipal!.longitude } } : {}),
        ...(openingHours ? { openingHoursSpecification: openingHours } : {}),
        priceRange: '€€',
        hasMap: salonPrincipal?.lien_google_maps || 'https://maps.google.com/?q=48+Boulevard+Jean+Jaurès,+35300+Fougères',
        image: `${BASE}/og-default.jpg`,
        sameAs: ['https://www.instagram.com/sp_barbershop_/'],
        ...(hasRating ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: salonPrincipal!.note_google,
            reviewCount: salonPrincipal!.nombre_avis,
            bestRating: '5',
            worstRating: '1',
          },
        } : {}),
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
// Doit rester le meme seuil que le vrai forfait de port (checkout Stripe,
// bandeau, fiches) -- SEUIL_LIVRAISON_OFFERTE dans /api/stripe/checkout, pas
// importe directement pour eviter un aller-retour serveur/route depuis ce
// module partage cote client comme serveur.
const SEUIL_LIVRAISON_OFFERTE_CENTIMES = 5900

export function schemaProduct(product: Product, reviewSummary?: { count: number; rating: string } | null) {
  const prixCentimes = product.variants?.[0]?.price ?? product.price
  const price = (prixCentimes / 100).toFixed(2)

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
      // Un produit dropshippe (tondeuses) n'est pas fabrique par SP Barber --
      // le declarer comme marque induirait le client en erreur.
      name: product.brand ?? 'SP Barber',
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
        // seuil" -- ce produit PRIS SEUL declenche-t-il la livraison offerte ?
        // Le prix (pas de variante ici, PRODUCTS n'en donne pas au moins cher
        // des deux tondeuses) suffit a le determiner pour un achat a l'unite.
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: prixCentimes >= SEUIL_LIVRAISON_OFFERTE_CENTIMES ? '0' : '5.90',
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
          // Tondeuses = dropshipping manuel, delai reel "sous ~2 semaines" --
          // tres different du reste du catalogue (voir src/lib/delais.ts pour
          // le reste du catalogue). Categorie utilisee plutot qu'un id en dur
          // pour rester correct si d'autres tondeuses rejoignent le catalogue.
          // Handling + transit doit rester <= 14 jours au total pour matcher
          // le texte visible sur la fiche.
          handlingTime: product.category === 'tondeuse' ? {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY',
          } : {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: EXPEDITION_JOURS_OUVRES,
            unitCode: 'DAY',
          },
          transitTime: product.category === 'tondeuse' ? {
            '@type': 'QuantitativeValue',
            minValue: 8,
            maxValue: 12,
            unitCode: 'DAY',
          } : {
            '@type': 'QuantitativeValue',
            minValue: TRANSIT_JOURS_MIN,
            maxValue: TRANSIT_JOURS_MAX,
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
  const hasRating = avisGoogleValides(salon.note_google, salon.nombre_avis)
  const hasGeo = salon.latitude != null && salon.longitude != null
  const image = salon.photos?.[0]?.startsWith('http') ? salon.photos[0] : `${BASE}/og-default.jpg`
  const openingHours = openingHoursDepuisTexte(salon.horaires)

  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HairSalon', 'BarberShop'],
    name: salon.nom ?? 'SP Barber',
    description: salon.description ?? `Salon de coiffure barbier professionnel à ${salon.ville ?? ''}.`,
    url: `${BASE}/salon/${salon.slug}`,
    // Telephone OMIS si absent (2026-11-17) -- jamais une chaine vide dans
    // les donnees structurees, meme principe que geo/aggregateRating
    // ci-dessous. Aucun des deux salons n'a de numero reel enregistre a ce
    // jour (colonne vide en base).
    ...(salon.telephone ? { telephone: salon.telephone } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: salon.adresse ?? '',
      addressLocality: salon.ville ?? '',
      postalCode: salon.code_postal ?? '',
      addressCountry: 'FR',
    },
    ...(hasGeo ? { geo: { '@type': 'GeoCoordinates', latitude: salon.latitude, longitude: salon.longitude } } : {}),
    ...(openingHours ? { openingHoursSpecification: openingHours } : {}),
    priceRange: '€€',
    ...(salon.lien_google_maps ? { hasMap: salon.lien_google_maps } : {}),
    image,
    sameAs: ['https://www.instagram.com/sp_barbershop_/'],
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
