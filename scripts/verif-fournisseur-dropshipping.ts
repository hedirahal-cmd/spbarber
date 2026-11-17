/**
 * Banc de verification du bloc "informations fournisseur" (tondeuses en
 * dropshipping, 2026-11-17, demande Hedi) : choix du lien AliExpress par
 * produit, et format exact du bloc de texte copie dans le presse-papiers.
 *
 * Fonctions PURES (aucun I/O) -- import direct, pas de serveur Next.js ni
 * de faux Supabase necessaire, meme principe que verif-f001.ts/verif-
 * schema.ts.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-fournisseur-dropshipping.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 */
import {
  LIENS_ALIEXPRESS_PAR_PRODUIT,
  lienAliExpressPour,
  construireBlocLivraisonFournisseur,
} from '@/lib/fournisseur-dropshipping'

let ok = 0
let ko = 0
function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) { ok++; console.log('  OK    ' + nom) }
  else { ko++; console.log('  ECHEC ' + nom + (detail ? '\n        ' + detail : '')) }
}

console.log('\n--- A. Choix du lien AliExpress par produit ---')
verifie(
  'BRDCLIP FA1T (id 8) => bon lien, exactement celui fourni par Hedi',
  lienAliExpressPour('8') === 'https://fr.aliexpress.com/item/1005008034684971.html',
  String(lienAliExpressPour('8')),
)
verifie(
  'Kemei KM-999 (id 9) => bon lien, exactement celui fourni par Hedi',
  lienAliExpressPour('9') === 'https://fr.aliexpress.com/item/1005008348243648.html',
  String(lienAliExpressPour('9')),
)
verifie('produit inconnu => null (jamais un lien par défaut inventé)', lienAliExpressPour('999') === null)
verifie('produit non-tondeuse (ex. id 2) => null', lienAliExpressPour('2') === null)
verifie('une seule constante porte les deux liens (facile à modifier)', Object.keys(LIENS_ALIEXPRESS_PAR_PRODUIT).length === 2)

console.log('\n--- B. Bloc de livraison : commande complète, un seul article tondeuse ---')
let bloc = construireBlocLivraisonFournisseur({
  shippingAddress: {
    name: 'Jean Dupont', prenom: 'Jean', nom: 'Dupont', phone: '+33612345678',
    address: { line1: '1 rue du Test', line2: 'Bâtiment B', city: 'Fougères', postal_code: '35300', country: 'FR' },
  },
  email: 'client@exemple.test',
  lignesTondeuse: [{ id: '8', variantId: 'blanc', qty: 1 }],
})
verifie('contient le nom complet (prénom + nom)', bloc.includes('Jean Dupont'))
verifie('contient la ligne 1', bloc.includes('1 rue du Test'))
verifie('contient la ligne 2', bloc.includes('Bâtiment B'))
verifie('contient le code postal', bloc.includes('35300'))
verifie('contient la ville', bloc.includes('Fougères'))
verifie('pays affiché en clair ("France", pas "FR")', bloc.includes('France') && !bloc.includes('\nFR\n'))
verifie('contient le téléphone', bloc.includes('+33612345678'))
verifie('contient l\'e-mail', bloc.includes('client@exemple.test'))
verifie('contient le produit ET le coloris ET la quantité', bloc.includes('Tondeuse BRDCLIP FA1T — Blanc × 1'))
verifie(
  'ordre EXACT demandé (nom, adresse1, adresse2, CP, ville, pays, tél, email, puis produit)',
  bloc.split('\n').slice(0, 8).join('|') ===
    ['Jean Dupont', '1 rue du Test', 'Bâtiment B', '35300', 'Fougères', 'France', '+33612345678', 'client@exemple.test'].join('|'),
  JSON.stringify(bloc.split('\n')),
)

console.log('\n--- C. Téléphone ET e-mail manquants => "non renseigné" explicite, jamais une ligne muette ---')
bloc = construireBlocLivraisonFournisseur({
  shippingAddress: { name: 'Jean Dupont', address: { line1: '1 rue du Test', city: 'Fougères', postal_code: '35300', country: 'FR' } },
  email: null,
  lignesTondeuse: [{ id: '9', variantId: 'rouge', qty: 1 }],
})
verifie('téléphone absent => "non renseigné"', bloc.includes('non renseigné'))
const occurrences = bloc.split('non renseigné').length - 1
verifie('DEUX lignes "non renseigné" (téléphone ET e-mail)', occurrences === 2, bloc)

console.log('\n--- D. Adresse ligne 2 absente => simplement omise (pas de ligne vide, pas de "non renseigné") ---')
bloc = construireBlocLivraisonFournisseur({
  shippingAddress: { name: 'Jean Dupont', phone: '+33600000000', address: { line1: '1 rue du Test', city: 'Fougères', postal_code: '35300', country: 'FR' } },
  email: 'client@exemple.test',
  lignesTondeuse: [{ id: '8', variantId: 'vert', qty: 1 }],
})
verifie('pas de ligne vide (adresse 2 omise proprement)', !bloc.split('\n').some((l, i) => l === '' && i < 7), JSON.stringify(bloc.split('\n')))

console.log('\n--- E. Commande MIXTE : plusieurs lignes tondeuse (produits et/ou coloris différents) => toutes listées ---')
bloc = construireBlocLivraisonFournisseur({
  shippingAddress: { name: 'Jean Dupont', phone: '+33600000000', address: { line1: '1 rue du Test', city: 'Fougères', postal_code: '35300', country: 'FR' } },
  email: 'client@exemple.test',
  lignesTondeuse: [{ id: '8', variantId: 'blanc', qty: 1 }, { id: '9', variantId: 'noir', qty: 2 }],
})
verifie('BRDCLIP Blanc × 1 présent', bloc.includes('Tondeuse BRDCLIP FA1T — Blanc × 1'))
verifie('Kemei Noir × 2 présent', bloc.includes('Tondeuse Kemei KM-999 — Noir × 2'))

console.log('\n--- F. AUCUNE donnée client dans le lien AliExpress (toujours la même URL statique) ---')
const lienAvecDonneesSensibles = lienAliExpressPour('8')
verifie('le lien ne contient jamais d\'email/téléphone (URL statique, jamais interpolée)',
  !!lienAvecDonneesSensibles && !lienAvecDonneesSensibles.includes('client@exemple.test') && !lienAvecDonneesSensibles.includes('+336'),
  String(lienAvecDonneesSensibles))
verifie('le lien ne contient aucun paramètre de requête (déjà nettoyé)', !!lienAvecDonneesSensibles && !lienAvecDonneesSensibles.includes('?'))

console.log('\n=======================================')
console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
console.log('=======================================')
process.exitCode = ko === 0 ? 0 : 1
