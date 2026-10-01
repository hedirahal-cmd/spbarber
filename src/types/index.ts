export interface ProductImage {
  url: string
  alt: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  images: ProductImage[]
  category: string
  stock: number
  is_dropshipping: boolean
  dsers_url?: string
  /** dsers_url reste une note interne (lien fournisseur pour Hedi), n'entraine
   * plus de redirection client -- dropshipping gere manuellement pour ce produit. */
  skip_dsers_redirect?: boolean
  variants?: ProductVariant[]
  seo_title?: string
  seo_description?: string
  created_at: string
  benefit?: string
  trust?: string[]
  related?: string[]
  actif?: boolean
  /** Pastilles courtes sous la photo (ex. "Sans ammoniaque") -- propre a certains
   * produits, absentes sinon : la rangee ne s'affiche simplement pas. */
  pills?: string[]
  /** Section "Comment ça fonctionne" -- propre a certains produits (mode d'emploi),
   * absente sinon : la section ne s'affiche simplement pas. */
  usageSteps?: { label: string; texte: string }[]
  /** Slider avant/apres -- contenu (libelles, dessin CSS de repli) propre aux
   * colorants capillaires, n'a aucun sens sur les autres categories. */
  beforeAfterEnabled?: boolean
  /** Marque reelle du fabricant, pour les produits dropshippes qui n'en portent
   * pas -- absent = "SP Barber" (produits de la marque propre). */
  brand?: string
  /** 'color' affiche un selecteur de pastilles de couleur pres du titre (change
   * la galerie photo) plutot que le selecteur de modele/prix existant. Absent
   * ou 'model' = comportement inchange. */
  variantKind?: 'model' | 'color'
  /** Resume court (type de cheveux concerne, effet recherche ou usage
   * principal) affiche sur la carte catalogue pour comparer en un coup
   * d'oeil -- redige a partir du contenu reel de la description, pas une
   * nouvelle promesse. */
  usageTag?: string
  /** true = pas de recommandation fixe dans "Completez votre routine" --
   * pioche plutot parmi les autres produits actifs du catalogue (hors
   * tondeuses, cf. related). */
  genericRecommendations?: boolean
}

export interface ProductVariant {
  id: string
  name: string
  /** Absent = meme prix que le produit de base (overrides admin inclus) --
   * un coloris n'a pas de prix propre. Seuls les variants qui en ont vraiment
   * un (ex. modeles/tailles a prix differents) le renseignent. */
  price?: number
  stock: number
  /** Sous-ensemble de product.images reserve a ce coloris -- sous-chaines a
   * retrouver dans les URL (ex. noms de fichiers). Absent ou aucune
   * correspondance = galerie complete affichee (repli sans danger). */
  imageMatch?: string[]
}

export interface CartItem {
  product: Product
  quantity: number
  variant?: ProductVariant
}

export interface Order {
  id: string
  user_id?: string
  email: string
  items: CartItem[]
  total: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  stripe_payment_intent_id: string
  shipping_address: ShippingAddress
  created_at: string
  fournisseur_commande?: boolean
}

export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  postal_code: string
  country: string
}
