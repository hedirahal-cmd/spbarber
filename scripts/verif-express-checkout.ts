/**
 * Banc de verification du paiement express (Apple Pay / Google Pay) -- point 1
 * du lot "parcours d'achat" (2026-10-01, decision Hedi).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-express-checkout.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — Supabase est un faux PostgREST local (meme pre-verification que
 * les autres bancs). Stripe, lui, est REELLEMENT appele en mode TEST : comme
 * verif-stock.ts pour /api/stripe/checkout, STRIPE_SECRET_KEY n'est PAS
 * ecrasee, Next charge donc la vraie cle de test depuis .env.local. Une cle
 * live serait de toute facon refusee par src/lib/stripe.ts (STRIPE_AUTORISER_LIVE).
 *
 * CE QUE CE BANC NE PROUVE PAS : le comportement reel d'Apple Pay / Google Pay
 * dans un navigateur (canMakePayment(), la feuille de paiement native). Aucun
 * environnement de ce banc ne peut l'emuler -- navigateur reel + compte
 * Apple/Google Pay configure requis, hors de portee d'un banc automatise.
 * Ce banc verifie ce qu'il peut reellement observer : le calcul du montant
 * cote serveur (meme pricing.ts que le panier classique), la mise a jour du
 * PaymentIntent avant confirmation, et l'enregistrement de la commande par le
 * webhook -- strictement ce qui se passe UNE FOIS que le navigateur a renvoye
 * un paymentMethod, pas la feuille elle-meme.
 *
 * Eprouve pour echouer : en retirant le garde-fou metadata.source dans
 * src/app/api/webhook/route.ts, le cas 6 passe au rouge (double insertion).
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { readFileSync } from 'node:fs'
import { demarrerServeur } from './banc-serveur'
import Stripe from 'stripe'

const PORT_NEXT = 3114
const SECRET_WEBHOOK = 'whsec_banc_express'

/**
 * Lit STRIPE_SECRET_KEY depuis .env.local -- ce script (contrairement au
 * serveur Next qu'il demarre) n'est pas charge par le mecanisme de Next, donc
 * process.env ne la contient pas par defaut. Necessaire uniquement pour la
 * verification du cas 4 ci-dessous (lecture directe aupres de Stripe, par la
 * meme cle que le serveur utilise reellement).
 */
function cleStripeDepuisEnvLocal(): string {
  try {
    const contenu = readFileSync('.env.local', 'utf-8')
    const ligne = contenu.split('\n').find((l) => l.startsWith('STRIPE_SECRET_KEY='))
    return ligne ? ligne.slice('STRIPE_SECRET_KEY='.length).trim() : 'sk_test_bidon'
  } catch {
    return 'sk_test_bidon'
  }
}

let ok = 0
let ko = 0
function verifie(nom: string, attendu: unknown, obtenu: unknown) {
  const a = JSON.stringify(attendu)
  const o = JSON.stringify(obtenu)
  if (a === o) {
    ok++
    console.log('  OK    ' + nom + '  => ' + o)
  } else {
    ko++
    console.log('  ECHEC ' + nom + '\n        attendu ' + a + '\n        obtenu  ' + o)
  }
}

const recu: { chemin: string; corps: string }[] = []
const appelsRpc: { id: string; quantite: number }[] = []

// Cire Cheveux Premium (id 1), prix statique 2490 -- force actif:true via
// l'override, independamment de son statut reel en production (voir
// verif-stock.ts, meme technique).
const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const chemin = req.url ?? ''
    recu.push({ chemin, corps })

    if (req.method === 'GET' && chemin.includes('/product_overrides')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify([{ id: '1', name: null, price: null, description: null, stock: null, benefit: null, images: null, actif: true }]))
      return
    }
    if (req.method === 'POST' && chemin.includes('/rpc/decrementer_stock')) {
      const { p_id, p_quantite } = JSON.parse(corps || '{}')
      appelsRpc.push({ id: p_id, quantite: p_quantite })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(49)) // peu importe la valeur : seul l'appel compte ici.
      return
    }
    if (req.method === 'POST' && chemin.includes('/orders')) {
      res.writeHead(201, { 'Content-Type': 'application/json' })
      res.end('[]')
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('[]')
  })
})

const base = () => 'http://127.0.0.1:' + PORT_NEXT

async function creerPaymentIntent(body: Record<string, unknown>) {
  const r = await fetch(base() + '/api/stripe/payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { statut: r.status, corps: (await r.json()) as Record<string, unknown> }
}

async function patchPaymentIntent(body: Record<string, unknown>) {
  const r = await fetch(base() + '/api/stripe/payment-intent', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { statut: r.status, corps: (await r.json()) as Record<string, unknown> }
}

const stripeVerif = new Stripe(cleStripeDepuisEnvLocal(), { apiVersion: '2026-05-27.dahlia' })

function evenementPaymentIntent(pi: Record<string, unknown>) {
  return JSON.stringify({
    id: 'evt_express_' + Math.random().toString(36).slice(2, 10),
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: Math.floor(Date.now() / 1000),
    type: 'payment_intent.succeeded',
    livemode: false,
    data: { object: pi },
  })
}

async function envoyerWebhook(pi: Record<string, unknown>): Promise<number> {
  const charge = evenementPaymentIntent(pi)
  const sig = stripeVerif.webhooks.generateTestHeaderString({ payload: charge, secret: SECRET_WEBHOOK })
  const r = await fetch(base() + '/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
    body: charge,
  })
  return r.status
}

async function main() {
  await new Promise<void>((r) => faux.listen(0, '127.0.0.1', r))
  const portFaux = (faux.address() as AddressInfo).port
  console.log('  faux PostgREST sur 127.0.0.1:' + portFaux)

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portFaux,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    // STRIPE_SECRET_KEY volontairement PAS ecrasee : /api/stripe/payment-intent
    // appelle reellement l'API Stripe (voir en-tete). STRIPE_AUTORISER_LIVE
    // non posee : une cle live serait refusee avant le moindre appel.
    STRIPE_WEBHOOK_SECRET: SECRET_WEBHOOK,
    ALERT_EMAIL: '',
    RESEND_API_KEY: '',
  }

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter()
    faux.close()
    process.exitCode = 1
    return
  }
  const arreter = demarrage.arreter

  // ---- PRE-VERIFICATION ----
  console.log('\n--- 0. Pre-verification : le trafic Supabase va-t-il au faux serveur ? ---')
  recu.length = 0
  await fetch(base() + '/products').catch(() => {})
  const detourne = recu.some((r) => r.chemin.includes('product_overrides'))
  if (!detourne) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete product_overrides.')
    console.log('  Les variables d environnement n ont PAS ete substituees — ce banc')
    console.log('  risquerait de creer de vrais PaymentIntents sans protection. Abandon.')
    arreter()
    process.exit(1)
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- 1. Montant calcule sous le seuil de livraison offerte ---')
  const r1 = await creerPaymentIntent({ productId: '1', quantity: 1 })
  verifie('=> 200', 200, r1.statut)
  verifie('montant = prix + frais de port (2490 + 590)', 3080, r1.corps.amount)
  verifie('clientSecret present', true, typeof r1.corps.clientSecret === 'string')
  const piId1 = r1.corps.paymentIntentId as string

  console.log('\n--- 2. Montant calcule au-dessus du seuil (livraison offerte) ---')
  const r2 = await creerPaymentIntent({ productId: '1', quantity: 3 })
  verifie('=> 200', 200, r2.statut)
  verifie('montant = 3 x prix, sans frais de port (7470)', 7470, r2.corps.amount)

  console.log('\n--- 3. Produit inconnu : paiement refuse, pas de PaymentIntent cree ---')
  const r3 = await creerPaymentIntent({ productId: 'inexistant', quantity: 1 })
  verifie('=> 400', 400, r3.statut)
  verifie('aucun clientSecret', undefined, r3.corps.clientSecret)

  console.log('\n--- 4. Mise a jour adresse/e-mail avant confirmation ---')
  const r4 = await patchPaymentIntent({
    paymentIntentId: piId1,
    email: 'expresscheckout@exemple.test',
    shipping: { name: 'Client Test', address: { line1: '1 rue du Test', city: 'Fougeres', postal_code: '35300', country: 'FR' } },
  })
  verifie('=> 200', 200, r4.statut)
  // Verifie reellement cote Stripe (vraie cle test) que la mise a jour a pris.
  const piVerif = await stripeVerif.paymentIntents.retrieve(piId1)
  verifie('e-mail enregistre sur le PaymentIntent', 'expresscheckout@exemple.test', piVerif.receipt_email)
  verifie('ville de livraison enregistree', 'Fougeres', piVerif.shipping?.address?.city)

  console.log('\n--- 5. Webhook : paiement express reussi => commande enregistree ---')
  recu.length = 0
  appelsRpc.length = 0
  const statut5 = await envoyerWebhook({
    id: 'pi_test_express_' + Math.random().toString(36).slice(2, 10),
    object: 'payment_intent',
    amount: 3080,
    receipt_email: 'client-express@exemple.test',
    shipping: { name: 'Client Express', address: { line1: '2 rue X', city: 'Fougeres', postal_code: '35300', country: 'FR' }, carrier: null, phone: null, tracking_number: null },
    metadata: { source: 'express_checkout', items: JSON.stringify([{ id: '1', qty: 1 }]) },
  })
  verifie('=> 200', 200, statut5)
  const insertion5 = recu.find((r) => r.chemin.includes('/orders'))
  verifie('une insertion a eu lieu', true, insertion5 !== undefined)
  if (insertion5) {
    const brut = JSON.parse(insertion5.corps)
    const ligne = Array.isArray(brut) ? brut[0] : brut
    verifie('montant = amount du PaymentIntent', 3080, ligne.total)
    verifie('email client', 'client-express@exemple.test', ligne.email)
    verifie('statut', 'paid', ligne.status)
    verifie('adresse de livraison presente', 'Fougeres', ligne.shipping_address?.address?.city)
  }
  verifie('le stock a bien ete decremente (produit 1, qte 1)', [{ id: '1', quantite: 1 }], appelsRpc)

  console.log('\n--- 6. Webhook : PaymentIntent d une Checkout Session classique => ignore ---')
  // Sans metadata.source -- exactement ce qu une Checkout Session laisse sur
  // SON PaymentIntent sous-jacent (jamais pose par /api/stripe/checkout).
  // Sans ce garde-fou, CHAQUE achat panier classique serait traite deux fois.
  recu.length = 0
  const statut6 = await envoyerWebhook({
    id: 'pi_test_classique_' + Math.random().toString(36).slice(2, 10),
    object: 'payment_intent',
    amount: 2980,
    receipt_email: 'autre@exemple.test',
    shipping: null,
    metadata: {},
  })
  verifie('=> 200', 200, statut6)
  verifie('aucune insertion (deja traite par checkout.session.completed)', undefined, recu.find((r) => r.chemin.includes('/orders')))

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')

  arreter()
  faux.close()
  process.exitCode = ko > 0 ? 1 : 0
}

main()
