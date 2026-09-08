import Stripe from 'stripe'

export type ModeStripe = 'test' | 'live' | 'inconnu'

/**
 * Client Stripe, et garde-fou sur le mode.
 *
 * UNE SEULE variable de cle : STRIPE_SECRET_KEY. L'ancienne version lisait
 * `STRIPE_SECRET_KEY_TEST ?? STRIPE_SECRET_KEY`, une precedence qui rendait la
 * bascule en live impossible tant qu'une cle de test tramait quelque part --
 * ajouter une cle live ne suffisait pas, elle etait ignoree en silence.
 *
 * Le mode n'est donc plus un choix de precedence : il se LIT sur le prefixe de la
 * cle, qui ne peut pas mentir, et il est journalise au demarrage.
 *
 * GARDE-FOU : une cle live n'est acceptee que si STRIPE_AUTORISER_LIVE vaut
 * "oui". Un copier-coller malheureux de cle live ne peut donc pas, a lui seul,
 * mettre la boutique en encaissement reel : il faut deux gestes deliberes.
 */

const CLE = (process.env.STRIPE_SECRET_KEY ?? '').trim()
const LIVE_AUTORISE = process.env.STRIPE_AUTORISER_LIVE === 'oui'

function detecterMode(cle: string): ModeStripe {
  if (/^(sk|rk)_live_/.test(cle)) return 'live'
  if (/^(sk|rk)_test_/.test(cle)) return 'test'
  return 'inconnu'
}

/** Mode reellement actif, deduit du prefixe de la cle. */
export const MODE_STRIPE: ModeStripe = detecterMode(CLE)

/**
 * Rend la raison pour laquelle Stripe ne doit pas etre utilise, ou null si tout
 * va bien. A appeler AVANT toute creation de session de paiement.
 */
export function problemeConfigurationStripe(): string | null {
  if (!CLE) {
    return 'STRIPE_SECRET_KEY absente : aucun paiement possible.'
  }
  if (MODE_STRIPE === 'inconnu') {
    return 'STRIPE_SECRET_KEY ne commence ni par sk_test_/rk_test_ ni par sk_live_/rk_live_ : mode indeterminable, paiement refuse.'
  }
  if (MODE_STRIPE === 'live' && !LIVE_AUTORISE) {
    return 'cle LIVE detectee sans STRIPE_AUTORISER_LIVE=oui : paiement refuse par securite. Si le passage en encaissement reel est voulu, poser explicitement cette variable.'
  }
  return null
}

const PROBLEME = problemeConfigurationStripe()
if (PROBLEME) {
  console.error('[Stripe] ' + PROBLEME)
} else {
  console.log('[Stripe] mode actif : ' + MODE_STRIPE)
}

/**
 * Le SDK refuse une cle vide et ferait echouer l'import de ce module -- donc le
 * rendu de /commande-confirmee, qui l'importe. On construit avec un jeton inerte
 * quand la configuration manque : aucune requete ne partira, les appelants
 * consultant problemeConfigurationStripe() avant d'agir.
 */
export const stripe = new Stripe(CLE || 'sk_test_configuration_absente', {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
})
