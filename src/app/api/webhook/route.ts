import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { MODE_STRIPE, stripe } from '@/lib/stripe'

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
 * Previent qu'un paiement a ete encaisse sans que la commande soit enregistree.
 *
 * Ne leve jamais et ne bloque jamais la reponse : une alerte qui casse la route
 * serait pire que pas d'alerte. Si la configuration manque, elle le DIT dans le
 * journal plutot que de se taire -- le silence est precisement le defaut que
 * cette fonction existe pour supprimer.
 */
async function alerterEchec(
  session: Stripe.Checkout.Session,
  error: { code?: string; message: string },
): Promise<void> {
  const destinataire = process.env.ALERT_EMAIL
  const apiKey = process.env.RESEND_API_KEY

  if (!destinataire || !apiKey) {
    console.error(
      '[webhook] ALERTE NON ENVOYEE (ALERT_EMAIL ou RESEND_API_KEY absent) —',
      'paiement encaisse sans commande enregistree, session',
      session.id,
    )
    return
  }

  const lignes: [string, string][] = [
    ['Session', session.id],
    ['Payment intent', idPaiement(session) ?? '(aucun)'],
    ['Montant', ((session.amount_total ?? 0) / 100).toFixed(2) + ' EUR'],
    ['Client', session.customer_details?.email ?? '(inconnu)'],
    ['Erreur', (error.code ? error.code + ' — ' : '') + error.message],
    ['Horodatage', new Date().toISOString()],
  ]

  const html =
    '<h2>Paiement encaisse sans commande enregistree</h2>' +
    '<p>Le webhook Stripe a recu un paiement mais l&rsquo;enregistrement en base a echoue. ' +
    'Stripe va retenter automatiquement. Si toutes les tentatives echouent, la commande ' +
    'devra etre saisie a la main.</p><table cellpadding="6">' +
    lignes
      .map(([cle, valeur]) => '<tr><td><b>' + echapper(cle) + '</b></td><td>' + echapper(valeur) + '</td></tr>')
      .join('') +
    '</table>'

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: 'SP Barber <noreply@spbarber.fr>',
      to: [destinataire],
      subject: 'URGENT — paiement encaisse sans commande enregistree',
      html,
    })
  } catch (e) {
    console.error('[webhook] envoi de l alerte impossible:', e instanceof Error ? e.message : String(e))
  }
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
      await alerterEchec(session, error)
      return NextResponse.json({ error: 'enregistrement impossible' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
