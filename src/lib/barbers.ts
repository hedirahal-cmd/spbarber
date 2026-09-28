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

export const DEFAULT_BARBERS: Barber[] = [
  {
    id: '1', slug: 'samy-p', nom: 'Samy P.', initiales: 'SP', couleur_avatar: '#1a3a5c', photo_url: null,
    salon_slug: 'fougeres', ville: 'Fougères', specialite: 'Dégradé Fade & Skin Fade',
    description: '"Le dégradé, c\'est ma signature — précision au millimètre, fini net à chaque coupe."',
    annees_experience: 8, produit_favori_slug: null, produit_favori_nom: null,
    actif: true, ordre: 1,
  },
  {
    id: '2', slug: 'karim-m', nom: 'Karim M.', initiales: 'KM', couleur_avatar: '#4a1a6b', photo_url: null,
    salon_slug: 'fougeres', ville: 'Fougères', specialite: 'Coupe Classique & Barbe',
    description: '"Le Pack Barbe, c\'est exactement ce que je recommande à mes clients qui veulent entretenir leur barbe à la maison comme en salon."',
    annees_experience: 5, produit_favori_slug: 'pack-barbe-complet', produit_favori_nom: 'Pack Barbe Complet',
    actif: true, ordre: 2,
  },
  {
    id: '3', slug: 'david-l', nom: 'David L.', initiales: 'DL', couleur_avatar: '#1a5c3a', photo_url: null,
    salon_slug: 'ernee', ville: 'Ernée', specialite: 'Dégradé & Coloration',
    description: '"Le Shampooing Noir est parfait pour raviver la couleur entre deux coupes. Aucun client ne revient sans vouloir en racheter."',
    annees_experience: 4, produit_favori_slug: 'shampooing-noir-colorant', produit_favori_nom: 'Shampooing Noir Colorant',
    actif: true, ordre: 3,
  },
]
