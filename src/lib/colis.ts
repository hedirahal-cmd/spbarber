/**
 * Calcul du colis standard suggere a l'admin avant de generer une etiquette
 * Boxtal (chantier 2026-10-21) -- module SANS dependance Node (pas de
 * node:crypto/Buffer), importable aussi bien cote serveur (route de creation
 * d'etiquette, si besoin) que cote client (admin/page.tsx, 'use client').
 */

/**
 * Carton standard (proposition validee par Hedi) pour un colis multi-
 * produits : poids/dimensions par defaut quand plusieurs produits partagent
 * le meme colis -- les poids s'additionnent, les dimensions non (deux
 * flacons ne font pas un colis deux fois plus long), d'ou un contenant fixe
 * plutot qu'un calcul invente. Modifiable ici si le carton reellement utilise
 * par Hedi change. Reste EDITABLE a la volee dans l'admin avant de generer
 * l'etiquette (voir TabCommandes, admin/page.tsx) : ces valeurs ne sont qu'une
 * PROPOSITION de depart, jamais imposees cote serveur.
 */
export const CARTON_STANDARD = { poidsKg: 0.1, longueurCm: 25, largeurCm: 19, hauteurCm: 10 }

/**
 * Suggestion de poids pour le colis standard d'une commande : poids du
 * carton + somme des poids (weight_kg) des articles qui le composent. Rend
 * aussi la liste des produits sans poids connu -- a signaler a l'admin plutot
 * qu'a faire comme si de rien n'etait (un poids sous-estime fausse le tarif
 * Boxtal reellement facture).
 */
export function calculerPoidsSuggere(
  lignes: { id?: unknown; qty?: unknown }[],
  poidsParId: Record<string, number | null | undefined>,
): { poidsKg: number; manquants: string[] } {
  let poids = CARTON_STANDARD.poidsKg
  const manquants: string[] = []
  for (const ligne of lignes) {
    const id = typeof ligne.id === 'string' ? ligne.id : null
    const qty = typeof ligne.qty === 'number' ? ligne.qty : 1
    if (!id) continue
    const p = poidsParId[id]
    if (p == null) {
      manquants.push(id)
      continue
    }
    poids += p * qty
  }
  return { poidsKg: Math.round(poids * 1000) / 1000, manquants }
}
