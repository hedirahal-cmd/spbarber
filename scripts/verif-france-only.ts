/**
 * Banc de verification des 3 regles decidees par Hedi le 2026-10-21 :
 * France uniquement au paiement, blocage DOM-TOM (hors Monaco), Chronopost
 * retire du menu en Corse (admin + bac a sable Boxtal).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-france-only.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — faux PostgREST local pour Supabase (meme pre-verification que
 * les autres bancs) et faux serveur pour Boxtal (meme principe que
 * verif-boxtal.ts). STRIPE_SECRET_KEY n'est PAS ecrasee (meme principe que
 * le cas F de verif-images.ts) : les cas I/K (remboursement DOM-TOM) restent
 * valables meme si le vrai appel Stripe echoue (payment_intent factice,
 * voir remboursementSiDomTom dans webhook/route.ts, qui tolere cet echec),
 * et le cas O en a besoin pour relire une vraie session.
 *
 * Cas O (2026-11-13, suite a la demande de confirmation de Hedi) : appelle
 * REELLEMENT l'API Stripe pour relire la vraie session creee et confirmer
 * que shipping_address_collection.allowed_countries vaut exactement ['FR'],
 * jamais ['FR','BE','CH','LU']. Ignore proprement (pas un ECHEC) si
 * STRIPE_SECRET_KEY est absente de .env.local.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Stripe from 'stripe'
import { demarrerServeur } from './banc-serveur'
import { PAYS_LIVRABLES } from '../src/lib/shipping-countries'

/**
 * Next.js charge .env.local pour le SERVEUR qu'il demarre lui-meme (voir
 * demarrerServeur) -- mais PAS pour ce script orchestrateur. Le cas O a
 * besoin de la vraie cle ici aussi, pour relire la session Stripe reelle
 * creee par le serveur. Lecture minimale volontaire (pas de dependance
 * dotenv) : une seule ligne nous interesse.
 */
function lireCleStripeLocale(): string | null {
  try {
    const contenu = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
    const ligne = contenu.split('\n').find((l) => l.trim().startsWith('STRIPE_SECRET_KEY='))
    if (!ligne) return null
    return ligne.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '') || null
  } catch {
    return null
  }
}

const PORT_NEXT = 3116
const ADMIN_SECRET = 'banc_france_only_secret_de_test_1234567890abcdef'
const STRIPE_WEBHOOK_SECRET = 'whsec_banc_france_only'
const BOXTAL_WEBHOOK_SECRET = 'banc_france_only_boxtal_webhook_secret_0000'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'bancfranceonlyalea'
  const charge = `${expiration}.${alea}`
  const sig = createHmac('sha256', ADMIN_SECRET).update(charge).digest('base64url')
  return `${charge}.${sig}`
}

let ok = 0
let ko = 0
function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) { ok++; console.log('  OK    ' + nom) }
  else { ko++; console.log('  ECHEC ' + nom + (detail ? '\n        ' + detail : '')) }
}

// ───── Faux Supabase (PostgREST) ─────
type OrderRow = Record<string, unknown>
let orders: Record<string, OrderRow> = {}
const recu: { methode: string; chemin: string; corps: string }[] = []

const fauxSupabase = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ methode: req.method ?? '', chemin: u.pathname + u.search, corps })
    const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')

    if (u.pathname.includes('/product_overrides')) {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(objetUnique ? null : [])); return
    }
    if (u.pathname.includes('/rpc/decrementer_stock')) {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('49'); return
    }
    if (u.pathname.includes('/orders')) {
      if (req.method === 'GET') {
        const idFiltre = u.searchParams.get('id')
        const ligne = idFiltre ? orders[idFiltre.replace(/^eq\./, '')] : undefined
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(objetUnique ? (ligne ?? null) : ligne ? [ligne] : []))
        return
      }
      if (req.method === 'PATCH') {
        const idFiltre = u.searchParams.get('id')
        const id = idFiltre ? idFiltre.replace(/^eq\./, '') : null
        const patch = JSON.parse(corps || '{}')
        if (id && orders[id]) orders[id] = { ...orders[id], ...patch }
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]')
        return
      }
      if (req.method === 'POST') {
        res.writeHead(201, { 'Content-Type': 'application/json' }); res.end('[]')
        return
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]')
  })
})

// ───── Faux Boxtal ─────
const requetesBoxtal: { methode: string; chemin: string }[] = []
const fauxBoxtal = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    requetesBoxtal.push({ methode: req.method ?? '', chemin: req.url ?? '' })
    if (req.method === 'POST' && req.url === '/v3.1/shipping-order') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ content: { id: 'bxt_test_france_only', status: 'PENDING' } }))
      return
    }
    res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{}')
  })
})

const base = () => 'http://127.0.0.1:' + PORT_NEXT

async function shipManuel(body: Record<string, unknown>) {
  const r = await fetch(base() + '/api/admin/ship', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `spbarber_admin=${jetonAdminValide()}` },
    body: JSON.stringify(body),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

async function createLabel(body: Record<string, unknown>) {
  const r = await fetch(base() + '/api/admin/boxtal/create-label', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `spbarber_admin=${jetonAdminValide()}` },
    body: JSON.stringify(body),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

async function patchPaymentIntent(body: Record<string, unknown>) {
  const r = await fetch(base() + '/api/stripe/payment-intent', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

const stripeVerif = new Stripe('sk_test_bidon', { apiVersion: '2026-05-27.dahlia' })

function evenementCheckoutComplete(postalCode: string, country = 'FR'): string {
  return JSON.stringify({
    id: 'evt_fo_' + Math.random().toString(36).slice(2, 10),
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    livemode: false,
    data: {
      object: {
        id: 'cs_test_fo_' + Math.random().toString(36).slice(2, 10),
        object: 'checkout.session',
        payment_intent: 'pi_test_fo_' + Math.random().toString(36).slice(2, 10),
        amount_total: 2890,
        currency: 'eur',
        livemode: false,
        customer_details: { email: 'client-fo@exemple.test', address: null, phone: '+33612345678', name: 'Jean Dupont' },
        collected_information: {
          shipping_details: { name: 'Jean Dupont', address: { line1: '1 rue X', line2: null, city: 'Ville', postal_code: postalCode, country } },
        },
        custom_fields: [{ key: 'prenom', text: { value: 'Jean' } }, { key: 'nom', text: { value: 'Dupont' } }],
        metadata: { items: JSON.stringify([{ id: '2', qty: 1 }]) },
      },
    },
  })
}

function evenementPaymentIntentExpress(postalCode: string): string {
  return JSON.stringify({
    id: 'evt_fo_express_' + Math.random().toString(36).slice(2, 10),
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: Math.floor(Date.now() / 1000),
    type: 'payment_intent.succeeded',
    livemode: false,
    data: {
      object: {
        id: 'pi_test_fo_express_' + Math.random().toString(36).slice(2, 10),
        object: 'payment_intent',
        amount: 3080,
        receipt_email: 'client-fo-express@exemple.test',
        shipping: { name: 'Client Express', address: { line1: '2 rue Y', city: 'Ville', postal_code: postalCode, country: 'FR' }, carrier: null, phone: null, tracking_number: null },
        metadata: { source: 'express_checkout', items: JSON.stringify([{ id: '2', qty: 1 }]) },
      },
    },
  })
}

async function envoyerWebhookStripe(charge: string): Promise<number> {
  const sig = stripeVerif.webhooks.generateTestHeaderString({ payload: charge, secret: STRIPE_WEBHOOK_SECRET })
  const r = await fetch(base() + '/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': sig }, body: charge })
  return r.status
}

async function main() {
  await new Promise<void>((r) => fauxSupabase.listen(0, '127.0.0.1', r))
  const portSupabase = (fauxSupabase.address() as AddressInfo).port
  await new Promise<void>((r) => fauxBoxtal.listen(0, '127.0.0.1', r))
  const portBoxtal = (fauxBoxtal.address() as AddressInfo).port
  console.log('  faux PostgREST sur 127.0.0.1:' + portSupabase)
  console.log('  faux Boxtal sur 127.0.0.1:' + portBoxtal)

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portSupabase,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    ADMIN_SESSION_SECRET: ADMIN_SECRET,
    ALERT_EMAIL: '',
    RESEND_API_KEY: '',
    // STRIPE_SECRET_KEY volontairement PAS ecrasee (voir en-tete) : le cas O
    // a besoin de la vraie cle de .env.local pour un appel Stripe reel.
    STRIPE_WEBHOOK_SECRET,
    BOXTAL_API_BASE_URL: 'http://127.0.0.1:' + portBoxtal,
    BOXTAL_SANDBOX_ACCESS_KEY: 'test-access',
    BOXTAL_SANDBOX_SECRET_KEY: 'test-secret',
    BOXTAL_WEBHOOK_SECRET,
    BOXTAL_SENDER_PHONE: '+33600000000',
    BOXTAL_OFFER_CODE_COLISSIMO: 'COLI-Test',
    BOXTAL_OFFER_CODE_CHRONOPOST: 'CHRP-Test',
  }

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter(); fauxSupabase.close(); fauxBoxtal.close(); process.exitCode = 1; return
  }
  const arreter = demarrage.arreter

  console.log('\n--- 0. Pre-verification : Supabase est-il detourne ? ---')
  recu.length = 0
  await fetch(base() + '/products').catch(() => {})
  if (!recu.some((r) => r.chemin.includes('product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete. Abandon.')
    arreter(); fauxSupabase.close(); fauxBoxtal.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  const commandeDeBase = (postalCode: string): OrderRow => ({
    id: 'cmd-fo-1',
    email: 'client@exemple.test',
    items: [{ id: '2', qty: 1 }],
    shipping_address: {
      name: 'Jean Dupont', prenom: 'Jean', nom: 'Dupont', phone: '+33612345678',
      address: { line1: '1 rue du Test', city: 'Ville', postal_code: postalCode, country: 'FR' },
    },
    boxtal_order_id: null, boxtal_label_url: null, tracking_number: null, carrier: null,
  })

  console.log('\n--- A. Corse (20xxx) : suivi manuel refuse Chronopost ---')
  orders = { 'cmd-fo-1': commandeDeBase('20000') }
  const a1 = await shipManuel({ id: 'cmd-fo-1', tracking_number: 'XX1', carrier: 'chronopost' })
  verifie('=> 400', a1.statut === 400, 'obtenu ' + a1.statut + ' ' + JSON.stringify(a1.corps))
  verifie('commande non modifiee', orders['cmd-fo-1'].tracking_number == null)

  console.log('\n--- B. Corse (20xxx) : Colissimo reste accepte ---')
  orders = { 'cmd-fo-1': commandeDeBase('20000') }
  const b1 = await shipManuel({ id: 'cmd-fo-1', tracking_number: 'XX2', carrier: 'colissimo' })
  verifie('=> 200', b1.statut === 200, 'obtenu ' + b1.statut + ' ' + JSON.stringify(b1.corps))

  console.log('\n--- C. Hors Corse (75001) : Chronopost reste accepte par le suivi manuel ---')
  orders = { 'cmd-fo-1': commandeDeBase('75001') }
  const c1 = await shipManuel({ id: 'cmd-fo-1', tracking_number: 'XX3', carrier: 'chronopost' })
  verifie('=> 200', c1.statut === 200, 'obtenu ' + c1.statut + ' ' + JSON.stringify(c1.corps))

  console.log('\n--- D. Corse (20xxx) : création d\'étiquette Boxtal refuse Chronopost ---')
  orders = { 'cmd-fo-1': commandeDeBase('20090') }
  requetesBoxtal.length = 0
  const d1 = await createLabel({ id: 'cmd-fo-1', carrier: 'chronopost', poidsKg: 0.3, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('=> 400', d1.statut === 400, 'obtenu ' + d1.statut + ' ' + JSON.stringify(d1.corps))
  verifie('aucune requête envoyée à Boxtal', requetesBoxtal.length === 0)

  console.log('\n--- E. Hors Corse (35300) : création d\'étiquette Boxtal accepte Chronopost ---')
  orders = { 'cmd-fo-1': commandeDeBase('35300') }
  requetesBoxtal.length = 0
  const e1 = await createLabel({ id: 'cmd-fo-1', carrier: 'chronopost', poidsKg: 0.3, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('=> 200', e1.statut === 200, 'obtenu ' + e1.statut + ' ' + JSON.stringify(e1.corps))
  verifie('une requête envoyée à Boxtal', requetesBoxtal.length === 1)

  console.log('\n--- F. DOM-TOM (97200 Martinique) : paiement express refusé avant confirmation ---')
  const f1 = await patchPaymentIntent({ paymentIntentId: 'pi_test_fake', shipping: { name: 'X', address: { line1: '1 rue', city: 'Fort-de-France', postal_code: '97200', country: 'FR' } } })
  verifie('=> 400', f1.statut === 400, 'obtenu ' + f1.statut + ' ' + JSON.stringify(f1.corps))

  console.log('\n--- G. Monaco (98000) : PAS bloqué par le contrôle DOM-TOM ---')
  const g1 = await patchPaymentIntent({ paymentIntentId: 'pi_test_fake', shipping: { name: 'X', address: { line1: '1 rue', city: 'Monaco', postal_code: '98000', country: 'FR' } } })
  verifie('pas le refus DOM-TOM (une autre erreur -- payment_intent factice inexistant -- est acceptable)', g1.statut !== 400 || !String(g1.corps.error ?? '').includes('DOM-TOM'), 'obtenu ' + g1.statut + ' ' + JSON.stringify(g1.corps))

  console.log('\n--- H. France métropolitaine (75001) : PAS bloqué par le contrôle DOM-TOM ---')
  const h1 = await patchPaymentIntent({ paymentIntentId: 'pi_test_fake', shipping: { name: 'X', address: { line1: '1 rue', city: 'Paris', postal_code: '75001', country: 'FR' } } })
  verifie('pas le refus DOM-TOM', h1.statut !== 400 || !String(h1.corps.error ?? '').includes('DOM-TOM'), 'obtenu ' + h1.statut + ' ' + JSON.stringify(h1.corps))

  console.log('\n--- I. Webhook Checkout classique : adresse DOM-TOM (97200) => remboursé, AUCUNE commande enregistrée ---')
  recu.length = 0
  const i1 = await envoyerWebhookStripe(evenementCheckoutComplete('97200'))
  verifie('=> 200', i1 === 200, 'obtenu ' + i1)
  verifie('aucune insertion dans orders', !recu.some((r) => r.methode === 'POST' && r.chemin.includes('/orders')))

  console.log('\n--- J. Webhook Checkout classique : adresse normale (75001) => commande enregistrée normalement ---')
  recu.length = 0
  const j1 = await envoyerWebhookStripe(evenementCheckoutComplete('75001'))
  verifie('=> 200', j1 === 200, 'obtenu ' + j1)
  verifie('une insertion dans orders', recu.some((r) => r.methode === 'POST' && r.chemin.includes('/orders')))

  console.log('\n--- K. Webhook paiement express : adresse DOM-TOM (97410) => remboursé, AUCUNE commande enregistrée (filet de sécurité) ---')
  recu.length = 0
  const k1 = await envoyerWebhookStripe(evenementPaymentIntentExpress('97410'))
  verifie('=> 200', k1 === 200, 'obtenu ' + k1)
  verifie('aucune insertion dans orders', !recu.some((r) => r.methode === 'POST' && r.chemin.includes('/orders')))

  console.log('\n--- L. Saint-Barthélemy (97133) : bloqué par le contrôle DOM-TOM (ajout 2026-10-21) ---')
  const l1 = await patchPaymentIntent({ paymentIntentId: 'pi_test_fake', shipping: { name: 'X', address: { line1: '1 rue', city: 'Gustavia', postal_code: '97133', country: 'FR' } } })
  verifie('=> 400 refus DOM-TOM', l1.statut === 400 && String(l1.corps.error ?? '').includes('DOM-TOM'), 'obtenu ' + l1.statut + ' ' + JSON.stringify(l1.corps))

  console.log('\n--- M. Saint-Martin (97150) : bloqué par le contrôle DOM-TOM (ajout 2026-10-21) ---')
  const m1 = await patchPaymentIntent({ paymentIntentId: 'pi_test_fake', shipping: { name: 'X', address: { line1: '1 rue', city: 'Marigot', postal_code: '97150', country: 'FR' } } })
  verifie('=> 400 refus DOM-TOM', m1.statut === 400 && String(m1.corps.error ?? '').includes('DOM-TOM'), 'obtenu ' + m1.statut + ' ' + JSON.stringify(m1.corps))

  console.log('\n--- N. PAYS_LIVRABLES (source unique partagée par le Checkout classique et le paiement express) : France uniquement ---')
  verifie('PAYS_LIVRABLES = [\'FR\'] exactement (Belgique/Suisse/Luxembourg désactivés)', PAYS_LIVRABLES.length === 1 && PAYS_LIVRABLES[0] === 'FR', JSON.stringify(PAYS_LIVRABLES))

  console.log('\n--- O. Vraie session Stripe (Checkout classique) : la vraie API Stripe confirme allowed_countries = [FR] ---')
  const cleStripeLocale = lireCleStripeLocale()
  if (!cleStripeLocale) {
    console.log('  IGNORÉ : STRIPE_SECRET_KEY absente de .env.local -- impossible de vérifier contre la vraie API Stripe ici.')
  } else {
    const rCheckout = await fetch(base() + '/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ product: { id: '2' }, quantity: 1 }] }),
    })
    const corpsCheckout = await rCheckout.json().catch(() => ({}))
    if (rCheckout.status !== 200) console.log('    corps reçu :', JSON.stringify(corpsCheckout))
    verifie('session Stripe réelle créée (200)', rCheckout.status === 200, 'obtenu ' + rCheckout.status)

    const idSession = String(corpsCheckout.url ?? '').match(/\/pay\/(cs_[a-zA-Z0-9_]+)/)?.[1] ?? null
    verifie('id de session extrait de l\'URL retournée', !!idSession, JSON.stringify(corpsCheckout.url))

    if (idSession) {
      const stripeReel = new Stripe(cleStripeLocale, { apiVersion: '2026-05-27.dahlia' })
      const session = await stripeReel.checkout.sessions.retrieve(idSession)
      const pays = session.shipping_address_collection?.allowed_countries ?? []
      verifie('la vraie session Stripe n\'autorise QUE la France (pas BE/CH/LU)', pays.length === 1 && pays[0] === 'FR', JSON.stringify(pays))
    }
  }

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  arreter()
  fauxSupabase.close()
  fauxBoxtal.close()
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
