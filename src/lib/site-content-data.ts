/**
 * Donnees pures (pas d'appel Supabase) -- importable depuis un composant
 * client (l'onglet admin Contenu) sans embarquer la cle service_role dans le
 * bundle navigateur. src/lib/site-content.ts (server-only) reexporte tout ceci.
 */
export interface SiteContentBlock {
  text: string
  visible: boolean
}

/**
 * Valeurs par defaut = copie actuelle du site, mot pour mot. Tant qu'aucune
 * ligne n'existe en base pour une cle, ces valeurs s'affichent -- rien ne
 * change visuellement avant que Hedi n'edite quelque chose dans l'onglet
 * Contenu (meme principe que product_overrides pour les produits).
 */
export const SITE_CONTENT_DEFAULTS: Record<string, SiteContentBlock> = {
  announcement_bar: { text: 'Livraison offerte dès 49€ · Cadeau offert dès 70€ · Expédition 48h', visible: true },
  home_cta_banner: { text: 'Rejoignez 500+ clients satisfaits', visible: true },
  trust_securise: { text: 'Sécurisé', visible: true },
  trust_livraison: { text: 'Livraison 48h', visible: true },
  trust_retour: { text: 'Retour 30j', visible: true },
  trust_france: { text: 'France', visible: true },
}

export const SITE_CONTENT_LABELS: Record<string, string> = {
  announcement_bar: 'Bandeau d’annonce (haut de toutes les pages)',
  home_cta_banner: 'Bannière CTA (accueil, "Rejoignez X clients satisfaits")',
  trust_securise: 'Repère fiche produit — Sécurisé',
  trust_livraison: 'Repère fiche produit — Livraison 48h',
  trust_retour: 'Repère fiche produit — Retour 30 jours',
  trust_france: 'Repère fiche produit — France',
}

/** Ordre d'affichage stable dans l'admin, et ordre des 4 reperes sur la fiche produit. */
export const SITE_CONTENT_KEYS = [
  'announcement_bar', 'home_cta_banner', 'trust_securise', 'trust_livraison', 'trust_retour', 'trust_france',
] as const

export const TRUST_KEYS = ['trust_securise', 'trust_livraison', 'trust_retour', 'trust_france'] as const

export interface TrustItem { key: string; text: string }

export function getTrustItems(siteContent: Record<string, SiteContentBlock>): TrustItem[] {
  return TRUST_KEYS
    .map((key) => ({ key, block: siteContent[key] ?? SITE_CONTENT_DEFAULTS[key] }))
    .filter((item) => item.block.visible && item.block.text.trim())
    .map((item) => ({ key: item.key, text: item.block.text }))
}
