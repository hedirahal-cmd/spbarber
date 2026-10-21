/**
 * Decoupage d'un nom complet en prenom/nom -- utilise UNIQUEMENT quand on n'a
 * pas collecte les deux separement (ex. feuille de paiement Apple Pay/Google
 * Pay, qui ne rend qu'un `payerName` unique -- voir ExpressCheckoutButton).
 *
 * Regle choisie (2026-10-21, decision Hedi) : le PREMIER espace separe prenom
 * et nom -- "Jean-Pierre Dupont" => "Jean-Pierre"/"Dupont", "Jean Pierre
 * Dupont" => "Jean"/"Pierre Dupont". Ce n'est pas toujours exact (noms
 * composes precedes d'un prenom compose a espace), mais c'est deterministe et
 * couvre l'immense majorite des cas francais -- et Boxtal n'exige que des
 * champs non vides, pas une exactitude d'etat civil. Le flux de paiement
 * principal (Stripe Checkout classique) n'a pas ce probleme : il collecte
 * prenom et nom separement via des champs dedies (voir /api/stripe/checkout).
 */
export function diviserNomComplet(nomComplet: string): { prenom: string; nom: string } {
  const nettoye = nomComplet.trim()
  if (!nettoye) return { prenom: 'Client', nom: 'SP Barber' }
  const espace = nettoye.indexOf(' ')
  if (espace === -1) return { prenom: nettoye, nom: nettoye }
  return { prenom: nettoye.slice(0, espace), nom: nettoye.slice(espace + 1).trim() || nettoye }
}
