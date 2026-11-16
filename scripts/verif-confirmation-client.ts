/**
 * Banc de verification de l'e-mail de confirmation de commande au CLIENT
 * (2026-11-16, demande Hedi -- jamais code jusque-la malgre la promesse
 * affichee sur /commande-confirmee, voir webhook/route.ts).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-confirmation-client.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — AUCUN appel reel a Resend ni a Supabase. Un faux serveur HTTP
 * local tient lieu de Resend (toutes les requetes POST /emails interceptees,
 * voir fauxResend) via RESEND_BASE_URL -- une variable officiellement
 * supportee par le SDK resend (node_modules/resend/dist/index.mjs,
 * getDefaultBaseUrl), jamais documentee a Hedi, meme principe que
 * BOXTAL_API_BASE_URL. Un autre faux serveur tient lieu de Supabase (meme
 * pre-verification que les autres bancs).
 *
 * CE QUE CE BANC NE PROUVE PAS : que Resend delivre reellement l'e-mail une
 * fois accepte (deliverabilite, domaine verifie...) -- uniquement que notre
 * code envoie la bonne requete, avec le bon contenu, et reagit correctement
 * si Resend la refuse.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import Stripe from 'stripe'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3117
const STRIPE_WEBHOOK_SECRET = 'whsec_banc_confirmation_client'
const EMAIL_CLIENT = 'hedi-client-test@exemple.test'
const EMAIL_ALERTE = 'alerte@exemple.test'
const EMAIL_EQUIPE = 'equipe@exemple.test'

let ok = 0
let ko = 0
function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) { ok++; console.log('  OK    ' + nom) }
  else { ko++; console.log('  ECHEC ' + nom + (detail ? '\n        ' + detail : '')) }
}

// ───── Faux Supabase (PostgREST) ─────
type OrderRow = Record<string, unknown>
let orders: OrderRow[] = []
const recuSupabase: { methode: string; chemin: string }[] = []
/** Reproduit l'index unique reel orders_stripe_payment_intent_id_key (partiel, WHERE stripe_payment_intent_id IS NOT NULL) -- pour tester le rejeu Stripe (cas C). */
const paymentIntentsDejaInseres = new Set<string>()

const fauxSupabase = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recuSupabase.push({ methode: req.method ?? '', chemin: u.pathname + u.search })

    if (u.pathname.includes('/product_overrides')) {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return
    }
    if (u.pathname.includes('/rpc/decrementer_stock')) {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('49'); return
    }
    if (u.pathname.includes('/orders')) {
      if (req.method === 'POST') {
        const parsed = JSON.parse(corps || '{}')
        const lignes = Array.isArray(parsed) ? parsed : [parsed]
        const pi = typeof lignes[0]?.stripe_payment_intent_id === 'string' ? lignes[0].stripe_payment_intent_id : null
        if (pi && paymentIntentsDejaInseres.has(pi)) {
          res.writeHead(409, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            code: '23505',
            message: 'duplicate key value violates unique constraint "orders_stripe_payment_intent_id_key"',
            details: null,
            hint: null,
          }))
          return
        }
        if (pi) paymentIntentsDejaInseres.add(pi)
        for (const l of lignes) orders.push({ id: 'order-' + (orders.length + 1), ...l })
        const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(objetUnique ? orders[orders.length - 1] : [orders[orders.length - 1]]))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]')
  })
})

// ───── Faux Resend ─────
type RequeteResend = { to: string[]; from: string; reply_to?: string; subject: string; html: string }
let requetesResend: RequeteResend[] = []
/** Les requetes adressees a une adresse de cette liste echouent (400, comme un vrai refus Resend) -- permet de simuler l'echec d'UN SEUL destinataire sans affecter les autres. */
let adressesEnEchec: string[] = []

const fauxResend = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const payload = JSON.parse(corps || '{}') as RequeteResend
    requetesResend.push(payload)
    const echoue = payload.to?.some((t) => adressesEnEchec.includes(t))
    if (echoue) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ name: 'validation_error', message: 'Domaine non vérifié (simulation de banc).' }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ id: 'email-test-' + Math.random().toString(36).slice(2, 10) }))
  })
})

const base = () => 'http://127.0.0.1:' + PORT_NEXT
const stripeVerif = new Stripe('sk_test_bidon', { apiVersion: '2026-05-27.dahlia' })

function evenementCheckoutComplete(): string {
  return JSON.stringify({
    id: 'evt_cc_' + Math.random().toString(36).slice(2, 10),
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    livemode: false,
    data: {
      object: {
        id: 'cs_test_cc_' + Math.random().toString(36).slice(2, 10),
        object: 'checkout.session',
        payment_intent: 'pi_test_cc_' + Math.random().toString(36).slice(2, 10),
        amount_total: 3480,
        currency: 'eur',
        livemode: false,
        customer_details: { email: EMAIL_CLIENT, address: null, phone: '+33612345678', name: 'Hedi Client' },
        collected_information: {
          shipping_details: {
            name: 'Hedi Client',
            address: { line1: '1 rue du Test', line2: null, city: 'Fougères', postal_code: '35300', country: 'FR' },
          },
        },
        custom_fields: [{ key: 'prenom', text: { value: 'Hedi' } }, { key: 'nom', text: { value: 'Client' } }],
        metadata: { items: JSON.stringify([{ id: '2', qty: 1 }, { id: '4', qty: 1 }]) },
      },
    },
  })
}

async function envoyerWebhookStripe(charge: string): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const sig = stripeVerif.webhooks.generateTestHeaderString({ payload: charge, secret: STRIPE_WEBHOOK_SECRET })
  const r = await fetch(base() + '/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': sig }, body: charge })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

async function main() {
  await new Promise<void>((r) => fauxSupabase.listen(0, '127.0.0.1', r))
  const portSupabase = (fauxSupabase.address() as AddressInfo).port
  await new Promise<void>((r) => fauxResend.listen(0, '127.0.0.1', r))
  const portResend = (fauxResend.address() as AddressInfo).port
  console.log('  faux PostgREST sur 127.0.0.1:' + portSupabase)
  console.log('  faux Resend sur 127.0.0.1:' + portResend)

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portSupabase,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    STRIPE_WEBHOOK_SECRET,
    RESEND_BASE_URL: 'http://127.0.0.1:' + portResend,
    RESEND_API_KEY: 'test-key',
    ALERT_EMAIL: EMAIL_ALERTE,
    NOTIF_EQUIPE_EMAIL: EMAIL_EQUIPE,
    NEXT_PUBLIC_SITE_URL: 'https://spbarber.fr',
  }

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter(); fauxSupabase.close(); fauxResend.close(); process.exitCode = 1; return
  }
  const arreter = demarrage.arreter

  console.log('\n--- 0. Pre-verification : Supabase est-il detourne ? ---')
  await fetch(base() + '/products').catch(() => {})
  if (!recuSupabase.some((r) => r.chemin.includes('product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete. Abandon.')
    arreter(); fauxSupabase.close(); fauxResend.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- A. Commande normale : confirmation CLIENT envoyée, avec le bon contenu ---')
  orders = []
  requetesResend = []
  adressesEnEchec = []
  const a = await envoyerWebhookStripe(evenementCheckoutComplete())
  verifie('=> 200', a.statut === 200, 'obtenu ' + a.statut + ' ' + JSON.stringify(a.corps))
  verifie('commande enregistrée', orders.length === 1, JSON.stringify(orders))

  const emailClient = requetesResend.find((r) => r.to?.includes(EMAIL_CLIENT))
  verifie('un e-mail a bien été envoyé au CLIENT (jamais le cas avant ce correctif)', !!emailClient, JSON.stringify(requetesResend.map((r) => r.to)))
  if (emailClient) {
    const html = emailClient.html
    verifie('expéditeur = même adresse que les e-mails équipe', emailClient.from === 'SP Barber <noreply@send.spbarber.fr>', emailClient.from)
    verifie('reply-to = la vraie adresse de contact (l\'expéditeur est "noreply")', emailClient.reply_to === 'spbarbershopexploitation@hotmail.com', emailClient.reply_to)
    verifie('récapitulatif : contient les articles commandés', html.includes('Shampooing Noir Colorant') && html.includes('Peigne Texture Expert'))
    verifie('adresse de livraison présente', html.includes('35300') && html.includes('Fougères'))
    verifie('montant présent (34,80 €)', html.includes('34,80'))
    verifie('délai de préparation (2 jours ouvrés) présent', html.includes('2 jours ouvrés'))
    verifie('lien "Voir ma commande" : domaine NEXT_PUBLIC_SITE_URL (jamais vercel.app), bon session_id', html.includes('https://spbarber.fr/commande-confirmee?session_id='))
    verifie('coordonnées du support présentes (adresse réelle des textes légaux)', html.includes('spbarbershopexploitation@hotmail.com'))
    verifie('lien vers les CGV présent', html.includes('/cgv'))
  }

  const emailEquipe = requetesResend.find((r) => r.to?.includes(EMAIL_EQUIPE))
  verifie('la notification équipe (déjà existante) part toujours en plus', !!emailEquipe)

  console.log('\n--- B. Échec Resend pour le CLIENT uniquement : commande TOUJOURS enregistrée, alerte équipe déclenchée ---')
  orders = []
  requetesResend = []
  adressesEnEchec = [EMAIL_CLIENT]
  const b = await envoyerWebhookStripe(evenementCheckoutComplete())
  verifie('=> 200 (la commande n\'est jamais bloquée par un échec d\'e-mail)', b.statut === 200, 'obtenu ' + b.statut + ' ' + JSON.stringify(b.corps))
  verifie('commande toujours enregistrée malgré l\'échec Resend', orders.length === 1, JSON.stringify(orders))

  const alerte = requetesResend.find((r) => r.to?.includes(EMAIL_ALERTE))
  verifie('l\'échec déclenche bien l\'alerte équipe (ALERT_EMAIL)', !!alerte, JSON.stringify(requetesResend.map((r) => r.to)))
  if (alerte) verifie('l\'alerte mentionne la référence de la commande', alerte.html.includes('order-1'))

  const equipeMalgreEchec = requetesResend.find((r) => r.to?.includes(EMAIL_EQUIPE))
  verifie('la notification équipe part quand même (indépendante de l\'échec client)', !!equipeMalgreEchec)

  console.log('\n--- B2. Échec Resend pour l\'ÉQUIPE uniquement : commande toujours enregistrée, alerte déclenchée, confirmation CLIENT quand même envoyée ---')
  orders = []
  requetesResend = []
  adressesEnEchec = [EMAIL_EQUIPE]
  const b2 = await envoyerWebhookStripe(evenementCheckoutComplete())
  verifie('=> 200', b2.statut === 200, 'obtenu ' + b2.statut + ' ' + JSON.stringify(b2.corps))
  verifie('commande enregistrée', orders.length === 1)
  const alerteEquipe = requetesResend.find((r) => r.to?.includes(EMAIL_ALERTE))
  verifie('l\'échec de la notification équipe déclenche l\'alerte (ALERT_EMAIL)', !!alerteEquipe, JSON.stringify(requetesResend.map((r) => r.to)))
  const clientMalgreEchecEquipe = requetesResend.find((r) => r.to?.includes(EMAIL_CLIENT))
  verifie('la confirmation client part quand même (indépendante de l\'échec équipe)', !!clientMalgreEchecEquipe)

  console.log('\n--- B3. Échec Resend pour le CLIENT **et** pour l\'alerte elle-même : ne plante jamais ---')
  orders = []
  requetesResend = []
  adressesEnEchec = [EMAIL_CLIENT, EMAIL_ALERTE]
  const b3 = await envoyerWebhookStripe(evenementCheckoutComplete())
  verifie('=> 200 (même si l\'alerte elle-même échoue, aucun plantage)', b3.statut === 200, 'obtenu ' + b3.statut + ' ' + JSON.stringify(b3.corps))
  verifie('commande toujours enregistrée', orders.length === 1)
  adressesEnEchec = []

  console.log('\n--- C. Rejeu Stripe (même paiement, index unique reel orders_stripe_payment_intent_id_key) : un seul e-mail client ---')
  orders = []
  requetesResend = []
  adressesEnEchec = []
  const chargeC = evenementCheckoutComplete()
  const c1 = await envoyerWebhookStripe(chargeC)
  verifie('1er envoi => 200', c1.statut === 200, 'obtenu ' + c1.statut + ' ' + JSON.stringify(c1.corps))
  verifie('1 commande enregistrée', orders.length === 1, JSON.stringify(orders))
  verifie('1 e-mail client après le 1er envoi', requetesResend.filter((r) => r.to?.includes(EMAIL_CLIENT)).length === 1)

  const c2 = await envoyerWebhookStripe(chargeC) // exactement le meme evenement, rejoue comme le ferait Stripe
  verifie('rejeu => 200 (doublon, pas de retry Stripe)', c2.statut === 200, 'obtenu ' + c2.statut + ' ' + JSON.stringify(c2.corps))
  verifie('toujours une seule commande enregistrée (pas de doublon)', orders.length === 1, JSON.stringify(orders))
  verifie('toujours UN SEUL e-mail client au total (jamais deux pour la même commande)', requetesResend.filter((r) => r.to?.includes(EMAIL_CLIENT)).length === 1)

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  arreter()
  fauxSupabase.close()
  fauxResend.close()
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
