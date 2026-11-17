import type { ArticleAffiche, LigneCommande } from '@/lib/shipping-email'
import { nomsArticles } from '@/lib/shipping-email'

/**
 * Liens AliExpress des tondeuses en dropshipping (2026-11-17, demande Hedi)
 * -- UNE SEULE constante, facile a modifier si un lien change. Deja
 * nettoyes de tout parametre de suivi (copier-colles tels que fournis par
 * Hedi). Le coloris se choisit sur la page AliExpress elle-meme, jamais
 * transmis dans l'URL (aucune donnee client dans un lien -- voir
 * construireBlocLivraisonFournisseur ci-dessous pour le detail du coloris,
 * affiche a cote du bouton, pas dedans).
 *
 * Note (2026-11-17) : l'ancien commentaire interne de la BRDCLIP FA1T
 * (src/lib/products.ts) referencait un AUTRE item AliExpress
 * (1005006825951304) que celui donne ici par Hedi (1005008034684971) --
 * signale dans le rapport, pas corrige seul (peut etre un changement de
 * fournisseur/listing depuis, a confirmer par Hedi).
 */
export const LIENS_ALIEXPRESS_PAR_PRODUIT: Record<string, string> = {
  '8': 'https://fr.aliexpress.com/item/1005008034684971.html', // Tondeuse BRDCLIP FA1T
  '9': 'https://fr.aliexpress.com/item/1005008348243648.html', // Tondeuse Kemei KM-999
}

/** Lien AliExpress pour un id de produit -- null si ce produit n'a pas de lien connu (jamais un lien par defaut invente). */
export function lienAliExpressPour(produitId: string): string | null {
  return LIENS_ALIEXPRESS_PAR_PRODUIT[produitId] ?? null
}

/** "FR" -> "France" (seul pays livrable, voir PAYS_LIVRABLES) -- jamais invente pour un autre code, juste renvoye tel quel. */
function nomPays(code: string | null | undefined): string {
  if (code === 'FR') return 'France'
  return code?.trim() || ''
}

/**
 * Construit le bloc de texte copie dans le presse-papiers depuis l'admin
 * (2026-11-17, demande Hedi) -- pour coller directement dans le formulaire
 * de livraison AliExpress. Fonction PURE (aucun I/O, aucun acces au
 * presse-papiers ici -- voir admin/page.tsx pour navigator.clipboard) afin
 * de rester testable sans navigateur, voir scripts/verif-fournisseur-
 * dropshipping.ts.
 *
 * Ordre EXACT demande par Hedi : nom complet, adresse (ligne 1, ligne 2),
 * code postal, ville, pays, telephone, e-mail, puis produit/coloris/
 * quantite (un par ligne tondeuse de la commande). Telephone/e-mail
 * manquants -> "non renseigné" explicite (jamais une ligne silencieusement
 * absente, pour qu'un trou saute aux yeux plutot que de passer inapercu).
 * La ligne d'adresse 2, elle, est simplement omise si vide (champ
 * optionnel par nature, un "non renseigné" y serait du bruit).
 */
export function construireBlocLivraisonFournisseur(params: {
  shippingAddress: Record<string, unknown> | null | undefined
  email: string | null | undefined
  lignesTondeuse: LigneCommande[]
}): string {
  const sa = (params.shippingAddress ?? {}) as Record<string, unknown>
  const adresse = (sa.address ?? {}) as Record<string, unknown>

  const prenom = typeof sa.prenom === 'string' ? sa.prenom.trim() : ''
  const nomFamille = typeof sa.nom === 'string' ? sa.nom.trim() : ''
  const nomSeul = typeof sa.name === 'string' ? sa.name.trim() : ''
  const nomComplet = (prenom || nomFamille) ? `${prenom} ${nomFamille}`.trim() : nomSeul

  const ligne1 = typeof adresse.line1 === 'string' ? adresse.line1.trim() : ''
  const ligne2 = typeof adresse.line2 === 'string' ? adresse.line2.trim() : ''
  const codePostal = typeof adresse.postal_code === 'string' ? adresse.postal_code.trim() : ''
  const ville = typeof adresse.city === 'string' ? adresse.city.trim() : ''
  const pays = nomPays(typeof adresse.country === 'string' ? adresse.country : null)
  const telephone = typeof sa.phone === 'string' && sa.phone.trim() ? sa.phone.trim() : 'non renseigné'
  const email = typeof params.email === 'string' && params.email.trim() ? params.email.trim() : 'non renseigné'

  const lignesAdresse = [nomComplet, ligne1, ligne2, codePostal, ville, pays].filter((l) => l.trim())

  const articles: ArticleAffiche[] = nomsArticles(params.lignesTondeuse)
  const lignesProduits = articles.length
    ? articles.map((a) => `${a.nom} × ${a.qty}`)
    : ['(aucun article tondeuse trouvé dans cette commande)']

  return [...lignesAdresse, telephone, email, '', ...lignesProduits].join('\n')
}
