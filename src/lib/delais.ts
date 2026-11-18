/**
 * Donnee centrale des delais annonces au client (demande Hedi, 2026-11-18) --
 * toute formule qui mentionne un delai d'expedition ou de retour doit
 * interpoler ces constantes plutot que re-ecrire le chiffre a la main.
 *
 * Distinction volontairement maintenue avec le delai de LIVRAISON
 * (preparation + transport, ex. "3-5 jours", gere separement dans
 * site_content.trust_livraison, deja correct) : ici, uniquement le delai
 * d'EXPEDITION (preparation seule) et le delai de RETOUR.
 */
export const EXPEDITION_JOURS_OUVRES = 2
/** Fragment interpolable dans une phrase existante ("...expédiées {fragment}."). */
export const DELAI_EXPEDITION_FRAGMENT = `sous ${EXPEDITION_JOURS_OUVRES} jours ouvrés`
export const EXPEDITION_TEXTE = `Expédié ${DELAI_EXPEDITION_FRAGMENT}`

export const RETOUR_JOURS = 14
export const RETOUR_TEXTE = `Retour ${RETOUR_JOURS} jours`
