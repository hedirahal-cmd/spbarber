/**
 * Banc de verification du bouton "Supprimer la commande" (2026-11-17,
 * demande Hedi) : /api/admin/orders/delete (GET apercu d'eligibilite, POST
 * suppression reelle).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-suppression-commande.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — AUCUN appel reel a Stripe ni a Supabase. Un faux serveur HTTP
 * local tient lieu de Stripe (STRIPE_API_BASE_URL -- point d'injection
 * reserve a ce seul banc, voir src/lib/stripe.ts, meme principe que
 * BOXTAL_API_BASE_URL/RESEND_BASE_URL) : il simule un PaymentIntent en mode
 * LIVE, ce qu'aucun appel reel ne pourrait faire sans encaissement reel. Un
 * autre faux serveur tient lieu de Supabase (PostgREST), meme pre-
 * verification que les autres bancs. Jeton admin forge avec un
 * ADMIN_SESSION_SECRET connu de ce seul processus.
 *
 * CE QUE CE BANC NE PROUVE PAS : le rendu du bouton (actif/grise selon
 * l'eligibilite), de la confirmation inline ("Voulez-vous vraiment
 * supprimer...") et de ses deux boutons Annuler/Supprimer -- composant
 * React client, aucun banc de ce projet ne pilote de rendu cote client a ce
 * jour (meme limite documentee pour les onglets de statut, voir
 * verif-boxtal.ts). Le bug "erreur Boxtal partagee entre commandes" (sujet
 * 1 de cette meme demande) est, lui, un bug d'etat React cote client --
 * non testable ici pour la meme raison ; sa moitie serveur (message propre,
 * lecture d'etat avant annulation) est testee dans verif-boxtal.ts (cas
 * F/F2/F3/F4).
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3119
const ADMIN_SECRET = 'banc_suppression_secret_de_test_1234567890abcdef'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'bancsuppressionalea'
  const charge = `${expiration}.${alea}`
  const sig = createHmac('sha256', ADMIN_SECRET).update(charge).digest('base64url')
  return `${charge}.${sig}`
}

// ───── Faux Supabase (PostgREST) ─────
type OrderRow = Record<string, unknown>
let orders: Record<string, OrderRow> = {}
const requetesSupabase: { methode: string; chemin: string }[] = []

const fauxSupabase = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    requetesSupabase.push({ methode: req.method ?? '', chemin: u.pathname + u.search })
    const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')

    if (u.pathname.includes('/orders')) {
      const idFiltre = u.searchParams.get('id')?.replace(/^eq\./, '') ?? null
      if (req.method === 'GET') {
        const ligne = idFiltre ? orders[idFiltre] : undefined
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(objetUnique ? (ligne ?? null) : ligne ? [ligne] : []))
        return
      }
      if (req.method === 'DELETE') {
        if (idFiltre && orders[idFiltre]) delete orders[idFiltre]
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('[]')
        return
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('[]')
  })
})

// ───── Faux Stripe ─────
/** livemode par id de PaymentIntent -- configurable par cas de test. */
let livemodeParIntent: Record<string, boolean> = {}
/**
 * Simule les reponses NON "livemode:false explicite" (2026-11-17, demande
 * Hedi : toute erreur Stripe -- reseau, 404, cle absente, reponse
 * inattendue -- doit aboutir a un REFUS, jamais a une autorisation) :
 *   - 'ok' : comportement normal, voir livemodeParIntent.
 *   - 'erreur500' : panne cote Stripe (meme famille qu'une erreur reseau --
 *     le SDK leve une exception dans les deux cas, attrapee de facon
 *     identique par estCommandeDeTest).
 *   - 'sansLivemode' : reponse 200 valide mais SANS le champ livemode --
 *     prouve que c'est bien l'egalite stricte === false qui autorise,
 *     jamais une absence de refus explicite.
 */
let comportementStripe: 'ok' | 'erreur500' | 'sansLivemode' = 'ok'
const requetesStripe: { methode: string; chemin: string }[] = []

const fauxStripe = http.createServer((req, res) => {
  req.on('data', () => {})
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    requetesStripe.push({ methode: req.method ?? '', chemin: u.pathname })
    const m = u.pathname.match(/^\/v1\/payment_intents\/([^/]+)/)
    if (req.method === 'GET' && m) {
      const id = m[1]
      if (comportementStripe === 'erreur500') {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'panne simulee (banc suppression)' } }))
        return
      }
      if (comportementStripe === 'sansLivemode') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ id, object: 'payment_intent' }))
        return
      }
      if (!(id in livemodeParIntent)) {
        // Cas REEL (confirme par Hedi) : un pi_ de TEST interroge avec des
        // cles LIVE (ou l'inverse) -- Stripe scope les PaymentIntent par
        // mode de cle, la reponse est un 404 generique "No such
        // payment_intent", identique a un id simplement inexistant.
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: 'No such payment_intent' } }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ id, object: 'payment_intent', livemode: livemodeParIntent[id] }))
      return
    }
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { message: 'not found (faux Stripe de banc)' } }))
  })
})

let ok = 0
let ko = 0
function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) { ok++; console.log('  OK    ' + nom) }
  else { ko++; console.log('  ECHEC ' + nom + (detail ? '\n        ' + detail : '')) }
}

const base = () => 'http://127.0.0.1:' + PORT_NEXT

async function eligibilite(id: string, avecCookie = true): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/admin/orders/delete?id=' + encodeURIComponent(id), {
    headers: avecCookie ? { Cookie: `spbarber_admin=${jetonAdminValide()}` } : {},
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

async function supprimer(id: string, avecCookie = true): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/admin/orders/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(avecCookie ? { Cookie: `spbarber_admin=${jetonAdminValide()}` } : {}) },
    body: JSON.stringify({ id }),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

function commandeDeBase(id: string): OrderRow {
  return {
    id, email: 'client@exemple.test', items: [{ id: '2', qty: 1 }], total: 2890, status: 'paid',
    stripe_payment_intent_id: null, boxtal_order_id: null,
  }
}

async function main() {
  await new Promise<void>((r) => fauxSupabase.listen(0, '127.0.0.1', r))
  const portSupabase = (fauxSupabase.address() as AddressInfo).port
  await new Promise<void>((r) => fauxStripe.listen(0, '127.0.0.1', r))
  const portStripe = (fauxStripe.address() as AddressInfo).port
  console.log('  faux PostgREST sur 127.0.0.1:' + portSupabase)
  console.log('  faux Stripe sur 127.0.0.1:' + portStripe)

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portSupabase,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    ADMIN_SESSION_SECRET: ADMIN_SECRET,
    STRIPE_SECRET_KEY: 'sk_test_bidon_de_banc',
    STRIPE_API_BASE_URL: 'http://127.0.0.1:' + portStripe,
  }

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env, capturerSortie: true })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter(); fauxSupabase.close(); fauxStripe.close(); process.exitCode = 1; return
  }
  const { arreter, sortie } = demarrage

  console.log('\n--- 0. Pre-verification : Supabase et Stripe sont-ils detournes ? ---')
  requetesSupabase.length = 0; requetesStripe.length = 0
  await eligibilite('inconnue')
  if (!requetesSupabase.some((r) => r.chemin.includes('/orders'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete /orders.')
    arreter(); fauxSupabase.close(); fauxStripe.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase détourné vers le faux serveur')

  console.log('\n--- A. Sans jeton admin => 401 (GET eligibilité ET POST suppression) ---')
  const a1 = await eligibilite('peu-importe', false)
  verifie('GET => 401', a1.statut === 401, 'obtenu ' + a1.statut)
  const a2 = await supprimer('peu-importe', false)
  verifie('POST => 401', a2.statut === 401, 'obtenu ' + a2.statut)

  console.log('\n--- B. Commande introuvable => 404 ---')
  const b = await supprimer('commande-inexistante')
  verifie('=> 404', b.statut === 404, 'obtenu ' + b.statut)

  console.log('\n--- C. Commande SANS stripe_payment_intent_id (commande réelle "legacy", ou champ jamais rempli) : refusée, AUCUN appel Stripe ---')
  orders = { 'cmd-c': { ...commandeDeBase('cmd-c'), stripe_payment_intent_id: null } }
  requetesStripe.length = 0
  const c1 = await eligibilite('cmd-c')
  verifie('GET => supprimable:false', c1.corps.supprimable === false, JSON.stringify(c1.corps))
  verifie('GET => raison = message commande réelle', String(c1.corps.raison ?? '').includes('Les commandes réelles ne peuvent pas être supprimées'), JSON.stringify(c1.corps))
  const c2 = await supprimer('cmd-c')
  verifie('POST => 403', c2.statut === 403, 'obtenu ' + c2.statut)
  verifie('POST => message exact', c2.corps.error === 'Les commandes réelles ne peuvent pas être supprimées : utilise Annuler.', JSON.stringify(c2.corps))
  verifie('AUCUN appel Stripe (rien à vérifier sans payment_intent_id)', requetesStripe.length === 0, JSON.stringify(requetesStripe))
  verifie('commande TOUJOURS présente (refusée, rien supprimé)', !!orders['cmd-c'])

  console.log('\n--- D. Étiquette Boxtal active (boxtal_order_id non vide) : refusée AVANT toute vérification Stripe ---')
  orders = { 'cmd-d': { ...commandeDeBase('cmd-d'), stripe_payment_intent_id: 'pi_test_peu_importe', boxtal_order_id: 'bxt_actif_123' } }
  livemodeParIntent = { pi_test_peu_importe: false }
  requetesStripe.length = 0
  const d1 = await eligibilite('cmd-d')
  verifie('GET => supprimable:false', d1.corps.supprimable === false, JSON.stringify(d1.corps))
  verifie('GET => raison = étiquette Boxtal', String(d1.corps.raison ?? '').includes("Annule d'abord l'étiquette Boxtal"), JSON.stringify(d1.corps))
  const d2 = await supprimer('cmd-d')
  verifie('POST => 400', d2.statut === 400, 'obtenu ' + d2.statut)
  verifie('POST => message exact', d2.corps.error === "Annule d'abord l'étiquette Boxtal.", JSON.stringify(d2.corps))
  verifie('AUCUN appel Stripe (le garde-fou Boxtal passe avant)', requetesStripe.length === 0, JSON.stringify(requetesStripe))
  verifie('commande TOUJOURS présente', !!orders['cmd-d'])

  console.log('\n--- E. Commande RÉELLE (PaymentIntent en mode LIVE confirmé par Stripe) : refusée ---')
  orders = { 'cmd-e': { ...commandeDeBase('cmd-e'), stripe_payment_intent_id: 'pi_test_reel_999' } }
  livemodeParIntent = { pi_test_reel_999: true }
  const e1 = await eligibilite('cmd-e')
  verifie('GET => supprimable:false', e1.corps.supprimable === false, JSON.stringify(e1.corps))
  const e2 = await supprimer('cmd-e')
  verifie('POST => 403', e2.statut === 403, 'obtenu ' + e2.statut)
  verifie('POST => message exact (pas "annule d\'abord", c\'est bien le motif Stripe réel)', e2.corps.error === 'Les commandes réelles ne peuvent pas être supprimées : utilise Annuler.', JSON.stringify(e2.corps))
  verifie('commande TOUJOURS présente', !!orders['cmd-e'])

  console.log('\n--- E2. Stripe répond 404 "No such payment_intent" (ex. pi_ de TEST interrogé avec des clés LIVE, ou l\'inverse) : REFUSÉE ---')
  // Repond directement au point 2 de Hedi : avec des cles live en
  // production, un pi_ de test (jamais connu de Stripe sous ces cles-la)
  // recoit exactement cette reponse 404 -- le comportement observe ici est
  // donc celui qu'il aura reellement en production.
  orders = { 'cmd-e2': { ...commandeDeBase('cmd-e2'), stripe_payment_intent_id: 'pi_jamais_vu_sous_ces_cles' } }
  livemodeParIntent = {} // id absent de la map => 404 cote faux Stripe
  const e2a = await eligibilite('cmd-e2')
  verifie('GET => supprimable:false', e2a.corps.supprimable === false, JSON.stringify(e2a.corps))
  const e2b = await supprimer('cmd-e2')
  verifie('POST => 403 (jamais 200 -- une erreur Stripe n\'autorise JAMAIS la suppression)', e2b.statut === 403, 'obtenu ' + e2b.statut)
  verifie('commande TOUJOURS présente', !!orders['cmd-e2'])

  console.log('\n--- E3. Panne côté Stripe (500 -- même famille qu\'une erreur réseau/timeout pour ce code) : REFUSÉE ---')
  orders = { 'cmd-e3': { ...commandeDeBase('cmd-e3'), stripe_payment_intent_id: 'pi_peu_importe_e3' } }
  comportementStripe = 'erreur500'
  const e3a = await eligibilite('cmd-e3')
  verifie('GET => supprimable:false', e3a.corps.supprimable === false, JSON.stringify(e3a.corps))
  const e3b = await supprimer('cmd-e3')
  verifie('POST => 403 (jamais 200 sur une panne Stripe)', e3b.statut === 403, 'obtenu ' + e3b.statut)
  verifie('commande TOUJOURS présente', !!orders['cmd-e3'])
  comportementStripe = 'ok'

  console.log('\n--- E4. Réponse Stripe sans le champ livemode (200 valide, mais incomplet) : REFUSÉE ---')
  // Prouve que c'est bien l'egalite stricte "livemode === false" qui
  // autorise -- jamais un simple "pas de refus explicite" (si le champ
  // etait absent/undefined et traite comme "pas live", ce cas passerait a
  // tort -- il doit rester refuse).
  orders = { 'cmd-e4': { ...commandeDeBase('cmd-e4'), stripe_payment_intent_id: 'pi_peu_importe_e4' } }
  comportementStripe = 'sansLivemode'
  const e4 = await supprimer('cmd-e4')
  verifie('POST => 403 (champ livemode absent => jamais autorisé)', e4.statut === 403, 'obtenu ' + e4.statut)
  verifie('commande TOUJOURS présente', !!orders['cmd-e4'])
  comportementStripe = 'ok'

  console.log('\n--- F. Commande de TEST (PaymentIntent en mode test confirmé par Stripe) : supprimée pour de vrai ---')
  orders = { 'cmd-f': { ...commandeDeBase('cmd-f'), stripe_payment_intent_id: 'pi_test_vrai_test_111' } }
  livemodeParIntent = { pi_test_vrai_test_111: false }
  const f1 = await eligibilite('cmd-f')
  verifie('GET => supprimable:true', f1.corps.supprimable === true, JSON.stringify(f1.corps))
  const sortieAvant = sortie()
  const f2 = await supprimer('cmd-f')
  verifie('POST => 200', f2.statut === 200, 'obtenu ' + f2.statut + ' ' + JSON.stringify(f2.corps))
  verifie('la commande a RÉELLEMENT disparu du stockage', !orders['cmd-f'])
  const aLoggue = await (async () => {
    for (let i = 0; i < 20; i++) {
      const s = sortie().slice(sortieAvant.length)
      if (s.includes('cmd-f')) return s
      await new Promise((r) => setTimeout(r, 50))
    }
    return sortie().slice(sortieAvant.length)
  })()
  verifie('la suppression est journalisée côté serveur (id de la commande)', aLoggue.includes('commande supprimée') && aLoggue.includes('cmd-f'), aLoggue)
  verifie('le log porte une date (horodatage ISO)', /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(aLoggue), aLoggue)

  console.log('\n--- G. Suppression ne touche QUE la commande demandée (pas de suppression en masse) ---')
  orders = {
    'cmd-g1': { ...commandeDeBase('cmd-g1'), stripe_payment_intent_id: 'pi_test_g1' },
    'cmd-g2': { ...commandeDeBase('cmd-g2'), stripe_payment_intent_id: 'pi_test_g2' },
  }
  livemodeParIntent = { pi_test_g1: false, pi_test_g2: false }
  const g = await supprimer('cmd-g1')
  verifie('=> 200', g.statut === 200, 'obtenu ' + g.statut)
  verifie('cmd-g1 supprimée', !orders['cmd-g1'])
  verifie('cmd-g2 INTACTE (pas de suppression en masse)', !!orders['cmd-g2'])

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  arreter()
  fauxSupabase.close()
  fauxStripe.close()
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
