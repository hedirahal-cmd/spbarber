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
  },
]
