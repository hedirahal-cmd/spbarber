/**
 * Banc de verification du bloc Stock — verifie au checkout, decremente au
 * paiement, la Tondeuse (dropshipping) hors du systeme.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-stock.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient lieu
 * de Supabase (product_overrides ET la fonction RPC decrementer_stock), et le
 * serveur Next est demarre avec des variables d environnement qui pointent
 * dessus. Meme pre-verification que les autres bancs : on exige la preuve que
 * le trafic Supabase va bien au faux serveur avant d envoyer le moindre webhook.
 *
 * CE QUE CE BANC NE PROUVE PAS : que la vraie fonction SQL decrementer_stock,
 * une fois appliquee par Hedi, garantit l'atomicite sous une vraie concurrence
 * Postgres. Cette garantie vient du UPDATE ... WHERE stock >= p_quantite dans
 * la meme instruction (verrouillage de ligne standard) -- une propriete du SQL
 * lui-meme, qu'un banc JS contre un faux serveur ne peut pas mettre a l'epreuve.
 * Ce banc verifie ce qu'il peut reellement observer : que le CODE APPELANT
 * (webhook) reagit correctement a chaque reponse possible de cette fonction
 * (un nombre, ou null), pas que Postgres tient sa promesse d'atomicite.
 *
 * Le mecanisme d'alerte lui-meme (silence si ALERT_EMAIL/RESEND_API_KEY absents,
 * ne leve jamais) est deja couvert par scripts/verif-f004.ts -- ce banc-ci ne
 * revalide que le declenchement correct au bon moment, pas ses entrailles.
 *
 * Eprouve pour echouer : en retirant le controle de stock dans
 * src/lib/pricing.ts (resoudreLigne), le cas 2 passe au rouge.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { demarrerServeur } from './banc-serveur'
import Stripe from 'stripe'

const SECRET_WEBHOOK = 'whsec_banc_stock'
const PORT_NEXT = 3104

// Stock en memoire, cote FAUX PostgREST -- reinitialise avant chaque groupe de
// cas pour que les tests restent independants les uns des autres.
let stock: Record<string, number> = {}
const appelsRpc: { id: string; quantite: number; stockParDefaut: number }[] = []
const recu: { chemin: string; corps: string }[] = []

const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const chemin = req.url ?? ''
    recu.push({ chemin, corps })

    if (req.method === 'POST' && chemin.includes('/rpc/decrementer_stock')) {
      const { p_id, p_quantite, p_stock_par_defaut } = JSON.parse(corps || '{}')
      appelsRpc.push({ id: p_id, quantite: p_quantite, stockParDefaut: p_stock_par_defaut })

      // Reproduit exactement la semantique voulue pour la vraie fonction SQL :
      // amorce une ligne au defaut SEULEMENT si elle n existe pas encore, puis
      // decremente seulement si le stock disponible couvre la quantite.
      if (!(p_id in stock)) stock[p_id] = p_stock_par_defaut
      let resultat: number | null
      if (stock[p_id] >= p_quantite) {
        stock[p_id] -= p_quantite
        resultat = stock[p_id]
      } else {
        resultat = null
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(resultat))
      return
    }

    if (req.method === 'GET' && chemin.includes('/product_overrides')) {
      const lignes = Object.entries(stock).map(([id, s]) => ({
        id, name: null, price: null, description: null, stock: s, benefit: null,
      }))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(lignes))
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

const base = () => 'http://127.0.0.1:' + PORT_NEXT

async function checkout(items: unknown[]): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  return { statut: r.status, corps: await r.json() }
}

const stripe = new Stripe('sk_test_bidon', { apiVersion: '2026-05-27.dahlia' })

function evenementPaiement(items: { id: string; variantId?: string; qty: number }[]) {
  return JSON.stringify({
    id: 'evt_stock_' + Math.random().toString(36).slice(2, 10),
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_stock_' + Math.random().toString(36).slice(2, 10),
        object: 'checkout.session',
        payment_intent: 'pi_test_stock_' + Math.random().toString(36).slice(2, 10),
        amount_total: 1000,
        currency: 'eur',
        livemode: false,
        customer_details: { email: 'client@exemple.test', address: null },
        collected_information: null,
        metadata: { items: JSON.stringify(items) },
      },
    },
  })
}

async function envoyerWebhook(items: { id: string; variantId?: string; qty: number }[]): Promise<number> {
  const charge = evenementPaiement(items)
  const sig = stripe.webhooks.generateTestHeaderString({ payload: charge, secret: SECRET_WEBHOOK })
  const r = await fetch(base() + '/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
    body: charge,
  })
  return r.status
}

// Cire Cheveux Premium (id 1) : non-dropshipping, stock statique 50.
const ligneCire = (qty: number) => ({
  product: { id: '1', name: 'Cire', slug: 'cire-cheveux-premium', description: 'x', price: 2490, images: [], category: 'coiffant', stock: 50, is_dropshipping: false, created_at: '2026-01-01T00:00:00.000Z' },
  quantity: qty,
})

// Tondeuse Fade Pro (id 6) : dropshipping, variante Elite -- hors du systeme.
const ligneTondeuse = (qty: number) => ({
  product: { id: '6', name: 'Tondeuse', slug: 'tondeuse-fade-pro', description: 'x', price: 7990, images: [], category: 'accessoire', stock: 999, is_dropshipping: true, created_at: '2026-01-01T00:00:00.000Z' },
  variant: { id: '6c', name: 'Elite', price: 9990 },
  quantity: qty,
})

async function main() {
  await new Promise<void>((r) => faux.listen(0, '127.0.0.1', r))
  const portFaux = (faux.address() as AddressInfo).port
  console.log('  faux PostgREST sur 127.0.0.1:' + portFaux)

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portFaux,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    // STRIPE_SECRET_KEY volontairement PAS ecrasee : /api/stripe/checkout
    // appelle reellement l'API Stripe (contrairement au webhook, qui ne fait
    // qu'une verification de signature locale). Next charge .env.local pour
    // toute variable absente d'ici, exactement comme scripts/verif-f001.ts --
    // une fausse cle serait rejetee par la vraie API Stripe (Invalid API Key).
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

  console.log('\n--- 0. Pre-verification : Supabase est-il detourne ? ---')
  recu.length = 0
  await fetch(base() + '/products').catch(() => {})
  if (!recu.some((r) => r.chemin.includes('product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete. Les variables')
    console.log('  d environnement n ont PAS ete substituees. Aucun test ne sera joue.')
    arreter()
    faux.close()
    process.exitCode = 1
    return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- 1. Checkout, quantite dans la limite du stock ---')
  stock = { '1': 50 }
  let r = await checkout([ligneCire(10)])
  if (r.statut !== 200) console.log('    corps recu :', JSON.stringify(r.corps))
  verifie('quantite 10 sur stock 50 => 200', 200, r.statut)

  console.log('\n--- 2. Checkout, quantite au-dela du stock (la regression a verrouiller) ---')
  stock = { '1': 3 }
  r = await checkout([ligneCire(5)])
  verifie('quantite 5 sur stock 3 => refuse', 409, r.statut)
  verifie('  message exploitable pour le client', true,
    typeof r.corps.error === 'string' && r.corps.error.includes('3'))

  console.log('\n--- 3. Tondeuse (dropshipping) : le stock est ignore, meme force a 0 ---')
  // Une quantite enorme se heurterait au plafond de 100/ligne (garde-fou de
  // volume, sans rapport avec le stock, qui s'applique a tout le monde) : ca ne
  // prouverait rien de precis. La preuve nette, c'est qu'un override de stock a
  // 0 pour ce produit -- rien n'empeche techniquement d'en ecrire un -- reste
  // sans le moindre effet, puisque is_dropshipping court-circuite le controle
  // avant meme de regarder cette valeur.
  stock = { '6': 0 }
  r = await checkout([ligneTondeuse(2)])
  if (r.statut !== 200) console.log('    corps recu :', JSON.stringify(r.corps))
  verifie('stock override a 0, dropshipping => quand meme 200', 200, r.statut)

  console.log('\n--- 4. Paiement reussi : le webhook decremente reellement ---')
  stock = { '2': 40 }
  appelsRpc.length = 0
  let statutWebhook = await envoyerWebhook([{ id: '2', qty: 3 }])
  verifie('webhook => 200', 200, statutWebhook)
  verifie('la fonction a ete appelee avec la bonne quantite', 3, appelsRpc[0]?.quantite)
  verifie('le stock a reellement diminue', 37, stock['2'])

  console.log('\n--- 5. Paiement reussi sur la Tondeuse : AUCUN decrement ---')
  appelsRpc.length = 0
  statutWebhook = await envoyerWebhook([{ id: '6', variantId: '6c', qty: 500 }])
  verifie('webhook => 200', 200, statutWebhook)
  verifie('aucun appel a decrementer_stock pour un produit dropshipping', 0, appelsRpc.length)

  console.log('\n--- 6. Stock epuise PENDANT que le paiement etait en cours ---')
  console.log('    (deux clients ont pu payer les derniers exemplaires en meme temps)')
  stock = { '1': 1 }
  statutWebhook = await envoyerWebhook([{ id: '1', qty: 2 }])
  verifie('la commande est TOUJOURS enregistree (Stripe a deja encaisse)', 200, statutWebhook)
  verifie('le stock ne passe pas sous zero', 1, stock['1'])

  console.log('\n--- 7. Produit inconnu ou ligne malformee dans les metadonnees : ignore, pas de crash ---')
  statutWebhook = await envoyerWebhook([{ id: 'inexistant', qty: 1 }])
  verifie('webhook => 200 malgre un produit introuvable', 200, statutWebhook)

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  arreter()
  faux.close()
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
