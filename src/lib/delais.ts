/**
 * Donnee centrale des delais annonces au client (demande Hedi, 2026-11-18) --
 * toute formule qui mentionne un delai d'expedition, de transport ou de
 * retour doit interpoler ces constantes plutot que re-ecrire le chiffre a
 * la main.
 *
 * Trois delais distincts, a ne jamais fusionner dans le texte visible :
 *   - EXPEDITION (preparation seule, cote SP Barber) ;
 *   - TRANSIT (transport seul, cote transporteur, une fois le colis remis) ;
 *   - RETOUR (droit de retractation legal).
 * Les tondeuses (dropshipping manuel) ont leur propre delai global "sous 2
 * semaines", distinct de ces trois constantes -- voir
 * site_content.tondeuse_delai_livraison.
 */
export const EXPEDITION_JOURS_OUVRES = 2
/** Fragment interpolable dans une phrase existante ("...expédiées {fragment}."). */
export const DELAI_EXPEDITION_FRAGMENT = `sous ${EXPEDITION_JOURS_OUVRES} jours ouvrés`
export const EXPEDITION_TEXTE = `Expédié ${DELAI_EXPEDITION_FRAGMENT}`

export const TRANSIT_JOURS_MIN = 3
export const TRANSIT_JOURS_MAX = 5
/** Forme compacte, pour un badge ou une liste ("Livraison {fragment}"). */
export const TRANSIT_TEXTE_COMPACT = `${TRANSIT_JOURS_MIN}-${TRANSIT_JOURS_MAX} jours ouvrés`
/** Forme en prose, pour une phrase complete ("livrée en {fragment}"). */
export const TRANSIT_TEXTE_PROSE = `${TRANSIT_JOURS_MIN} à ${TRANSIT_JOURS_MAX} jours ouvrés`

export const RETOUR_JOURS = 14
export const RETOUR_TEXTE = `Retour ${RETOUR_JOURS} jours`
