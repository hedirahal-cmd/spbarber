export interface Barber {
  id: string
  slug: string
  nom: string
  initiales: string
  couleur_avatar: string
  salon_slug: string | null
  ville: string | null
  specialite: string | null
  description: string | null
  annees_experience: number | null
  produit_favori_slug: string | null
  produit_favori_nom: string | null
  photo_url: string | null
  actif: boolean
  ordre: number
  created_at?: string
}

// Karim M. et David L. retires (2026-09-28, decision Hedi) : contenu de
// demonstration reste en base par erreur, jamais de vraies fiches. Samy P.
// est le seul barbier reel a ce jour.
export const DEFAULT_BARBERS: Barber[] = [
  {
    id: '1', slug: 'samy-p', nom: 'Samy P.', initiales: 'SP', couleur_avatar: '#1a3a5c', photo_url: null,
    salon_slug: 'fougeres', ville: 'Fougères', specialite: 'Dégradé Fade & Skin Fade',
    description: '"Le dégradé, c\'est ma signature — précision au millimètre, fini net à chaque coupe."',
    annees_experience: 8, produit_favori_slug: null, produit_favori_nom: null,
    actif: true, ordre: 1,
  },
]
