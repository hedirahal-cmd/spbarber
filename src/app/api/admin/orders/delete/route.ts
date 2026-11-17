import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'
import { stripe } from '@/lib/stripe'

const MESSAGE_COMMANDE_REELLE = 'Les commandes réelles ne peuvent pas être supprimées : utilise Annuler.'

/** Vrai uniquement si stripe_payment_intent_id existe ET que Stripe le confirme en mode test (livemode === false) -- jamais suppose, toujours verifie en direct. */
async function estCommandeDeTest(stripePaymentIntentId: string | null): Promise<boolean> {
  if (!stripePaymentIntentId) return false
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId)
    return paymentIntent.livemode === false
  } catch (e) {
    console.error('[admin orders delete] lecture Stripe impossible pour', stripePaymentIntentId, ':', e instanceof Error ? e.message : String(e))
    return false
  }
}

/**
 * Lecture seule (2026-11-17) : indique si une commande EST supprimable,
 * sans rien supprimer -- utilisee par l'admin pour afficher le bouton actif
 * ou grise avant meme que Hedi ne clique (voir admin/page.tsx). Le POST
 * ci-dessous reverifie de toute facon tout cote serveur au moment du clic
 * -- cette route GET n'est qu'un apercu, jamais la source de verite finale.
 */
export async function GET(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('stripe_payment_intent_id, boxtal_order_id')
    .eq('id', id)
    .single()
  if (fetchErr || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  if (order.boxtal_order_id) {
    return NextResponse.json({ supprimable: false, raison: "Annule d'abord l'étiquette Boxtal." })
  }
  if (!(await estCommandeDeTest(order.stripe_payment_intent_id))) {
    return NextResponse.json({ supprimable: false, raison: MESSAGE_COMMANDE_REELLE })
  }
  return NextResponse.json({ supprimable: true })
}

/**
 * Supprime DEFINITIVEMENT une commande -- route dediee, distincte de la
 * mise a jour generique /api/admin/orders (2026-11-17, demande Hedi).
 * Garde-fous, TOUS cote serveur (jamais confiance au bouton cote client,
 * qui peut deja masquer/griser le bouton -- voir admin/page.tsx) :
 *
 *   1. Etiquette Boxtal active (boxtal_order_id non vide) => refusee.
 *      Annuler d'abord l'etiquette evite une commande supprimee alors
 *      qu'un vrai colis/une vraie facturation Boxtal existe encore.
 *   2. Commande de TEST uniquement -- determine en interrogeant Stripe en
 *      DIRECT (stripe.paymentIntents.retrieve(...).livemode), pas un
 *      prefixe local : ce projet ne stocke que stripe_payment_intent_id
 *      (pi_..., qui ne porte JAMAIS de marqueur test/live dans l'id lui-
 *      meme, contrairement aux id de Checkout Session cs_test_/cs_live_
 *      qui ne sont pas stockes ici) -- verifie en direct avec Hedi le
 *      2026-11-17, aucune colonne stripe_session_id n'existe dans ce
 *      schema. Sans stripe_payment_intent_id du tout : refusee aussi (rien
 *      a verifier cote Stripe => jamais suppose test par defaut).
 *
 * Aucune autre table ne reference orders par cle etrangere (verifie en
 * direct sur le schema reel, 2026-11-17) -- seule la ligne de `orders`
 * elle-meme est supprimee. retraction_requests.numero_commande est un
 * champ texte libre (reference humaine tapee par le client), pas une cle
 * etrangere : rien a nettoyer la, une suppression ne peut pas l'orpheliner
 * au sens referentiel.
 */
export async function POST(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, stripe_payment_intent_id, boxtal_order_id')
    .eq('id', id)
    .single()
  if (fetchErr || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  if (order.boxtal_order_id) {
    return NextResponse.json({ error: "Annule d'abord l'étiquette Boxtal." }, { status: 400 })
  }

  if (!(await estCommandeDeTest(order.stripe_payment_intent_id))) {
    return NextResponse.json({ error: MESSAGE_COMMANDE_REELLE }, { status: 403 })
  }

  const { error: deleteErr } = await supabase.from('orders').delete().eq('id', id)
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

  // Journalisation obligatoire (2026-11-17, demande Hedi) -- id + date, a
  // chaque suppression reellement effectuee.
  console.log('[admin orders delete] commande supprimée :', id, '--', new Date().toISOString())

  return NextResponse.json({ ok: true })
}
