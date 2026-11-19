/**
 * Decoupage d'un nom complet en prenom/nom -- UNIQUE source pour les deux
 * flux de paiement depuis que les champs personnalises "Prenom"/"Nom" ont
 * ete retires de Stripe Checkout (2026-11-19, decision Hedi, audit externe
 * point 10 : ils faisaient doublon avec le nom natif de Stripe, qui ne
 * collecte de toute facon qu'une chaine unique, jamais prenom/nom separes).
 * Avant cette date, seul le paiement express (Apple Pay/Google Pay, feuille
 * native qui ne rend qu'un `payerName` unique) en dependait.
 *
 * Ce decoupage n'est qu'un REPLI raisonnable, jamais la verite d'etat civil :
 * la vraie verification, et la correction a la main si besoin, a lieu dans
 * l'admin juste avant la creation de l'etiquette Boxtal (voir
 * /api/admin/boxtal/create-label) -- Boxtal exige seulement des champs non
 * vides, pas une exactitude parfaite.
 *
 * Regle : un prenom compose a trait d'union reste un seul mot ("Jean-Pierre
 * Dupont" => "Jean-Pierre"/"Dupont", deja vrai avant ce correctif -- un
 * trait d'union n'est pas un espace). Une particule reconnue (de, du, le,
 * la, van, el...) ancre desormais le DEBUT du nom de famille, meme precedee
 * d'un prenom compose a espace ("Marie Claire De Smet" => "Marie
 * Claire"/"De Smet", corrige -- un simple partage au premier espace aurait
 * donne "Marie"/"Claire De Smet"). Sans particule reconnue, repli sur le
 * partage au premier espace ("Jean Pierre Dupont" => "Jean"/"Pierre
 * Dupont", ambigu par nature, non resolu ici). Un seul mot => duplique dans
 * les deux champs (jamais vide, Boxtal l'exige).
 */
const PARTICULES = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'van', 'von', 'der', 'den', 'el', 'al'])

export function diviserNomComplet(nomComplet: string): { prenom: string; nom: string } {
  const nettoye = nomComplet.trim().replace(/\s+/g, ' ')
  if (!nettoye) return { prenom: 'Client', nom: 'SP Barber' }

  const mots = nettoye.split(' ')
  if (mots.length === 1) return { prenom: nettoye, nom: nettoye }

  const indexParticule = mots.findIndex((m, i) => i > 0 && PARTICULES.has(m.toLowerCase()))
  if (indexParticule !== -1) {
    return { prenom: mots.slice(0, indexParticule).join(' '), nom: mots.slice(indexParticule).join(' ') }
  }

  return { prenom: mots[0], nom: mots.slice(1).join(' ') }
}
