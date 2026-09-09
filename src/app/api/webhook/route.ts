import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { MODE_STRIPE, stripe } from '@/lib/stripe'
import { EXPEDITEUR_EMAIL } from '@/lib/email'
import { PRODUCTS } from '@/lib/products'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function echapper(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function idPaiement(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null
}

/**
 * Envoi d'une alerte operationnelle par e-mail, mecanique partagee par les deux
 * cas ci-dessous.
 *
 * Ne leve jamais et ne bloque jamais l'appelant : une alerte qui casse la route
 * serait pire que pas d'alerte. Si la configuration manque, elle le DIT dans le
 * journal plutot que de se taire -- le silence est precisement le defaut que
 * cette fonction existe pour supprimer.
 */
async function envoyerAlerteOperationnelle(
  sujet: string,
  intro: string,
  lignes: [string, string][],
  motifJournal: string,
): Promise<void> {
  const destinataire = process.env.ALERT_EMAIL
  const apiKey = process.env.RESEND_API_KEY

  if (!destinataire || !apiKey) {
    console.error('[webhook] ALERTE NON ENVOYEE (ALERT_EMAIL ou RESEND_API_KEY absent) —', motifJournal)
    return
  }

  const html =
    '<h2>' + echapper(sujet) + '</h2>' +
    '<p>' + intro + '</p><table cellpadding="6">' +
    lignes
      .map(([cle, valeur]) => '<tr><td><b>' + echapper(cle) + '</b></td><td>' + echapper(valeur) + '</td></tr>')
      .join('') +
    '</table>'

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({ from: EXPEDITEUR_EMAIL, to: [destinataire], subject: sujet, html })
  } catch (e) {
    console.error('[webhook] envoi de l alerte impossible:', e instanceof Error ? e.message : String(e))
  }
}

/** Previent qu'un paiement a ete encaisse sans que la commande soit enregistree. */
async function alerterEchecInsertion(
  session: Stripe.Checkout.Session,
  error: { code?: string; message: string },
): Promise<void> {
  await envoyerAlerteOperationnelle(
    'URGENT — paiement encaisse sans commande enregistree',
    'Le webhook Stripe a recu un paiement mais l&rsquo;enregistrement en base a echoue. ' +
      'Stripe va retenter automatiquement. Si toutes les tentatives echouent, la commande ' +
      'devra etre saisie a la main.',
    [
      ['Session', session.id],
      ['Payment intent', idPaiement(session) ?? '(aucun)'],
      ['Montant', ((session.amount_total ?? 0) / 100).toFixed(2) + ' EUR'],
      ['Client', session.customer_details?.email ?? '(inconnu)'],
      ['Erreur', (error.code ? error.code + ' — ' : '') + error.message],
      ['Horodatage', new Date().toISOString()],
    ],
    'paiement encaisse sans commande enregistree, session ' + session.id,
  )
}

/**
 * Previent qu'un paiement a ete encaisse pour une quantite que le stock ne
 * couvrait plus au moment du decrement -- typiquement deux clients qui achetent
 * les derniers exemplaires a quelques secondes d'intervalle. La commande reste
 * enregistree normalement (Stripe a deja encaisse, impossible de revenir
 * dessus) : cette alerte sert a declencher une verification manuelle
 * (reappro, contact fournisseur), pas a bloquer quoi que ce soit.
 */
async function alerterStockInsuffisant(
  session: Stripe.Checkout.Session,
  produitId: string,
  quantite: number,
): Promise<void> {
  await envoyerAlerteOperationnelle(
    'Stock insuffisant apres un paiement — verification manuelle requise',
    'Un paiement a ete encaisse pour une quantite superieure au stock disponible au moment ' +
      'du decrement. La commande est enregistree normalement (Stripe a deja encaisse) : ' +
      'verifiez le reapprovisionnement ou contactez le client si necessaire.',
    [
      ['Session', session.id],
      ['Produit', produitId],
      ['Quantite commandee', String(quantite)],
      ['Client', session.customer_details?.email ?? '(inconnu)'],
      ['Horodatage', new Date().toISOString()],
    ],
    'stock insuffisant au decrement, produit ' + produitId + ', session ' + session.id,
  )
}

export async function POST(req: Request) {
  const body = await req.text()
  const headerStore = await headers()
  const sig = headerStore.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Un secret absent et une signature invalide sont deux pannes OPPOSEES, que
  // l ancienne version confondait en 400. Or 400 dit a Stripe 'ne retente pas' :
  // apres une bascule en live sans avoir pose le nouveau secret, chaque paiement
  // aurait ete encaisse sans qu aucune commande ne soit enregistree, sans reprise
  // et sans alerte -- l insertion n etant jamais atteinte.
  const secretWebhook = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretWebhook) {
    console.error(
      '[webhook] STRIPE_WEBHOOK_SECRET absente : signature invérifiable. On repond 500',
      'pour que Stripe retente, plutot que 400 qui lui ferait abandonner l evenement.',
    )
    return NextResponse.json({ error: 'Webhook non configure' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secretWebhook)
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Un evenement live recu par une cle de test (ou l inverse) signale un cablage
  // croise entre le tableau de bord Stripe et les variables Vercel.
  const modeEvenement = event.livemode ? 'live' : 'test'
  if (modeEvenement !== MODE_STRIPE) {
    console.error(
      '[webhook] INCOHERENCE DE MODE : evenement ' + modeEvenement +
        ' recu alors que la cle Stripe est en mode ' + MODE_STRIPE + '.',
    )
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    let parsedItems: unknown[] = []
    try {
      parsedItems = JSON.parse(session.metadata?.items ?? '[]')
    } catch {}

    const shippingInfo = session.collected_information?.shipping_details ?? null
    const shipping = shippingInfo
      ? { name: shippingInfo.name, address: shippingInfo.address }
      : (session.customer_details?.address ?? null)

    const paymentIntentId = idPaiement(session)

    if (paymentIntentId === null) {
      // L'index unique orders_stripe_payment_intent_id_key est PARTIEL
      // (WHERE stripe_payment_intent_id IS NOT NULL) : sans payment intent, rien
      // n'empeche une redelivrance Stripe de creer un second enregistrement.
      console.warn('[webhook] session sans payment_intent, doublon possible:', session.id)
    }

    const { error } = await supabaseAdmin.from('orders').insert({
      email: session.customer_details?.email ?? '',
      items: parsedItems,
      total: session.amount_total ?? 0,
      status: 'paid',
      stripe_payment_intent_id: paymentIntentId,
      shipping_address: shipping,
      created_at: new Date().toISOString(),
    })

    if (error) {
      // 23505 = violation d'unicite. L'index partiel a mordu : ce paiement est
      // deja enregistre. C'est un succes, pas une panne -- repondre autre chose
      // que 2xx ferait retenter Stripe en boucle sur un evenement deja traite.
      if (error.code === '23505') {
        console.log('[webhook] evenement deja enregistre, ignore:', session.id)
        return NextResponse.json({ received: true, duplicate: true })
      }

      // Tout le reste est une vraie panne. Le 500 est ce qui declenche la
      // reprise cote Stripe ; sans lui, le paiement est encaisse et la commande
      // perdue sans que personne ne l'apprenne.
      console.error('[webhook] echec insertion orders:', error.code, error.message)
      await alerterEchecInsertion(session, error)
      return NextResponse.json({ error: 'enregistrement impossible' }, { status: 500 })
    }

    // Decrement du stock -- on n'atteint ce point que sur un enregistrement
    // FRAIS : les deux branches ci-dessus (doublon 23505, echec reel) sont
    // deja revenues plus tot. Jamais deux fois pour le meme paiement.
    for (const brut of parsedItems) {
      const ligne = brut as { id?: unknown; variantId?: unknown; qty?: unknown }
      const produitId = typeof ligne.id === 'string' ? ligne.id : null
      const quantite = typeof ligne.qty === 'number' && Number.isInteger(ligne.qty) && ligne.qty > 0
        ? ligne.qty
        : null
      if (!produitId || !quantite) continue

      const base = PRODUCTS.find((p) => p.id === produitId)
      if (!base) continue

      // Dropshipping (aujourd'hui : la Tondeuse Fade Pro, seule a porter des
      // variantes) est HORS de ce systeme -- le fournisseur gere son propre
      // stock, decision actee separement de ce correctif.
      if (base.is_dropshipping) continue

      const { data: nouveauStock, error: erreurStock } = await supabaseAdmin.rpc('decrementer_stock', {
        p_id: produitId,
        p_quantite: quantite,
        p_stock_par_defaut: base.stock,
      })

      if (erreurStock) {
        // Incident d'infrastructure sur le decrement, pas un probleme de stock
        // -- la commande reste valide, on le journalise pour investigation.
        console.error('[webhook] decrement de stock impossible pour', produitId, ':', erreurStock.message)
        continue
      }
      if (nouveauStock === null) {
        console.warn(
          '[webhook] stock insuffisant au decrement pour', produitId,
          '(qte', quantite, ') -- commande conservee, alerte envoyee',
        )
        await alerterStockInsuffisant(session, produitId, quantite)
      }
    }
  }

  return NextResponse.json({ received: true })
}
