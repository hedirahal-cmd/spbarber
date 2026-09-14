/**
 * Texte "ventes de la semaine" par produit. Valeurs par defaut = nombres
 * actuellement en dur sur le site (copie exacte), utilisees tant que Hedi n'a
 * rien edite pour ce produit dans l'onglet Contenu.
 */
export const SOCIAL_PROOF_DEFAULTS: Record<string, number> = {
  '1': 34, '2': 51, '3': 12, '4': 18, '5': 89, '6': 7,
}

export interface ProductSocialOverride {
  social_proof_text?: string | null
  social_proof_visible?: boolean | null
}

export function defaultSocialProofText(productId: string): string | null {
  const n = SOCIAL_PROOF_DEFAULTS[productId]
  return n ? `${n} personnes ont acheté cette semaine` : null
}

/**
 * Ne renvoie jamais l'emoji/icone -- ca reste au choix de chaque endroit qui
 * affiche ce texte (🔥 en ligne, icone Sparkles a cote, etc.), pour ne pas
 * dupliquer un symbole deja porte par le design de la page.
 */
export function resolveSocialProof(productId: string, override?: ProductSocialOverride | null): string | null {
  if ((override?.social_proof_visible ?? true) === false) return null
  const text = override?.social_proof_text ?? defaultSocialProofText(productId)
  return text && text.trim() ? text.trim() : null
}
