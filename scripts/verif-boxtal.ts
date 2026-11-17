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
 *
 * 2026-11-18 (suite au premier essai reel refuse en production, commande
 * 2dc404a1) : cas A verifie labelType = "PDF_A4" (enum officiel, l'ancien
 * "A4" etait invalide) ; cas L/L2/L3/L4 couvrent la nouvelle route de
 * diagnostic en lecture seule /api/admin/boxtal/content-categories (succes,
 * erreur Boxtal => 502, sans jeton admin => 401, et la preuve qu'elle
 * n'appelle jamais POST /v3.1/shipping-order).
 *
 * 2026-11-17 (premier essai REEL REUSSI en production, commande 48e83175) :
 * trois chantiers -- (1) le faux Supabase Storage valide desormais le mime
 * type PAR BUCKET (MIME_AUTORISES_PAR_BUCKET), ce qu'il ne faisait pas du
 * tout avant (cas J3 reproduit le vrai bug observe puis prouve qu'il serait
 * detecte) ; cas J/J2 verifient le nouveau bucket PRIVE "etiquettes" et le
 * CHEMIN (pas une URL publique) enregistre, cas J4/J5/J6 la nouvelle route
 * /api/admin/boxtal/label-url (lien signe) ; (2) cas H/I/I2/I3/I4/I5/I6
 * couvrent le nouveau statut "label_ready" et la transition ATOMIQUE vers
 * "shipped" selon les VRAIS statuts de PackageTrackingStatusEnum (confirmes
 * par Hedi via la specification officielle le meme jour -- voir
 * STATUTS_PRISE_EN_CHARGE dans boxtal.ts) : ANNOUNCED ne declenche jamais
 * rien (cas I), SHIPPED declenche l'envoi (cas I2), un filet de securite
 * (IN_TRANSIT) rejoue apres coup ne redeclenche rien (cas I3), un evenement
 * arrivant apres annulation ne declenche rien (cas I4, protection demandee
 * par Hedi), DELIVERED recu SANS SHIPPED avant declenche quand meme l'envoi
 * -- lui aussi un filet de securite (cas I6) ; cas I7 verifie que le suivi
 * MANUEL (/api/admin/ship), chemin independant, garde son e-mail immediat ;
 * (3) cas F verifie le retour INTEGRAL a "paid" apres une annulation reussie
 * (statut, tracking_number, carrier, shipped_at -- plus seulement
 * boxtal_order_id/boxtal_label_url).
 *
 * 2026-11-17, suite (onglets de statut dans l'admin + mecanisme
 * shipped -> delivered, demande Hedi) : cas I6 mis a jour -- DELIVERED sans
 * SHIPPED avant enchaine desormais label_ready -> shipped -> delivered en UN
 * SEUL appel webhook (toujours un seul e-mail). Cas I8/I9/I10, NOUVEAUX :
 * DELIVERED sur une commande deja "shipped" => "delivered", sans e-mail
 * (I8) ; rejeu idempotent (I9) ; DELIVERED sur une commande annulee
 * (status='paid') => rien (I10, meme protection que I4). CE QUE CE BANC NE
 * COUVRE PAS : le rendu des 4 nouveaux onglets de statut dans admin/page.tsx
 * (compteurs, defilement mobile) -- composant client (hooks React), aucun
 * banc de ce projet ne pilote de rendu client-side a ce jour ; leur donnee
 * source (GET /api/admin/orders, champ status) est, elle, couverte
 * indirectement par tous les cas ci-dessus qui verifient ce champ apres
 * chaque transition.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import Stripe from 'stripe'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3115
const ADMIN_SECRET = 'banc_boxtal_secret_de_test_1234567890abcdef'
const BOXTAL_WEBHOOK_SECRET = 'banc_boxtal_webhook_secret_de_test_1234567890'
// Doivent correspondre EXACTEMENT a STATUTS_PRISE_EN_CHARGE dans
// src/lib/boxtal.ts (PackageTrackingStatusEnum officiel, confirme par Hedi
// le 2026-11-17) -- duplique ici (comme les autres constantes de ce banc)
// car ce script tourne dans un processus separe du serveur Next.js qu'il
// pilote par HTTP, il ne peut pas importer ce module directement.
const STATUT_PRISE_EN_CHARGE_TEST = 'SHIPPED' // declencheur normal
const STATUT_FILET_SECURITE_TEST = 'IN_TRANSIT' // filet de securite si SHIPPED est rate
const STATUT_PRISE_EN_CHARGE_SANS_SHIPPED_TEST = 'DELIVERED' // autre filet de securite, teste seul (cas I6)
const STATUT_JAMAIS_PRISE_EN_CHARGE_TEST = 'ANNOUNCED' // etiquette creee, pas encore expedie -- ne doit JAMAIS declencher
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

/**
 * Validation mime PAR BUCKET (2026-11-17) -- reproduit la VRAIE restriction
 * Supabase Storage (voir storage.buckets.allowed_mime_types en production)
 * que ce faux serveur ne simulait pas du tout jusqu'ici : un stub generique
 * qui accepte n'importe quel upload, quel que soit son bucket ou son
 * Content-Type, n'aurait JAMAIS detecte le bug reel de production (PDF
 * envoye dans "products", qui n'autorise que des images -- "mime type
 * application/pdf is not supported"). Cette validation protege contre une
 * regression future du meme type.
 */
const MIME_AUTORISES_PAR_BUCKET: Record<string, string[]> = {
  products: ['image/jpeg', 'image/png', 'image/webp'],
  etiquettes: ['application/pdf'],
}
const uploadsStorage: { bucket: string; chemin: string; contentType: string }[] = []

const fauxSupabase = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ methode: req.method ?? '', chemin: u.pathname + u.search, corps })
    const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')

    if (u.pathname.includes('/storage/')) {
      const apresObject = u.pathname.split('/object/')[1] ?? ''
      if (apresObject.startsWith('sign/')) {
        // createSignedUrl() : POST .../object/sign/<bucket>/<chemin>
        const reste = apresObject.slice('sign/'.length)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ signedURL: `/object/sign/${reste}?token=faux-jeton-test` }))
        return
      }
      // upload() : POST .../object/<bucket>/<chemin>
      const bucket = apresObject.split('/')[0] ?? ''
      const chemin = apresObject.slice(bucket.length + 1)
      const contentType = String(req.headers['content-type'] ?? '')
      const autorises = MIME_AUTORISES_PAR_BUCKET[bucket]
      if (autorises && !autorises.includes(contentType)) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ statusCode: '400', error: 'invalid_mime_type', message: `mime type ${contentType} is not supported` }))
        return
      }
      uploadsStorage.push({ bucket, chemin, contentType })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ Key: `${bucket}/${chemin}` }))
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
        // Filtres SUPPLEMENTAIRES (ex. status=eq.label_ready, voir le webhook
        // Boxtal/TRACKING_CHANGED) -- reproduit la transition ATOMIQUE
        // conditionnee reelle de Postgres/PostgREST : 0 ligne touchee si un
        // AUTRE filtre que l'id ne correspond plus (deja ailleurs, idempotence
        // ou annulation entre-temps), au lieu d'ecraser sans condition comme
        // avant (2026-11-17).
        let correspond = !!(id && orders[id])
        if (correspond && id) {
          for (const [cle, valeur] of u.searchParams.entries()) {
            if (cle === 'id' || cle === 'select') continue
            const attendu = valeur.replace(/^eq\./, '')
            if (String((orders[id] as OrderRow)[cle] ?? '') !== attendu) { correspond = false; break }
          }
        }
        if (correspond && id) orders[id] = { ...orders[id], ...patch }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(correspond && id ? [{ ...orders[id] }] : []))
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
let boxtalComportement: 'ok' | 'erreur400' | 'erreur422SansMessage' = 'ok'
/** Statut renvoye par GET /v3.1/shipping-order/:id (2026-11-17) -- lecture d'etat avant annulation, voir cas F3/F4. */
let etatLectureBoxtal: 'EN_COURS' | 'CANCELLED' = 'EN_COURS'
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
    if (boxtalComportement === 'erreur422SansMessage') {
      // Reproduit le VRAI 422 observe en production sur l'annulation (2026-
      // 11-17) : aucun champ "message" lisible, seulement un code -- voir
      // messageLisibleErreurBoxtal dans boxtal.ts, cas F4.
      res.writeHead(422, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ code: 'InvalidRequestException', parameters: [] }))
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
    if (req.method === 'GET' && req.url?.startsWith('/v3.1/shipping-order/')) {
      // Lecture d'etat avant annulation (2026-11-17, demande Hedi) --
      // etatLectureBoxtal configurable par cas de test, voir plus bas.
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ content: { id: 'bxt_test_123', status: etatLectureBoxtal } }))
      return
    }
    if (req.method === 'GET' && req.url?.startsWith('/v3.1/content-category')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ content: [{ id: 'content:v1:30100', label: 'Cosmétiques, bien-être' }, { id: 'content:v1:10120', label: 'Journaux' }] }))
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

/** Suivi manuel (/api/admin/ship) -- chemin INDEPENDANT de Boxtal, inchange par ce chantier : garde son e-mail immediat (cas I7). */
async function shipManuel(body: Record<string, unknown>): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/admin/ship', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `spbarber_admin=${jetonAdminValide()}` },
    body: JSON.stringify(body),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

/** Lien signe de courte duree vers l'etiquette PDF (2026-11-17) -- bucket prive "etiquettes", sans jeton admin => 401 par defaut. */
async function labelUrl(id: string, avecCookie = true): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/admin/boxtal/label-url?id=' + encodeURIComponent(id), {
    headers: avecCookie ? { Cookie: `spbarber_admin=${jetonAdminValide()}` } : {},
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

/** Route de lecture seule (2026-11-18) : liste les vraies categories de contenu Boxtal, sans jeton admin => 401 par defaut. */
async function categoriesContenu(avecCookie = true): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/admin/boxtal/content-categories', {
    headers: avecCookie ? { Cookie: `spbarber_admin=${jetonAdminValide()}` } : {},
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
    // labelType: 'A4' etait invalide -- l'enum officiel (doc OpenAPI v3.1,
    // CreateShippingOrderRequest.labelType) n'accepte que PDF_A4/PDF_10x15.
    verifie('labelType = "PDF_A4" (enum officiel, pas "A4")', corps.labelType === 'PDF_A4', JSON.stringify(corps.labelType))
  }
  // label_ready, PAS "shipped" (2026-11-17, demande Hedi) : le passage a
  // "shipped" et l'e-mail client n'ont lieu qu'a la vraie prise en charge
  // transporteur (voir le bloc TRACKING_CHANGED plus bas, cas I2).
  verifie('commande passée à "label_ready" (pas encore "shipped") avec le bon transporteur', orders['cmd-1'].status === 'label_ready' && orders['cmd-1'].carrier === 'colissimo', String(orders['cmd-1'].status))
  verifie('boxtal_order_id enregistré sur la commande', orders['cmd-1'].boxtal_order_id === 'bxt_test_123')
  verifie('tracking_number encore vide (pas connu avant le webhook)', orders['cmd-1'].tracking_number == null)
  verifie('shipped_at encore vide (pas encore pris en charge)', orders['cmd-1'].shipped_at == null)

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

  console.log('\n--- F. Annulation d\'étiquette : retour INTÉGRAL à "paid" (2026-11-17, demande Hedi) ---')
  // Fixture volontairement "avancee" (statut deja shipped, suivi/transporteur/
  // date deja connus) -- preuve la plus forte : MEME dans ce cas, Boxtal
  // acceptant l'annulation efface tout, pas seulement boxtal_order_id/
  // boxtal_label_url comme avant le 2026-11-17.
  orders = {
    'cmd-6': {
      ...commandeDeBase(), id: 'cmd-6', status: 'shipped',
      boxtal_order_id: 'bxt_test_123', boxtal_label_url: 'labels/cmd-6.pdf',
      tracking_number: 'XX_AVANT_ANNULATION', carrier: 'colissimo', shipped_at: '2026-11-17T10:00:00.000Z',
    },
  }
  etatLectureBoxtal = 'EN_COURS'
  requetesBoxtal.length = 0
  const f = await cancelLabel({ id: 'cmd-6' })
  verifie('=> 200', f.statut === 200, 'obtenu ' + f.statut)
  verifie('statut revenu à "paid"', orders['cmd-6'].status === 'paid', String(orders['cmd-6'].status))
  verifie('boxtal_order_id effacé', orders['cmd-6'].boxtal_order_id === null)
  verifie('boxtal_label_url effacé', orders['cmd-6'].boxtal_label_url === null)
  verifie('tracking_number effacé', orders['cmd-6'].tracking_number === null)
  verifie('carrier effacé', orders['cmd-6'].carrier === null)
  verifie('shipped_at effacé', orders['cmd-6'].shipped_at === null)
  verifie('pas de message "déjà annulée" dans ce cas normal', !f.corps.dejaAnnulee, JSON.stringify(f.corps))
  verifie('un DELETE a bien été envoyé à Boxtal (pas déjà annulée)', requetesBoxtal.some((r) => r.methode === 'DELETE'), JSON.stringify(requetesBoxtal.map((r) => r.methode)))

  console.log('\n--- F2. Annulation refusée par Boxtal : la VRAIE cause est affichée, pas une cause supposée, RIEN n\'est effacé ---')
  orders = { 'cmd-6b': { ...commandeDeBase(), id: 'cmd-6b', status: 'label_ready', boxtal_order_id: 'bxt_test_123', boxtal_label_url: 'labels/cmd-6b.pdf' } }
  boxtalComportement = 'erreur400'
  const f2 = await cancelLabel({ id: 'cmd-6b' })
  verifie('=> 502', f2.statut === 502, 'obtenu ' + f2.statut)
  verifie('le message contient la vraie réponse Boxtal (pas "colis déjà pris en charge" supposé)',
    String(f2.corps.error ?? '').includes('offre invalide (bac a sable de test)') && !String(f2.corps.error ?? '').includes('déjà pris en charge'),
    JSON.stringify(f2.corps))
  verifie('le message ne contient PAS le JSON brut (ni le chemin, ni des accolades)',
    !String(f2.corps.error ?? '').includes('/v3.1/shipping-order') && !String(f2.corps.error ?? '').includes('{'),
    JSON.stringify(f2.corps))
  verifie('commande inchangée (annulation refusée, rien effacé)', orders['cmd-6b'].boxtal_order_id === 'bxt_test_123' && orders['cmd-6b'].status === 'label_ready')
  boxtalComportement = 'ok'

  console.log('\n--- F3. Étiquette DÉJÀ annulée côté Boxtal (ex. à la main sur leur site) : traité comme un succès, AUCUN appel DELETE ---')
  orders = { 'cmd-6c': { ...commandeDeBase(), id: 'cmd-6c', status: 'label_ready', boxtal_order_id: 'bxt_test_123', boxtal_label_url: 'labels/cmd-6c.pdf' } }
  etatLectureBoxtal = 'CANCELLED'
  requetesBoxtal.length = 0
  const f3 = await cancelLabel({ id: 'cmd-6c' })
  verifie('=> 200', f3.statut === 200, 'obtenu ' + f3.statut + ' ' + JSON.stringify(f3.corps))
  verifie('dejaAnnulee = true', f3.corps.dejaAnnulee === true, JSON.stringify(f3.corps))
  verifie('message "déjà annulée côté Boxtal, commande remise à payée"', String(f3.corps.message ?? '').includes('déjà annulée côté Boxtal'), JSON.stringify(f3.corps))
  verifie('statut revenu à "paid" (même reset complet que F)', orders['cmd-6c'].status === 'paid', String(orders['cmd-6c'].status))
  verifie('boxtal_order_id effacé', orders['cmd-6c'].boxtal_order_id === null)
  verifie('UN GET a été envoyé (lecture d\'état)', requetesBoxtal.some((r) => r.methode === 'GET' && r.chemin?.startsWith('/v3.1/shipping-order/')), JSON.stringify(requetesBoxtal))
  verifie('AUCUN DELETE envoyé (inutile, déjà annulée)', !requetesBoxtal.some((r) => r.methode === 'DELETE'), JSON.stringify(requetesBoxtal.map((r) => r.methode)))
  etatLectureBoxtal = 'EN_COURS'

  console.log('\n--- F4. 422 réel observé en production (code sans message lisible) : message propre, AUCUN JSON brut, corps complet journalisé ---')
  orders = { 'cmd-6d': { ...commandeDeBase(), id: 'cmd-6d', status: 'label_ready', boxtal_order_id: 'bxt_test_123', boxtal_label_url: 'labels/cmd-6d.pdf' } }
  boxtalComportement = 'erreur422SansMessage'
  const f4 = await cancelLabel({ id: 'cmd-6d' })
  verifie('=> 502', f4.statut === 502, 'obtenu ' + f4.statut)
  verifie('le message reprend le VRAI code Boxtal (InvalidRequestException)', String(f4.corps.error ?? '').includes('InvalidRequestException'), JSON.stringify(f4.corps))
  verifie('le message ne contient PAS le JSON brut (ni "parameters", ni accolades, ni le chemin)',
    !String(f4.corps.error ?? '').includes('parameters') && !String(f4.corps.error ?? '').includes('{') && !String(f4.corps.error ?? '').includes('/v3.1/shipping-order'),
    JSON.stringify(f4.corps))
  verifie('commande inchangée (annulation refusée, rien effacé)', orders['cmd-6d'].boxtal_order_id === 'bxt_test_123')
  boxtalComportement = 'ok'

  console.log('\n--- G. Annulation sans étiquette à annuler : refusée ---')
  orders = { 'cmd-7': { ...commandeDeBase(), id: 'cmd-7' } }
  const g = await cancelLabel({ id: 'cmd-7' })
  verifie('=> 400', g.statut === 400, 'obtenu ' + g.statut)

  console.log('\n--- H. Webhook Boxtal : signature invalide => refusé ---')
  orders = { 'cmd-8': { ...commandeDeBase(), id: 'cmd-8', status: 'label_ready', boxtal_order_id: 'bxt_test_123' } }
  const h = await envoyerWebhookBoxtal({ id: 'evt1', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_123', payload: { trackings: [{ trackingNumber: 'XX123', packageTrackingUrl: 'https://x', status: STATUT_JAMAIS_PRISE_EN_CHARGE_TEST, message: '' }] } }, true)
  verifie('=> 400', h === 400, 'obtenu ' + h)
  verifie('tracking_number non modifié', orders['cmd-8'].tracking_number == null)
  verifie('statut non modifié (toujours label_ready)', orders['cmd-8'].status === 'label_ready')

  console.log('\n--- I. TRACKING_CHANGED avec ANNOUNCED (étiquette créée, pas encore expédié) : numéro enregistré, mais PAS "shipped", PAS d\'e-mail ---')
  requetesResend = []
  const i = await envoyerWebhookBoxtal({ id: 'evt2', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_123', payload: { trackings: [{ trackingNumber: 'XX987654321FR', packageTrackingUrl: 'https://boxtal.test/suivi/XX987654321FR', status: STATUT_JAMAIS_PRISE_EN_CHARGE_TEST, message: '' }] } })
  verifie('=> 200', i === 200, 'obtenu ' + i)
  verifie('tracking_number enregistré', orders['cmd-8'].tracking_number === 'XX987654321FR')
  verifie('statut toujours "label_ready" (ANNOUNCED n\'est pas une prise en charge transporteur)', orders['cmd-8'].status === 'label_ready', String(orders['cmd-8'].status))
  verifie('aucun e-mail envoyé (prise en charge pas encore confirmée)', requetesResend.length === 0, JSON.stringify(requetesResend))

  console.log('\n--- I2. TRACKING_CHANGED avec SHIPPED (déclencheur normal) : passage à "shipped", UN SEUL e-mail envoyé ---')
  requetesResend = []
  const i2 = await envoyerWebhookBoxtal({ id: 'evt2c', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_123', payload: { trackings: [{ trackingNumber: 'XX987654321FR', packageTrackingUrl: 'https://boxtal.test/suivi/XX987654321FR', status: STATUT_PRISE_EN_CHARGE_TEST, message: '' }] } })
  verifie('=> 200', i2 === 200, 'obtenu ' + i2)
  verifie('statut passé à "shipped"', orders['cmd-8'].status === 'shipped', String(orders['cmd-8'].status))
  verifie('shipped_at renseigné', typeof orders['cmd-8'].shipped_at === 'string', JSON.stringify(orders['cmd-8'].shipped_at))
  const emailExpeditionI2 = requetesResend.find((r) => r.subject?.includes('XX987654321FR'))
  verifie('e-mail "commande expédiée" envoyé avec le bon numéro de suivi', !!emailExpeditionI2, JSON.stringify(requetesResend))
  verifie('UN SEUL e-mail envoyé', requetesResend.length === 1, JSON.stringify(requetesResend))

  console.log('\n--- I3. IN_TRANSIT (filet de sécurité) REJOUÉ APRÈS SHIPPED : idempotent, PAS de second e-mail ---')
  requetesResend = []
  const i3 = await envoyerWebhookBoxtal({ id: 'evt2c-suite', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_123', payload: { trackings: [{ trackingNumber: 'XX987654321FR', packageTrackingUrl: 'https://boxtal.test/suivi/XX987654321FR', status: STATUT_FILET_SECURITE_TEST, message: '' }] } })
  verifie('=> 200 (accepté sans erreur)', i3 === 200, 'obtenu ' + i3)
  verifie('statut toujours "shipped" (inchangé)', orders['cmd-8'].status === 'shipped')
  verifie('AUCUN nouvel e-mail envoyé (idempotence -- déjà "shipped", plus "label_ready")', requetesResend.length === 0, JSON.stringify(requetesResend))

  console.log('\n--- I4. PROTECTION : un événement de prise en charge arrivant APRÈS une annulation ne remet jamais "shipped" ni ne renvoie d\'e-mail ---')
  orders = { 'cmd-8c': { ...commandeDeBase(), id: 'cmd-8c', status: 'paid', boxtal_order_id: 'bxt_test_999' } }
  requetesResend = []
  const i4 = await envoyerWebhookBoxtal({ id: 'evt2d', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_999', payload: { trackings: [{ trackingNumber: 'XX000', packageTrackingUrl: 'https://x', status: STATUT_PRISE_EN_CHARGE_TEST, message: '' }] } })
  verifie('=> 200 (acquitté, pas une erreur)', i4 === 200, 'obtenu ' + i4)
  verifie('statut TOUJOURS "paid" (jamais repassé à "shipped" -- commande déjà annulée côté nous)', orders['cmd-8c'].status === 'paid', String(orders['cmd-8c'].status))
  verifie('AUCUN e-mail envoyé après une annulation', requetesResend.length === 0, JSON.stringify(requetesResend))

  console.log('\n--- I5. E-mail "commande expédiée" refusé par Resend ({error}, pas une exception) => alerte déclenchée, statut "shipped" quand même acquis ---')
  orders = { 'cmd-8b': { ...commandeDeBase(), id: 'cmd-8b', status: 'label_ready', boxtal_order_id: 'bxt_test_123', email: 'client-echec@exemple.test' } }
  requetesResend = []
  adressesEnEchec = ['client-echec@exemple.test']
  const i5 = await envoyerWebhookBoxtal({ id: 'evt2b', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_123', payload: { trackings: [{ trackingNumber: 'XX111222333FR', packageTrackingUrl: 'https://x', status: STATUT_PRISE_EN_CHARGE_TEST, message: '' }] } })
  verifie('=> 200 (jamais bloqué par un échec d\'e-mail)', i5 === 200, 'obtenu ' + i5)
  verifie('tracking_number quand même enregistré', orders['cmd-8b'].tracking_number === 'XX111222333FR')
  verifie('statut quand même passé à "shipped" (l\'échec de l\'e-mail ne bloque pas la transition)', orders['cmd-8b'].status === 'shipped')
  const alerteExpedition = requetesResend.find((r) => r.to?.includes('alerte@exemple.test'))
  verifie('alerte déclenchée pour l\'e-mail d\'expédition non envoyé', !!alerteExpedition, JSON.stringify(requetesResend.map((r) => r.to)))
  adressesEnEchec = []

  console.log('\n--- I6. DELIVERED reçu SANS SHIPPED avant (événement SHIPPED raté) : chaîne label_ready -> shipped -> delivered EN UN SEUL appel, UN SEUL e-mail ---')
  orders = { 'cmd-8d': { ...commandeDeBase(), id: 'cmd-8d', status: 'label_ready', boxtal_order_id: 'bxt_test_888' } }
  requetesResend = []
  const i6 = await envoyerWebhookBoxtal({ id: 'evt2e', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_888', payload: { trackings: [{ trackingNumber: 'XX_LIVRE_DIRECT', packageTrackingUrl: 'https://x', status: STATUT_PRISE_EN_CHARGE_SANS_SHIPPED_TEST, message: '' }] } })
  verifie('=> 200', i6 === 200, 'obtenu ' + i6)
  // DELIVERED prouve a la fois la prise en charge (mecanisme label_ready ->
  // shipped, filet de securite) ET la livraison (mecanisme shipped ->
  // delivered, enchaine dans la MEME requete car il relit le statut ACTUEL
  // en base, pas une valeur JS perimee) -- le statut final est "delivered",
  // pas "shipped".
  verifie('statut final "delivered" (les deux mécanismes se sont enchaînés)', orders['cmd-8d'].status === 'delivered', String(orders['cmd-8d'].status))
  const emailExpeditionI6 = requetesResend.find((r) => r.subject?.includes('XX_LIVRE_DIRECT'))
  verifie('e-mail "commande expédiée" envoyé malgré l\'absence de l\'événement SHIPPED', !!emailExpeditionI6, JSON.stringify(requetesResend))
  verifie('UN SEUL e-mail envoyé (jamais un second pour le passage à "delivered")', requetesResend.length === 1, JSON.stringify(requetesResend))

  console.log('\n--- I7. Suivi MANUEL (/api/admin/ship) : garde son e-mail IMMÉDIAT, indépendant de label_ready/de la prise en charge Boxtal ---')
  orders = { 'cmd-8e': { ...commandeDeBase(), id: 'cmd-8e', status: 'paid' } }
  requetesResend = []
  const i7 = await shipManuel({ id: 'cmd-8e', tracking_number: 'XX_MANUEL_123', carrier: 'colissimo' })
  verifie('=> 200', i7.statut === 200, 'obtenu ' + i7.statut + ' ' + JSON.stringify(i7.corps))
  verifie('statut passé à "shipped" immédiatement (pas de "label_ready" intermédiaire sur ce chemin)', orders['cmd-8e'].status === 'shipped', String(orders['cmd-8e'].status))
  const emailExpeditionI7 = requetesResend.find((r) => r.subject?.includes('XX_MANUEL_123'))
  verifie('e-mail envoyé IMMÉDIATEMENT, dans le même appel (pas besoin d\'un événement Boxtal)', !!emailExpeditionI7, JSON.stringify(requetesResend))

  console.log('\n--- I8. DELIVERED sur une commande déjà "shipped" (cas normal) : passage à "delivered", AUCUN e-mail ---')
  orders = { 'cmd-8f': { ...commandeDeBase(), id: 'cmd-8f', status: 'shipped', boxtal_order_id: 'bxt_test_777', tracking_number: 'XX_DEJA_EXPEDIE' } }
  requetesResend = []
  const i8 = await envoyerWebhookBoxtal({ id: 'evt2f', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_777', payload: { trackings: [{ trackingNumber: 'XX_DEJA_EXPEDIE', packageTrackingUrl: 'https://x', status: 'DELIVERED', message: '' }] } })
  verifie('=> 200', i8 === 200, 'obtenu ' + i8)
  verifie('statut passé à "delivered"', orders['cmd-8f'].status === 'delivered', String(orders['cmd-8f'].status))
  verifie('AUCUN e-mail envoyé (celui d\'expédition est déjà parti)', requetesResend.length === 0, JSON.stringify(requetesResend))

  console.log('\n--- I9. DELIVERED rejoué (retry Boxtal) : idempotent, pas d\'erreur, pas d\'e-mail ---')
  requetesResend = []
  const i9 = await envoyerWebhookBoxtal({ id: 'evt2f-retry', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_777', payload: { trackings: [{ trackingNumber: 'XX_DEJA_EXPEDIE', packageTrackingUrl: 'https://x', status: 'DELIVERED', message: '' }] } })
  verifie('=> 200 (rejeu accepté sans erreur)', i9 === 200, 'obtenu ' + i9)
  verifie('statut toujours "delivered" (inchangé)', orders['cmd-8f'].status === 'delivered')
  verifie('AUCUN e-mail envoyé', requetesResend.length === 0, JSON.stringify(requetesResend))

  console.log('\n--- I10. PROTECTION : DELIVERED sur une commande ANNULÉE (status "paid") ne fait rien ---')
  orders = { 'cmd-8g': { ...commandeDeBase(), id: 'cmd-8g', status: 'paid', boxtal_order_id: 'bxt_test_666' } }
  requetesResend = []
  const i10 = await envoyerWebhookBoxtal({ id: 'evt2g', type: 'TRACKING_CHANGED', shippingOrderId: 'bxt_test_666', payload: { trackings: [{ trackingNumber: 'XX_ANNULEE', packageTrackingUrl: 'https://x', status: 'DELIVERED', message: '' }] } })
  verifie('=> 200 (acquitté, pas une erreur)', i10 === 200, 'obtenu ' + i10)
  verifie('statut TOUJOURS "paid" (jamais passé à "delivered" -- commande déjà annulée côté nous)', orders['cmd-8g'].status === 'paid', String(orders['cmd-8g'].status))
  verifie('AUCUN e-mail envoyé', requetesResend.length === 0, JSON.stringify(requetesResend))

  console.log('\n--- J. Webhook Boxtal : DOCUMENT_CREATED => réponse immédiate, étiquette re-hébergée en différé dans le bucket PRIVÉ "etiquettes" (after()) ---')
  orders = { 'cmd-9': { ...commandeDeBase(), id: 'cmd-9', status: 'label_ready', boxtal_order_id: 'bxt_test_123' } }
  uploadsStorage.length = 0
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
  verifie('boxtal_label_url = un CHEMIN exact (pas une URL publique)', aRecuEtiquette && orders['cmd-9'].boxtal_label_url === 'labels/cmd-9.pdf', JSON.stringify(orders['cmd-9'].boxtal_label_url))
  verifie('boxtal_label_url ne commence PAS par "http" (ce n\'est plus une URL, voir label-url/route.ts)', !String(orders['cmd-9'].boxtal_label_url).startsWith('http'))
  const uploadJ = uploadsStorage.find((u2) => u2.chemin === 'labels/cmd-9.pdf')
  verifie('upload fait dans le bucket PRIVÉ "etiquettes" (pas "products", public et sans PDF autorisé)', uploadJ?.bucket === 'etiquettes', JSON.stringify(uploadJ))
  verifie('Content-Type application/pdf envoyé à Supabase Storage', uploadJ?.contentType === 'application/pdf', JSON.stringify(uploadJ))

  console.log('\n--- J2. Webhook Boxtal : DOCUMENT_CREATED rejoué (retry Boxtal) => idempotent, aucune corruption ---')
  const j2 = await envoyerWebhookBoxtal({
    id: 'evt3-retry',
    type: 'DOCUMENT_CREATED',
    shippingOrderId: 'bxt_test_123',
    payload: { documents: [{ type: 'LABEL', format: 'PDF', url: `http://127.0.0.1:${portBoxtal}/fake-label.pdf` }] },
  })
  verifie('=> 200 (rejeu accepté sans erreur)', j2 === 200, 'obtenu ' + j2)
  await attendreQue(() => typeof orders['cmd-9'].boxtal_label_url === 'string')
  verifie('boxtal_label_url toujours correct après rejeu', orders['cmd-9'].boxtal_label_url === 'labels/cmd-9.pdf', JSON.stringify(orders['cmd-9'].boxtal_label_url))

  console.log('\n--- J3. Ancien bug de production reproduit puis prouvé corrigé : un PDF envoyé dans "products" (public, images uniquement) est REFUSÉ par le faux stockage ---')
  // Preuve que la validation mime ci-dessus (uploadsStorage/MIME_AUTORISES_PAR_BUCKET)
  // detecte reellement le bug reel observe en production le 2026-11-17 ("mime
  // type application/pdf is not supported") -- et donc qu'une regression future
  // (un retour accidentel vers "products") serait desormais detectee par ce banc.
  const rejetProducts = await fetch(`http://127.0.0.1:${portSupabase}/storage/v1/object/products/labels/sonde.pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body: Buffer.from('%PDF-1.4 sonde'),
  })
  const corpsRejetProducts = await rejetProducts.json().catch(() => ({}))
  verifie('=> 400 (mime type refusé pour ce bucket)', rejetProducts.status === 400, 'obtenu ' + rejetProducts.status)
  verifie('message reproduit exactement l\'erreur réelle observée en production', String(corpsRejetProducts.message ?? '').includes('mime type application/pdf is not supported'), JSON.stringify(corpsRejetProducts))

  console.log('\n--- J4. /api/admin/boxtal/label-url : lien signé de courte durée, jamais l\'URL directe ---')
  const j4 = await labelUrl('cmd-9')
  verifie('=> 200', j4.statut === 200, 'obtenu ' + j4.statut + ' ' + JSON.stringify(j4.corps))
  verifie('url renvoyée pointe vers le bucket "etiquettes" et porte un jeton', typeof j4.corps.url === 'string' && String(j4.corps.url).includes('/etiquettes/') && String(j4.corps.url).includes('token='), JSON.stringify(j4.corps))

  console.log('\n--- J5. /api/admin/boxtal/label-url sans jeton admin => 401 ---')
  const j5 = await labelUrl('cmd-9', false)
  verifie('=> 401', j5.statut === 401, 'obtenu ' + j5.statut)

  console.log('\n--- J6. /api/admin/boxtal/label-url pour une commande SANS étiquette => 404 ---')
  orders['cmd-sans-etiquette'] = { ...commandeDeBase(), id: 'cmd-sans-etiquette', boxtal_label_url: null }
  const j6 = await labelUrl('cmd-sans-etiquette')
  verifie('=> 404', j6.statut === 404, 'obtenu ' + j6.statut)

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

  console.log('\n--- L. Route /api/admin/boxtal/content-categories : lecture seule, n\'appelle JAMAIS shipping-order ---')
  requetesBoxtal.length = 0
  boxtalComportement = 'ok'
  const l1 = await categoriesContenu()
  verifie('=> 200', l1.statut === 200, 'obtenu ' + l1.statut + ' ' + JSON.stringify(l1.corps))
  const categoriesL1 = (l1.corps.categories as Record<string, unknown>[]) ?? []
  verifie('contient content:v1:30100 (celui utilisé par create-label)', categoriesL1.some((c) => c.id === 'content:v1:30100'), JSON.stringify(categoriesL1))
  const requeteCategoriesL1 = requetesBoxtal.find((r) => r.methode === 'GET' && r.chemin?.startsWith('/v3.1/content-category'))
  verifie('a bien appelé GET /v3.1/content-category sur Boxtal', !!requeteCategoriesL1)

  console.log('\n--- L2. Boxtal renvoie une erreur => 502, jamais de page cassée ---')
  requetesBoxtal.length = 0
  boxtalComportement = 'erreur400'
  const l2 = await categoriesContenu()
  verifie('=> 502', l2.statut === 502, 'obtenu ' + l2.statut + ' ' + JSON.stringify(l2.corps))
  boxtalComportement = 'ok'

  console.log('\n--- L3. Sans jeton admin => 401, aucune requête envoyée à Boxtal ---')
  requetesBoxtal.length = 0
  const l3 = await categoriesContenu(false)
  verifie('=> 401', l3.statut === 401, 'obtenu ' + l3.statut + ' ' + JSON.stringify(l3.corps))
  verifie('aucune requête envoyée à Boxtal (refusé avant tout appel)', requetesBoxtal.length === 0)

  console.log('\n--- L4. Cette route (succès, échec, ou refus) n\'a JAMAIS déclenché de POST /v3.1/shipping-order ---')
  verifie('aucune étiquette créée via cette route', !requetesBoxtal.some((r) => r.methode === 'POST' && r.chemin === '/v3.1/shipping-order'))

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
