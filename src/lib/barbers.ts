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
  actif: boolean
  ordre: number
  created_at?: string
}

export const DEFAULT_BARBERS: Barber[] = [
  {
    id: '1', slug: 'samy-p', nom: 'Samy P.', initiales: 'SP', couleur_avatar: '#1a3a5c',
    salon_slug: 'fougeres', ville: 'Fougères', specialite: 'Dégradé Fade & Skin Fade',
    description: '"La Cire Premium est mon indispensable. Tenue impeccable du matin au soir — je l\'utilise sur tous mes clients depuis des années."',
    annees_experience: 8, produit_favori_slug: 'cire-cheveux-premium', produit_favori_nom: 'Cire Cheveux Premium',
    actif: true, ordre: 1,
  },
  {
    id: '2', slug: 'karim-m', nom: 'Karim M.', initiales: 'KM', couleur_avatar: '#4a1a6b',
    salon_slug: 'fougeres', ville: 'Fougères', specialite: 'Coupe Classique & Barbe',
    description: '"Le Pack Barbe, c\'est exactement ce que je recommande à mes clients qui veulent entretenir leur barbe à la maison comme en salon."',
    annees_experience: 5, produit_favori_slug: 'pack-barbe-complet', produit_favori_nom: 'Pack Barbe Complet',
    actif: true, ordre: 2,
  },
  {
    id: '3', slug: 'david-l', nom: 'David L.', initiales: 'DL', couleur_avatar: '#1a5c3a',
    salon_slug: 'ernee', ville: 'Ernée', specialite: 'Dégradé & Coloration',
    description: '"Le Shampooing Noir est parfait pour raviver la couleur entre deux coupes. Aucun client ne revient sans vouloir en racheter."',
    annees_experience: 4, produit_favori_slug: 'shampooing-noir-colorant', produit_favori_nom: 'Shampooing Noir Colorant',
    actif: true, ordre: 3,
  },
]
