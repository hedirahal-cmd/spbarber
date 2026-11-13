/**
 * Classification par code postal -- Corse et DOM-TOM (chantier 2026-10-21,
 * decisions Hedi). Module pur, sans dependance Node : importable aussi bien
 * cote serveur (routes API) que cote client ('use client', admin/page.tsx).
 */

/**
 * Corse (codes postaux 20000 a 20620) : Chronopost y coute environ 4x le
 * tarif metropole (devis Boxtal reel, 2026-10-21) -- jamais propose, ni cote
 * admin ni cote serveur, Colissimo reste le seul choix. Voir
 * /api/admin/ship, /api/admin/boxtal/create-label et admin/page.tsx.
 */
export function estCorse(codePostal: string | null | undefined): boolean {
  return typeof codePostal === 'string' && codePostal.trim().startsWith('20')
}

/**
 * DOM-TOM (971 a 978, 984 a 988) : aucune offre Colissimo/Chronopost
 * renvoyee par Boxtal pour ces destinations (devis reel teste sur la
 * Martinique, 2026-10-21) -- une commande payee vers ces codes postaux ne
 * pourrait pas etre expediee. Monaco (98000) est VOLONTAIREMENT exclu de
 * cette liste : La Poste le livre normalement, prefixe "980" absent des
 * plages bloquees ci-dessous.
 *
 * Prefixes couverts : 971 Guadeloupe, 972 Martinique, 973 Guyane,
 * 974 Reunion, 975 Saint-Pierre-et-Miquelon, 976 Mayotte,
 * 977 Saint-Barthelemy, 978 Saint-Martin (ajoutes le 2026-10-21, decision
 * Hedi), 984 TAAF, 986 Wallis-et-Futuna, 987 Polynesie francaise,
 * 988 Nouvelle-Caledonie (985/989 non assignes, bloques par simplicite de
 * plage sans consequence).
 */
const PREFIXES_DOM_TOM = ['971', '972', '973', '974', '975', '976', '977', '978', '984', '985', '986', '987', '988']

export function estDomTom(codePostal: string | null | undefined): boolean {
  if (typeof codePostal !== 'string') return false
  const cp = codePostal.trim()
  return PREFIXES_DOM_TOM.some((prefixe) => cp.startsWith(prefixe))
}
