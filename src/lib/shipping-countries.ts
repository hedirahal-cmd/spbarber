import type Stripe from 'stripe'

/** Meme type que shipping_address_collection.allowed_countries (Stripe) -- import de type uniquement, efface a la compilation, sans impact sur le bundle client. */
type CodePaysStripe = Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry

/**
 * Pays livrables au paiement -- France uniquement au lancement (decision
 * Hedi, 2026-10-21). Belgique/Suisse/Luxembourg desactives PARTOUT depuis
 * cette seule liste (Checkout classique, paiement express, pages /livraison,
 * FAQ, CGV) -- pour rouvrir un pays, il suffit de l'ajouter ici, aucune
 * autre modification de code necessaire.
 */
export const PAYS_LIVRABLES: CodePaysStripe[] = ['FR']

const LIBELLES_PAYS: Record<string, string> = {
  FR: 'France métropolitaine',
  BE: 'Belgique',
  CH: 'Suisse',
  LU: 'Luxembourg',
}

/** Libelles lisibles des pays actuellement livrables, dans l'ordre de PAYS_LIVRABLES. */
export function libellesPaysLivrables(): string[] {
  return PAYS_LIVRABLES.map((code) => LIBELLES_PAYS[code] ?? code)
}

/**
 * Enumeration humaine ("France métropolitaine, Belgique et Suisse") -- pour
 * les textes FAQ/CGV qui doivent rester corrects si un pays est rouvert,
 * sans reecrire la phrase a la main.
 */
export function enumerationPaysLivrables(): string {
  const libelles = libellesPaysLivrables()
  if (libelles.length <= 1) return libelles[0] ?? ''
  return libelles.slice(0, -1).join(', ') + ' et ' + libelles[libelles.length - 1]
}

/**
 * Mention visible avant paiement (panier + /checkout, decision Hedi
 * 2026-10-21) -- phrase redigee a la main (pas generee depuis PAYS_LIVRABLES :
 * la precision "Corse incluse" n'a de sens que pour la France seule) a
 * REVOIR si un pays est rouvert dans PAYS_LIVRABLES.
 */
export const MENTION_ZONE_LIVRABLE = 'Livraison en France métropolitaine uniquement (Corse incluse).'
