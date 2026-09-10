export interface Salon {
  slug: string
  nom: string | null
  adresse: string | null
  ville: string | null
  code_postal: string | null
  telephone: string | null
  horaires: string | null
  note_google: string | null
  nombre_avis: string | null
  lien_planity: string | null
  lien_google_maps: string | null
  actif: boolean
  ordre?: number | null
  photos?: string[] | null
  avis_google?: AvisGoogle[] | null
  description?: string | null
  seo_title?: string | null
  seo_description?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface AvisGoogle {
  texte: string
  auteur: string
  date: string
  etoiles: number
}

/**
 * Fonction utilitaire pure -- volontairement PAS dans un module 'use client' :
 * un export non-composant d'un tel module devient une reference client cote
 * bundler, et un Server Component qui l'appelle directement (sans le rendre en
 * JSX) echoue au runtime. C'est un ecueil reel des Server Components, pas une
 * bizarrerie de ce depot -- src/app/salon/[slug]/page.tsx (Server Component)
 * en a besoin au meme titre que HomeSalonSection ('use client').
 */
export function buildEmbedUrl(salon: Salon): string {
  const parts = salon.adresse
    ? [salon.adresse, salon.code_postal, salon.ville]
    : [salon.nom, salon.ville, salon.code_postal]
  const q = parts.filter(Boolean).join(' ')
  const z = salon.adresse ? 16 : 14
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed&z=${z}`
}

export const DEFAULT_SALONS: Salon[] = [
  {
    slug: 'fougeres',
    nom: 'SP Barber Shop',
    adresse: '48 Boulevard Jean Jaurès',
    ville: 'Fougères',
    code_postal: '35300',
    telephone: '',
    horaires: 'Lun–Sam 9h–19h',
    note_google: '4.9',
    nombre_avis: '47',
    lien_planity: 'https://www.planity.com/sp-barber-shop-35300-fougeres',
    lien_google_maps: 'https://www.google.com/maps/dir/?api=1&destination=48+Boulevard+Jean+Jaur%C3%A8s+35300+Foug%C3%A8res',
    actif: true,
    ordre: 1,
    photos: [],
  },
  {
    slug: 'ernee',
    nom: 'SP Barbershop Ernée',
    adresse: '',
    ville: 'Ernée',
    code_postal: '53500',
    telephone: '',
    horaires: '',
    note_google: '',
    nombre_avis: '',
    lien_planity: '',
    lien_google_maps: 'https://www.google.com/search?q=Sp+barbershop+ernee',
    actif: true,
    ordre: 2,
    photos: [],
  },
]
