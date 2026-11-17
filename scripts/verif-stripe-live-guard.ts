/**
 * Banc de verification du garde-fou STRIPE_AUTORISER_LIVE (2026-11-17,
 * demande Hedi, preparation du passage de Stripe en mode LIVE) :
 *   - une cle sk_live_/rk_live_ SANS STRIPE_AUTORISER_LIVE=oui doit faire
 *     refuser le paiement proprement (503), sans jamais appeler Stripe ;
 *   - la MEME cle AVEC STRIPE_AUTORISER_LIVE=oui doit laisser passer
 *     l'appel (voir src/lib/stripe.ts, problemeConfigurationStripe()) ;
 *   - une cle sk_test_ passe sans jamais avoir besoin de cette variable
 *     (le garde-fou ne concerne QUE le mode live).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-stripe-live-guard.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — AUCUN appel reel a Stripe, meme dans le cas "live autorise".
 * Un faux serveur HTTP local tient lieu de Stripe (STRIPE_API_BASE_URL,
 * point d'injection reserve a ce seul banc, voir src/lib/stripe.ts et
 * scripts/banc-serveur.ts -- c'est PRECISEMENT parce que ce redirecteur
 * est pose que banc-serveur.ts accepte de demarrer malgre une cle
 * sk_live_, sinon il refuserait categoriquement, voir son garde-fou).
 * Un faux PostgREST local tient lieu de Supabase (renvoie toujours un
 * tableau vide -- le panier retombe alors sur le catalogue statique, ce
 * qui suffit a eprouver UNIQUEMENT le garde-fou Stripe, pas le calcul de
 * prix deja couvert par verif-f001.ts).
 *
 * Chaque cas redemarre le serveur : STRIPE_AUTORISER_LIVE est lu UNE SEULE
 * fois a l'import de src/lib/stripe.ts (constante de module), impossible a
 * faire varier sans un nouveau processus.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3120
const CLE_LIVE_DE_TEST = 'sk_live_banc_de_test_jamais_reel_1234567890'
const CLE_TEST_NORMALE = 'sk_test_banc_de_test_1234567890'

// ───── Faux Supabase (PostgREST) -- toujours vide, voir commentaire d'en-tete. ─────
const fauxSupabase = http.createServer((req, res) => {
  req.on('data', () => {})
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('[]')
  })
})

// ───── Faux Stripe ─────
const requetesStripe: { methode: string; chemin: string }[] = []
const fauxStripe = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    requetesStripe.push({ methode: req.method ?? '', chemin: u.pathname })
    if (req.method === 'POST' && u.pathname === '/v1/checkout/sessions') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ id: 'cs_test_fake_pour_banc', object: 'checkout.session', url: 'https://checkout.stripe.test/fake' }))
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

async function checkout(): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // id '2' : Shampooing Noir Colorant, produit reel actif du catalogue
    // statique (voir src/lib/products.ts) -- le faux Supabase ne renvoyant
    // aucun override, resolveCartItems retombe sur ce catalogue.
    body: JSON.stringify({ items: [{ product: { id: '2' }, quantity: 1 }] }),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

async function main() {
  await new Promise<void>((r) => fauxSupabase.listen(0, '127.0.0.1', r))
  const portSupabase = (fauxSupabase.address() as AddressInfo).port
  await new Promise<void>((r) => fauxStripe.listen(0, '127.0.0.1', r))
  const portStripe = (fauxStripe.address() as AddressInfo).port
  console.log('  faux PostgREST sur 127.0.0.1:' + portSupabase)
  console.log('  faux Stripe sur 127.0.0.1:' + portStripe)

  const envCommun: NodeJS.ProcessEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portSupabase,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    STRIPE_API_BASE_URL: 'http://127.0.0.1:' + portStripe,
  }
  // STRIPE_AUTORISER_LIVE n'est JAMAIS herite de l'environnement reel --
  // sinon un faux positif serait possible si Hedi l'avait deja posee
  // localement pour un autre essai. Les cas qui en ont besoin la reposent
  // explicitement eux-memes.
  delete envCommun.STRIPE_AUTORISER_LIVE

  console.log('\n--- 0. Le harness LUI-MÊME (banc-serveur.ts) refuse de démarrer avec une clé sk_live_ si rien ne garantit qu\'elle reste hors de portée de Stripe ---')
  {
    const env: NodeJS.ProcessEnv = { ...envCommun, STRIPE_SECRET_KEY: CLE_LIVE_DE_TEST }
    delete env.STRIPE_API_BASE_URL // aucune redirection vers un faux serveur local : le garde-fou doit refuser.
    const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
    verifie('demarrerServeur() renvoie ok:false', demarrage.ok === false)
    verifie('motif explicite (mentionne sk_live_)', !demarrage.ok && demarrage.motif.includes('sk_live_'), !demarrage.ok ? demarrage.motif : '')
    demarrage.arreter()
  }

  console.log('\n--- A. Clé sk_live_ SANS STRIPE_AUTORISER_LIVE : paiement refusé, AUCUN appel à Stripe ---')
  {
    requetesStripe.length = 0
    // STRIPE_AUTORISER_LIVE delibérement ABSENTE (ni 'oui' ni rien d'autre, voir envCommun).
    const env: NodeJS.ProcessEnv = { ...envCommun, STRIPE_SECRET_KEY: CLE_LIVE_DE_TEST }
    const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
    if (!demarrage.ok) {
      console.log('  ARRET : ' + demarrage.motif)
      fauxSupabase.close(); fauxStripe.close(); process.exitCode = 1; return
    }
    const a = await checkout()
    verifie('=> 503 (paiement refusé, pas une erreur serveur imprévue)', a.statut === 503, 'obtenu ' + a.statut + ' ' + JSON.stringify(a.corps))
    verifie('AUCUNE requête envoyée à Stripe (refusé avant tout appel)', requetesStripe.length === 0, JSON.stringify(requetesStripe))
    demarrage.arreter()
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log('\n--- B. MÊME clé sk_live_, AVEC STRIPE_AUTORISER_LIVE=oui : le paiement passe ---')
  {
    requetesStripe.length = 0
    const env: NodeJS.ProcessEnv = { ...envCommun, STRIPE_SECRET_KEY: CLE_LIVE_DE_TEST, STRIPE_AUTORISER_LIVE: 'oui' }
    const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
    if (!demarrage.ok) {
      console.log('  ARRET : ' + demarrage.motif)
      fauxSupabase.close(); fauxStripe.close(); process.exitCode = 1; return
    }
    const b = await checkout()
    verifie('=> 200 (le garde-fou laisse passer)', b.statut === 200, 'obtenu ' + b.statut + ' ' + JSON.stringify(b.corps))
    verifie('une requête de création de session A ÉTÉ envoyée à Stripe', requetesStripe.some((r) => r.methode === 'POST' && r.chemin === '/v1/checkout/sessions'), JSON.stringify(requetesStripe))
    demarrage.arreter()
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log('\n--- C. Clé sk_test_ (mode normal) SANS STRIPE_AUTORISER_LIVE : passe aussi -- le garde-fou ne concerne QUE le mode live ---')
  {
    requetesStripe.length = 0
    const env: NodeJS.ProcessEnv = { ...envCommun, STRIPE_SECRET_KEY: CLE_TEST_NORMALE }
    const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
    if (!demarrage.ok) {
      console.log('  ARRET : ' + demarrage.motif)
      fauxSupabase.close(); fauxStripe.close(); process.exitCode = 1; return
    }
    const c = await checkout()
    verifie('=> 200 (jamais besoin de STRIPE_AUTORISER_LIVE en mode test)', c.statut === 200, 'obtenu ' + c.statut + ' ' + JSON.stringify(c.corps))
    verifie('une requête de création de session A ÉTÉ envoyée à Stripe', requetesStripe.some((r) => r.methode === 'POST' && r.chemin === '/v1/checkout/sessions'), JSON.stringify(requetesStripe))
    demarrage.arreter()
  }

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  fauxSupabase.close()
  fauxStripe.close()
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
