/**
 * Banc de verification du chantier Boxtal (etiquettes Colissimo/Chronopost
 * automatiques, 2026-10-21, demande Hedi) : generation d'etiquette, annulation,
 * webhook (DOCUMENT_CREATED / TRACKING_CHANGED), et collecte telephone/prenom/
 * nom au Checkout classique.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-boxtal.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — AUCUN appel reel a Boxtal ni a Supabase. Un faux serveur HTTP
 * local tient lieu de Boxtal (requetes/reponses interceptees, voir
 * fauxBoxtal), un autre de Supabase (PostgREST + Storage, meme pre-
 * verification que les autres bancs). BOXTAL_API_BASE_URL n'est JAMAIS
 * documentee a Hedi -- c'est un point d'injection reserve a ce seul banc (voir
 * src/lib/boxtal.ts). Jeton admin forge avec un ADMIN_SESSION_SECRET connu de
 * ce seul processus.
 *
 * CE QUE CE BANC NE PROUVE PAS : le comportement reel de l'API Boxtal (codes
 * d'offre reels, encodage exact de la signature webhook) -- voir les
 * incertitudes documentees dans src/lib/boxtal.ts. Il verifie ce que notre
 * code fait CORRECTEMENT avec ce que Boxtal est cense renvoyer d'apres la
 * documentation/le client tiers etudies, pas la conformite reelle de Boxtal
 * lui-meme.
 *
 * Resend EST intercepte ici (2026-11-16, voir fauxResend) via RESEND_BASE_URL
 * -- une variable officiellement supportee par le SDK resend (node_modules/
 * resend/dist/index.mjs, getDefaultBaseUrl), jamais documentee a Hedi, meme
 * principe que BOXTAL_API_BASE_URL -- pour verifier le controle explicite du
 * champ { error } sur l'e-mail "commande expediee" (cas I2).
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import Stripe from 'stripe'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3115
const ADMIN_SECRET = 'banc_boxtal_secret_de_test_1234567890abcdef'
const BOXTAL_WEBHOOK_SECRET = 'banc_boxtal_webhook_secret_de_test_1234567890'
const STRIPE_WEBHOOK_SECRET = 'whsec_banc_boxtal'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'bancboxtalalea'
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

/** Attend qu'une condition devienne vraie -- necessaire pour le travail differe via after() (voir route du webhook Boxtal), qui continue apres la reponse HTTP. */
async function attendreQue(condition: () => boolean, delaiMaxMs = 3000, intervalleMs = 50): Promise<boolean> {
  const debut = Date.now()
  while (Date.now() - debut < delaiMaxMs) {
    if (condition()) return true
    await new Promise((r) => setTimeout(r, intervalleMs))
  }
  return condition()
}

// ───── Faux Supabase (PostgREST + Storage) ─────
type OrderRow = Record<string, unknown>
let orders: Record<string, OrderRow> = {}
const recu: { methode: string; chemin: string; corps: string }[] = []

const SALON_FOUGERES = { adresse: '48 Boulevard Jean Jaurès', ville: 'Fougères', code_postal: '35300' }
/** Override de prix simule (table product_overrides) -- vide par defaut (comportement des cas A-E2, prix statique PRODUCTS en repli). Rempli ponctuellement par le cas E3 pour prouver que l'override l'emporte reellement. */
let overridesPrix: Record<string, number> = {}

const fauxSupabase = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ methode: req.method ?? '', chemin: u.pathname + u.search, corps })
    const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')

    if (u.pathname.includes('/storage/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ Key: u.pathname }))
      return
    }
    if (u.pathname.includes('/salons')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? SALON_FOUGERES : [SALON_FOUGERES]))
      return
    }
    if (u.pathname.includes('/product_overrides')) {
      const lignes = Object.entries(overridesPrix).map(([id, price]) => ({ id, price }))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? (lignes[0] ?? null) : lignes))
      return
    }
    if (u.pathname.includes('/rpc/decrementer_stock')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(49))
      return
    }
    if (u.pathname.includes('/orders')) {
      if (req.method === 'GET') {
        // Filtrable par id (create-label, cancel-label) OU par boxtal_order_id
        // (webhook/boxtal, qui ne connait que l'id Boxtal, pas le notre).
        const idFiltre = u.searchParams.get('id')
        const boxtalIdFiltre = u.searchParams.get('boxtal_order_id')
        let ligne: OrderRow | undefined
        if (idFiltre) {
          ligne = orders[idFiltre.replace(/^eq\./, '')]
        } else if (boxtalIdFiltre) {
          const bid = boxtalIdFiltre.replace(/^eq\./, '')
          ligne = Object.values(orders).find((o) => o.boxtal_order_id === bid)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(objetUnique ? (ligne ?? null) : ligne ? [ligne] : []))
        return
      }
      if (req.method === 'PATCH') {
        const idFiltre = u.searchParams.get('id')
        const id = idFiltre ? idFiltre.replace(/^eq\./, '') : null
        const patch = JSON.parse(corps || '{}')
        if (id && orders[id]) orders[id] = { ...orders[id], ...patch }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('[]')
        return
      }
      if (req.method === 'POST') {
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end('[]')
        return
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('[]')
  })
})

// ───── Faux Boxtal ─────
let boxtalComportement: 'ok' | 'erreur400' = 'ok'
const requetesBoxtal: { methode: string; chemin: string; corps: Record<string, unknown> }[] = []

const fauxBoxtal = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    if (req.url === '/fake-label.pdf') {
      res.writeHead(200, { 'Content-Type': 'application/pdf' })
      res.end(Buffer.from('%PDF-1.4 faux pdf de test'))
      return
    }

    let parsed: Record<string, unknown> = {}
    try { parsed = corps ? JSON.parse(corps) : {} } catch {}
    requetesBoxtal.push({ methode: req.method ?? '', chemin: req.url ?? '', corps: parsed })

    if (boxtalComportement === 'erreur400') {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: 'offre invalide (bac a sable de test)' }))
      return
    }
    if (req.method === 'POST' && req.url === '/v3.1/shipping-order') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ content: { id: 'bxt_test_123', status: 'PENDING' } }))
      return
    }
    if (req.method === 'DELETE' && req.url?.startsWith('/v3.1/shipping-order/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ content: { id: 'bxt_test_123', status: 'CANCELLED' } }))
      return
    }
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end('{}')
  })
})

// ───── Faux Resend ─────
type RequeteResend = { to: string[]; subject: string; html: string }
let requetesResend: RequeteResend[] = []
/** Les requetes adressees a une adresse de cette liste echouent (400) -- simule un refus Resend pour UN SEUL destinataire. */
let adressesEnEchec: string[] = []

const fauxResend = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const payload = JSON.parse(corps || '{}') as RequeteResend
    requetesResend.push(payload)
    if (payload.to?.some((t) => adressesEnEchec.includes(t))) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ name: 'validation_error', message: 'Domaine non vérifié (simulation de banc).' }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ id: 'email-test-' + Math.random().toString(36).slice(2, 10) }))
  })
})

const base = () => 'http://127.0.0.1:' + PORT_NEXT

async function createLabel(body: Record<string, unknown>): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/admin/boxtal/create-label', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `spbarber_admin=${jetonAdminValide()}` },
    body: JSON.stringify(body),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

async function cancelLabel(body: Record<string, unknown>): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/admin/boxtal/cancel-label', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `spbarber_admin=${jetonAdminValide()}` },
    body: JSON.stringify(body),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

function signatureBoxtal(corpsBrut: string): string {
  return createHmac('sha256', BOXTAL_WEBHOOK_SECRET).update(corpsBrut).digest('hex')
}

async function envoyerWebhookBoxtal(evenement: Record<string, unknown>, signatureInvalide = false): Promise<number> {
  const charge = JSON.stringify(evenement)
  const sig = signatureInvalide ? 'hex:0000000000000000000000000000000000000000000000000000000000000000' : signatureBoxtal(charge)
  const r = await fetch(base() + '/api/webhook/boxtal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bxt-signature': sig },
    body: charge,
  })
  return r.status
}

const stripeVerif = new Stripe('sk_test_bidon', { apiVersion: '2026-05-27.dahlia' })

function evenementCheckoutComplete(): string {
  return JSON.stringify({
    id: 'evt_boxtal_' + Math.random().toString(36).slice(2, 10),
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    livemode: false,
    data: {
      object: {
        id: 'cs_test_boxtal_' + Math.random().toString(36).slice(2, 10),
        object: 'checkout.session',
        payment_intent: 'pi_test_boxtal_' + Math.random().toString(36).slice(2, 10),
        amount_total: 2890,
        currency: 'eur',
        livemode: false,
        customer_details: { email: 'client-boxtal@exemple.test', address: null, phone: '+33612345678', name: 'Jean Dupont' },
        collected_information: {
          shipping_details: {
            name: 'Jean Dupont',
            address: { line1: '1 rue du Test', line2: null, city: 'Fougeres', postal_code: '35300', country: 'FR' },
          },
        },
        custom_fields: [
          { key: 'prenom', text: { value: 'Jean' } },
          { key: 'nom', text: { value: 'Dupont' } },
        ],
        metadata: { items: JSON.stringify([{ id: '2', qty: 1 }]) },
      },
    },
  })
}

async function main() {
  await new Promise<void>((r) => fauxSupabase.listen(0, '127.0.0.1', r))
  const portSupabase = (fauxSupabase.address() as AddressInfo).port
  await new Promise<void>((r) => fauxBoxtal.listen(0, '127.0.0.1', r))
  const portBoxtal = (fauxBoxtal.address() as AddressInfo).port
  await new Promise<void>((r) => fauxResend.listen(0, '127.0.0.1', r))
  const portResend = (fauxResend.address() as AddressInfo).port
  console.log('  faux PostgREST sur 127.0.0.1:' + portSupabase)
  console.log('  faux Boxtal sur 127.0.0.1:' + portBoxtal)
  console.log('  faux Resend sur 127.0.0.1:' + portResend)

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portSupabase,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    ADMIN_SESSION_SECRET: ADMIN_SECRET,
    ALERT_EMAIL: 'alerte@exemple.test',
    NOTIF_EQUIPE_EMAIL: 'equipe@exemple.test',
    RESEND_API_KEY: 'test-key',
    RESEND_BASE_URL: 'http://127.0.0.1:' + portResend,
    STRIPE_WEBHOOK_SECRET,
    BOXTAL_API_BASE_URL: 'http://127.0.0.1:' + portBoxtal,
    BOXTAL_SANDBOX_ACCESS_KEY: 'test-access',
    BOXTAL_SANDBOX_SECRET_KEY: 'test-secret',
    BOXTAL_WEBHOOK_SECRET,
    BOXTAL_SENDER_PHONE: '+33600000000',
    // BOXTAL_OFFER_CODE_CHRONOPOST volontairement absente -- cas D verifie
    // le repli sur la valeur par defaut CHRP-Chrono18 (src/lib/boxtal.ts).
    BOXTAL_OFFER_CODE_COLISSIMO: 'COLI-Test-Domicile',
  }

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter(); fauxSupabase.close(); fauxBoxtal.close(); fauxResend.close(); process.exitCode = 1; return
  }
  const arreter = demarrage.arreter

  console.log('\n--- 0. Pre-verification : Supabase est-il detourne ? ---')
  recu.length = 0
  await fetch(base() + '/products').catch(() => {})
  if (!recu.some((r) => r.chemin.includes('product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete. Abandon.')
    arreter(); fauxSupabase.close(); fauxBoxtal.close(); fauxResend.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- 0bis. /api/admin/boxtal/status : configure=true quand les cles sont posees ---')
  const statutRes = await fetch(base() + '/api/admin/boxtal/status', { headers: { Cookie: `spbarber_admin=${jetonAdminValide()}` } })
  const statutCorps = await statutRes.json().catch(() => ({}))
  verifie('=> 200', statutRes.status === 200, 'obtenu ' + statutRes.status)
  verifie('configure=true', statutCorps.configure === true, JSON.stringify(statutCorps))

  const commandeDeBase = (): OrderRow => ({
    id: 'cmd-1',
    email: 'client@exemple.test',
    items: [{ id: '2', qty: 1 }],
    shipping_address: {
      name: 'Jean Dupont',
      prenom: 'Jean',
      nom: 'Dupont',
      phone: '+33612345678',
      address: { line1: '1 rue du Test', city: 'Fougeres', postal_code: '35300', country: 'FR' },
    },
    boxtal_order_id: null,
    boxtal_label_url: null,
    tracking_number: null,
    carrier: null,
  })

  console.log('\n--- A. Création d\'étiquette : cas réel, requête Boxtal correctement formée ---')
  orders = { 'cmd-1': commandeDeBase() }
  requetesBoxtal.length = 0
  boxtalComportement = 'ok'
  const a = await createLabel({ id: 'cmd-1', carrier: 'colissimo', poidsKg: 0.35, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('=> 200', a.statut === 200, 'obtenu ' + a.statut + ' ' + JSON.stringify(a.corps))
  verifie('boxtal_order_id renvoyé', a.corps.boxtal_order_id === 'bxt_test_123', JSON.stringify(a.corps))
  const requeteCreation = requetesBoxtal.find((r) => r.methode === 'POST' && r.chemin === '/v3.1/shipping-order')
  verifie('une requête de création envoyée à Boxtal', !!requeteCreation)
  if (requeteCreation) {
    const corps = requeteCreation.corps as Record<string, unknown>
    verifie('code d\'offre = celui de Colissimo', corps.shippingOfferCode === 'COLI-Test-Domicile', JSON.stringify(corps.shippingOfferCode))
    const shipment = corps.shipment as Record<string, unknown>
    const to = shipment.toAddress as Record<string, unknown>
    const toContact = to.contact as Record<string, unknown>
    const toLocation = to.location as Record<string, unknown>
    verifie('destinataire : prénom/nom séparés (pas de découpage automatique ici)', toContact.firstName === 'Jean' && toContact.lastName === 'Dupont', JSON.stringify(toContact))
    verifie('destinataire : téléphone transmis', toContact.phone === '+33612345678')
    verifie('destinataire : ville', toLocation.city === 'Fougeres')
    const from = shipment.fromAddress as Record<string, unknown>
    const fromLocation = from.location as Record<string, unknown>
    verifie('expéditeur : adresse Fougères (table salons)', fromLocation.street === '48 Boulevard Jean Jaurès' && fromLocation.city === 'Fougères', JSON.stringify(fromLocation))
    const colis = (shipment.packages as Record<string, unknown>[])[0]
    verifie('colis : poids/dimensions transmis tels que saisis', colis.weight === 0.35 && colis.length === 25 && colis.width === 19 && colis.height === 10, JSON.stringify(colis))
    verifie('externalId = id de la commande (pour le retrouver au webhook)', shipment.externalId === 'cmd-1')
  }
  verifie('commande passée à "shipped" avec le bon transporteur', orders['cmd-1'].status === 'shipped' && orders['cmd-1'].carrier === 'colissimo')
  verifie('boxtal_order_id enregistré sur la commande', orders['cmd-1'].boxtal_order_id === 'bxt_test_123')
  verifie('tracking_number encore vide (pas connu avant le webhook)', orders['cmd-1'].tracking_number == null)

  console.log('\n--- B. Téléphone manquant (commande antérieure à ce chantier) : refusée, pas d\'appel Boxtal ---')
  orders = { 'cmd-2': { ...commandeDeBase(), id: 'cmd-2', shipping_address: { name: 'Vieux Client', address: { line1: '1 rue', city: 'Fougeres', postal_code: '35300', country: 'FR' } } } }
  requetesBoxtal.length = 0
  const b = await createLabel({ id: 'cmd-2', carrier: 'colissimo', poidsKg: 0.3, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('=> 400', b.statut === 400, 'obtenu ' + b.statut + ' ' + JSON.stringify(b.corps))
  verifie('aucune requête envoyée à Boxtal', requetesBoxtal.length === 0)

  console.log('\n--- C. Étiquette déjà générée pour cette commande : refusée ---')
  orders = { 'cmd-3': { ...commandeDeBase(), id: 'cmd-3', boxtal_order_id: 'bxt_deja_existant' } }
  const c = await createLabel({ id: 'cmd-3', carrier: 'colissimo', poidsKg: 0.3, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('=> 400', c.statut === 400, 'obtenu ' + c.statut)

  console.log('\n--- C2. Double clic / second appel réel sur la MÊME commande : jamais une deuxième étiquette ---')
  orders = { 'cmd-3b': { ...commandeDeBase(), id: 'cmd-3b' } }
  requetesBoxtal.length = 0
  const c2a = await createLabel({ id: 'cmd-3b', carrier: 'colissimo', poidsKg: 0.3, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('1er appel => 200', c2a.statut === 200, 'obtenu ' + c2a.statut + ' ' + JSON.stringify(c2a.corps))
  verifie('boxtal_order_id posé après le 1er appel', orders['cmd-3b'].boxtal_order_id === 'bxt_test_123')
  const c2b = await createLabel({ id: 'cmd-3b', carrier: 'colissimo', poidsKg: 0.3, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('2e appel (double clic) => 400', c2b.statut === 400, 'obtenu ' + c2b.statut + ' ' + JSON.stringify(c2b.corps))
  const creationsVersBoxtal = requetesBoxtal.filter((r) => r.methode === 'POST' && r.chemin === '/v3.1/shipping-order')
  verifie('UNE SEULE requête de création envoyée à Boxtal au total (pas deux)', creationsVersBoxtal.length === 1, String(creationsVersBoxtal.length))

  console.log('\n--- D. Chronopost sans BOXTAL_OFFER_CODE_CHRONOPOST posée : repli sur le code par défaut CHRP-Chrono18 ---')
  orders = { 'cmd-4': { ...commandeDeBase(), id: 'cmd-4' } }
  requetesBoxtal.length = 0
  const d = await createLabel({ id: 'cmd-4', carrier: 'chronopost', poidsKg: 0.3, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('=> 200', d.statut === 200, 'obtenu ' + d.statut + ' ' + JSON.stringify(d.corps))
  const requeteD = requetesBoxtal.find((r) => r.methode === 'POST' && r.chemin === '/v3.1/shipping-order')
  verifie('code d\'offre par défaut Chronopost utilisé (CHRP-Chrono18)', requeteD?.corps.shippingOfferCode === 'CHRP-Chrono18', JSON.stringify(requeteD?.corps.shippingOfferCode))

  console.log('\n--- E. Boxtal refuse la commande (ex. mauvais code d\'offre réel) : erreur propre, pas un plantage ---')
  orders = { 'cmd-5': { ...commandeDeBase(), id: 'cmd-5' } }
  boxtalComportement = 'erreur400'
  const e = await createLabel({ id: 'cmd-5', carrier: 'colissimo', poidsKg: 0.3, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('=> 502', e.statut === 502, 'obtenu ' + e.statut)
  verifie('commande inchangée (pas de boxtal_order_id posé)', orders['cmd-5'].boxtal_order_id == null)
  boxtalComportement = 'ok'

  console.log('\n--- E2. Commande 100% tondeuses (dropshipping) : refusée AVANT tout appel Boxtal, aucune écriture en base ---')
  orders = { 'cmd-tondeuse': { ...commandeDeBase(), id: 'cmd-tondeuse', items: [{ id: '8', qty: 1, variantId: 'blanc' }] } }
  requetesBoxtal.length = 0
  const e2 = await createLabel({ id: 'cmd-tondeuse', carrier: 'colissimo', poidsKg: 0.3, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('=> 400', e2.statut === 400, 'obtenu ' + e2.statut + ' ' + JSON.stringify(e2.corps))
  verifie('message clair (tondeuses / fournisseur)', /tondeuse/i.test(e2.corps.error as string) && /fournisseur/i.test(e2.corps.error as string), JSON.stringify(e2.corps))
  verifie('aucune requête envoyée à Boxtal', requetesBoxtal.length === 0)
  verifie('commande inchangée (aucune écriture en base, pas de boxtal_order_id posé)', orders['cmd-tondeuse'].boxtal_order_id == null)

  console.log('\n--- E3. Commande MIXTE (peigne + tondeuse) : le corps réel envoyé à Boxtal ne porte que le peigne, AU PRIX RÉEL (override) ---')
  orders = { 'cmd-mixte': { ...commandeDeBase(), id: 'cmd-mixte', items: [{ id: '4', qty: 1 }, { id: '8', qty: 1, variantId: 'blanc' }] } }
  requetesBoxtal.length = 0
  // Override de prix simule pour le peigne, VOLONTAIREMENT different du prix
  // statique du catalogue (990 = 9,90 €, aligne sur product_overrides le
  // 2026-11-17, voir src/lib/products.ts) -- sinon, les deux chemins (override
  // lu vs repli catalogue) renverraient coincidentellement le meme montant, et
  // le test ne prouverait plus que l'override l'emporte reellement quand il
  // existe, seulement que le repli fonctionne (deja couvert par defaut quand
  // overridesPrix est vide, cas A-E2 ci-dessus).
  overridesPrix = { '4': 850 }
  const e3 = await createLabel({ id: 'cmd-mixte', carrier: 'colissimo', poidsKg: 0.4, longueurCm: 25, largeurCm: 19, hauteurCm: 10 })
  verifie('=> 200', e3.statut === 200, 'obtenu ' + e3.statut + ' ' + JSON.stringify(e3.corps))
  const requeteE3 = requetesBoxtal.find((r) => r.methode === 'POST' && r.chemin === '/v3.1/shipping-order')
  verifie('une requête de création envoyée à Boxtal', !!requeteE3)
  if (requeteE3) {
    const shipment = (requeteE3.corps as Record<string, unknown>).shipment as Record<string, unknown>
    const colis = (shipment.packages as Record<string, unknown>[])[0]
    verifie('poids = celui saisi (0.4) -- le poids n\'est pas recalculé serveur, seule la suggestion admin exclut déjà la tondeuse', colis.weight === 0.4, JSON.stringify(colis.weight))
    const valeur = (colis.value as Record<string, unknown>).value
    verifie('valeur déclarée = le prix de l\'OVERRIDE simulé (8,50 €), PAS le prix statique du catalogue (9,90 €), et jamais la tondeuse en plus', valeur === 8.5, JSON.stringify(valeur))
    const description = (colis.content as Record<string, unknown>).description
    verifie('description mentionne le peigne', String(description).includes('Peigne Texture Expert'), String(description))
    verifie('description ne mentionne JAMAIS la tondeuse', !String(description).includes('Tondeuse'), String(description))
  }
  overridesPrix = {}

  console.log('\n--- F. Annulation d\'étiquette ---')
  orders = { 'cmd-6': { ...commandeDeBase(), id: 'cmd-6', boxtal_order_id: 'bxt_test_123', boxtal_label_url: 'https://exemple.test/label.pdf' } }
  const f = await cancelLabel({ id: 'cmd-6' })
  verifie('=> 200', f.statut === 200, 'obtenu ' + f.statut)
  verifie('boxtal_order_id effacé', orders['cmd-6'].boxtal_order_id === null)
  verifie('boxtal_label_url effacé', orders['cmd-6'].boxtal_label_url === null)

  console.log('\n--- F2. Annulation refusée par Boxtal : la VRAIE cause est affichée, pas une cause supposée ---')
  orders = { 'cmd-6b': { ...commandeDeBase(), id: 'cmd-6b', boxtal_order_id: 'bxt_test_123', boxtal_label_url: 'https://exemple.test/label.pdf' } }
  boxtalComportement = 'erreur400'
  const f2 = await cancelLabel({ id: 'cmd-6b' })
  verifie('=> 502', f2.statut === 502, 'obtenu ' + f2.statut)
  verifie('le message contient la vraie réponse Boxtal (pas "colis déjà pris en charge" supposé)',
    String(f2.corps.error ?? '').includes('offre invalide (bac a sable de test)') && !String(f2.corps.error ?? '').includes('déjà pris en charge'),
    JSON.stringify(f2.corps))
  verifie('commande inchangée (annulation refusée, rien effacé)', orders['cmd-6b'].boxtal_order_id === 'bxt_test_123')
  boxtalComportement = 'ok'

  console.log('\n--- G. Annulation sans étiquette à annuler : refusée ---')
  orders = { 'cmd-7': { ...commandeDeBase(), id: 'cmd-7' } }
  const g = await cancelLabel({ id: 'cmd-7' })
  verifie('=> 400', g.statut === 400, 'obtenu ' + g.statut)

  console.log('\n--- H. Webhook Boxtal : signature invalide => refusé ---')
  orders = { 'cmd-8': { ...commandeDeBase(), id: 'cmd-8', boxtal_order_id: 'bxt_test_123' } }
  const h = await envoyerWebhookBoxtal({ id: 'evt1', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_123', payload: { trackings: [{ trackingNumber: 'XX123', packageTrackingUrl: 'https://x', status: 'IN_TRANSIT', message: '' }] } }, true)
  verifie('=> 400', h === 400, 'obtenu ' + h)
  verifie('tracking_number non modifié', orders['cmd-8'].tracking_number == null)

  console.log('\n--- I. Webhook Boxtal : TRACKING_CHANGED => numéro enregistré ---')
  const i = await envoyerWebhookBoxtal({ id: 'evt2', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_123', payload: { trackings: [{ trackingNumber: 'XX987654321FR', packageTrackingUrl: 'https://boxtal.test/suivi/XX987654321FR', status: 'IN_TRANSIT', message: '' }] } })
  verifie('=> 200', i === 200, 'obtenu ' + i)
  verifie('tracking_number enregistré', orders['cmd-8'].tracking_number === 'XX987654321FR')

  console.log('\n--- I2. E-mail "commande expédiée" refusé par Resend ({error}, pas une exception) => alerte déclenchée, tracking quand même enregistré ---')
  orders = { 'cmd-8b': { ...commandeDeBase(), id: 'cmd-8b', boxtal_order_id: 'bxt_test_123', email: 'client-echec@exemple.test' } }
  requetesResend = []
  adressesEnEchec = ['client-echec@exemple.test']
  const i2 = await envoyerWebhookBoxtal({ id: 'evt2b', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_123', payload: { trackings: [{ trackingNumber: 'XX111222333FR', packageTrackingUrl: 'https://x', status: 'IN_TRANSIT', message: '' }] } })
  verifie('=> 200 (jamais bloqué par un échec d\'e-mail)', i2 === 200, 'obtenu ' + i2)
  verifie('tracking_number quand même enregistré', orders['cmd-8b'].tracking_number === 'XX111222333FR')
  const alerteExpedition = requetesResend.find((r) => r.to?.includes('alerte@exemple.test'))
  verifie('alerte déclenchée pour l\'e-mail d\'expédition non envoyé', !!alerteExpedition, JSON.stringify(requetesResend.map((r) => r.to)))
  adressesEnEchec = []

  console.log('\n--- J. Webhook Boxtal : DOCUMENT_CREATED => réponse immédiate, étiquette téléchargée/ré-hébergée en différé (after()) ---')
  orders = { 'cmd-9': { ...commandeDeBase(), id: 'cmd-9', boxtal_order_id: 'bxt_test_123' } }
  const debutJ = Date.now()
  const j = await envoyerWebhookBoxtal({
    id: 'evt3',
    type: 'DOCUMENT_CREATED',
    shippingOrderId: 'bxt_test_123',
    payload: { documents: [{ type: 'LABEL', format: 'PDF', url: `http://127.0.0.1:${portBoxtal}/fake-label.pdf` }] },
  })
  const dureeJ = Date.now() - debutJ
  verifie('=> 200', j === 200, 'obtenu ' + j)
  verifie('réponse en moins de 2 secondes (exigence Boxtal -- le téléchargement/upload est différé)', dureeJ < 2000, dureeJ + 'ms')
  const aRecuEtiquette = await attendreQue(() => typeof orders['cmd-9'].boxtal_label_url === 'string')
  verifie('boxtal_label_url renseigné en différé (URL permanente, pas celle -- signée -- de Boxtal)', aRecuEtiquette && !String(orders['cmd-9'].boxtal_label_url).includes('fake-label.pdf'), JSON.stringify(orders['cmd-9'].boxtal_label_url))

  console.log('\n--- J2. Webhook Boxtal : DOCUMENT_CREATED rejoué (retry Boxtal) => idempotent, aucune corruption ---')
  const j2 = await envoyerWebhookBoxtal({
    id: 'evt3-retry',
    type: 'DOCUMENT_CREATED',
    shippingOrderId: 'bxt_test_123',
    payload: { documents: [{ type: 'LABEL', format: 'PDF', url: `http://127.0.0.1:${portBoxtal}/fake-label.pdf` }] },
  })
  verifie('=> 200 (rejeu accepté sans erreur)', j2 === 200, 'obtenu ' + j2)
  await attendreQue(() => typeof orders['cmd-9'].boxtal_label_url === 'string')
  verifie('boxtal_label_url toujours correct après rejeu', typeof orders['cmd-9'].boxtal_label_url === 'string' && !String(orders['cmd-9'].boxtal_label_url).includes('fake-label.pdf'), JSON.stringify(orders['cmd-9'].boxtal_label_url))

  console.log('\n--- K. Checkout classique : téléphone + prénom/nom (custom_fields) jusque dans la commande enregistrée ---')
  recu.length = 0
  const chargeK = evenementCheckoutComplete()
  const sigK = stripeVerif.webhooks.generateTestHeaderString({ payload: chargeK, secret: STRIPE_WEBHOOK_SECRET })
  const resK = await fetch(base() + '/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': sigK }, body: chargeK })
  verifie('=> 200', resK.status === 200, 'obtenu ' + resK.status)
  const insertionK = recu.find((r) => r.methode === 'POST' && r.chemin.includes('/orders'))
  verifie('une insertion a eu lieu', !!insertionK)
  if (insertionK) {
    const ligne = JSON.parse(insertionK.corps)
    const sa = (Array.isArray(ligne) ? ligne[0] : ligne).shipping_address
    verifie('téléphone (customer_details.phone) enregistré', sa?.phone === '+33612345678', JSON.stringify(sa))
    verifie('prénom (custom_field) enregistré', sa?.prenom === 'Jean', JSON.stringify(sa))
    verifie('nom (custom_field) enregistré', sa?.nom === 'Dupont', JSON.stringify(sa))
  }

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  arreter()
  fauxSupabase.close()
  fauxBoxtal.close()
  fauxResend.close()
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
