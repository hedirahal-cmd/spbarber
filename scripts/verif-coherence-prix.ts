/**
 * Banc de verification de la cohérence des prix (2026-11-18, demande Hedi,
 * suite au signalement "shampooing-noir-colorant affiche 28,90 € alors que
 * la base dit 44,90 €") :
 *
 *   - AUCUNE fiche produit ne doit avoir de prix code en dur qui ignore
 *     product_overrides (recherche exhaustive, voir le rapport) ;
 *   - pour CHAQUE produit reel du catalogue (ids 2,3,4,5,7,8,9) : le prix
 *     affiche sur la fiche, le montant resolu pour le panier
 *     (resolveCartItems) et le unit_amount reellement envoye a Stripe au
 *     moment du paiement doivent etre IDENTIQUES, que l'override soit
 *     absent (repli sur le catalogue statique) ou present avec un prix
 *     different (le nouveau prix doit l'emporter PARTOUT, l'ancien ne doit
 *     plus apparaitre nulle part) ;
 *   - cas particulier tondeuses (ids 8/9, actif:false tant que le chantier
 *     dropshipping n'est pas termine) : dans leur etat reel actuel, ni la
 *     fiche ni le panier ne doivent les exposer ; une fois "activees" (via
 *     override, simulant l'etat apres lancement), la meme coherence de prix
 *     s'applique.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-coherence-prix.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — aucune base reelle, aucun appel reel a Stripe. Faux PostgREST
 * ET faux Stripe locaux (meme principe que verif-prix-repli.ts et
 * verif-stripe-live-guard.ts) : la session Stripe "creee" est entierement
 * simulee, son corps est seulement inspecte pour en extraire le montant.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { demarrerServeur } from './banc-serveur'
import { PRODUCTS } from '../src/lib/products'

const PORT_NEXT = 3121
// Volontairement tres different de TOUS les prix statiques reels, pour que
// la provenance du montant affiche soit sans ambiguite possible.
const PRIX_OVERRIDE_TEST = 12340 // 123,40 €

type OverrideRow = { id: string; name: null; price: number | null; description: null; stock: null; benefit: null; images: never[]; actif: boolean | null }

let overrideRows: OverrideRow[] = []

const fauxSupabase = http.createServer((req, res) => {
  req.on('data', () => {})
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    if (u.pathname.includes('/product_overrides')) {
      const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      if (objetUnique) {
        res.end(JSON.stringify(overrideRows[0] ?? null))
      } else {
        res.end(JSON.stringify(overrideRows))
      }
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('[]')
  })
})

const requetesStripe: { chemin: string; corps: string }[] = []
const fauxStripe = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    requetesStripe.push({ chemin: u.pathname, corps })
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

/** "4490" (centimes) => "44,90", pour chercher dans le HTML sans dependre
 *  du caractere exact que Intl.NumberFormat insere entre le chiffre et "€". */
function frag(centimes: number): string {
  return (centimes / 100).toFixed(2).replace('.', ',')
}

async function page(chemin: string): Promise<{ statut: number; html: string }> {
  const r = await fetch(base() + chemin)
  return { statut: r.status, html: await r.text() }
}

async function checkout(id: string): Promise<{ statut: number; corps: Record<string, unknown> }> {
  requetesStripe.length = 0
  const r = await fetch(base() + '/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ product: { id }, quantity: 1 }] }),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

/** Extrait line_items[0][price_data][unit_amount] du corps form-urlencoded
 *  envoye par le SDK Stripe au faux serveur. */
function unitAmountEnvoyeAStripe(): number | null {
  const requete = requetesStripe.find((r) => r.chemin === '/v1/checkout/sessions')
  if (!requete) return null
  const params = new URLSearchParams(requete.corps)
  const valeur = params.get('line_items[0][price_data][unit_amount]')
  return valeur === null ? null : Number(valeur)
}

async function main() {
  await new Promise<void>((r) => fauxSupabase.listen(0, '127.0.0.1', r))
  const portSupabase = (fauxSupabase.address() as AddressInfo).port
  await new Promise<void>((r) => fauxStripe.listen(0, '127.0.0.1', r))
  const portStripe = (fauxStripe.address() as AddressInfo).port
  console.log('  faux PostgREST sur 127.0.0.1:' + portSupabase)
  console.log('  faux Stripe sur 127.0.0.1:' + portStripe)

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portSupabase,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    STRIPE_API_BASE_URL: 'http://127.0.0.1:' + portStripe,
    ALERT_EMAIL: '',
    RESEND_API_KEY: '',
  }
  delete env.STRIPE_AUTORISER_LIVE

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter(); fauxSupabase.close(); fauxStripe.close(); process.exitCode = 1; return
  }
  const { arreter } = demarrage

  const produitsActifsStatique = PRODUCTS.filter((p) => p.actif !== false)
  const produitsInactifsStatique = PRODUCTS.filter((p) => p.actif === false)
  verifie(
    'catalogue : 5 produits actifs + 2 tondeuses inactives (sinon ce banc ne couvre plus les bons ids)',
    produitsActifsStatique.length === 5 && produitsInactifsStatique.length === 2,
    `${produitsActifsStatique.map((p) => p.id)} / ${produitsInactifsStatique.map((p) => p.id)}`,
  )

  console.log('\n--- A. Produits actifs, AUCUN override : fiche = panier = Stripe, tous au prix STATIQUE ---')
  for (const produit of produitsActifsStatique) {
    overrideRows = []
    const p = await page('/products/' + produit.slug)
    verifie(`${produit.name} : fiche => 200`, p.statut === 200, 'obtenu ' + p.statut)
    verifie(`${produit.name} : fiche affiche ${frag(produit.price)} €`, p.html.includes(frag(produit.price)))

    const c = await checkout(produit.id)
    verifie(`${produit.name} : panier accepte (200)`, c.statut === 200, JSON.stringify(c.corps))
    const montant = unitAmountEnvoyeAStripe()
    verifie(`${produit.name} : unit_amount envoyé à Stripe = ${produit.price}`, montant === produit.price, 'obtenu ' + montant)
  }

  console.log('\n--- B. Produits actifs, AVEC un override qui change le prix : le NOUVEAU prix l\'emporte partout, l\'ANCIEN ne doit plus apparaître nulle part ---')
  for (const produit of produitsActifsStatique) {
    overrideRows = [{ id: produit.id, name: null, price: PRIX_OVERRIDE_TEST, description: null, stock: null, benefit: null, images: [], actif: true }]
    const p = await page('/products/' + produit.slug)
    verifie(`${produit.name} : fiche affiche le NOUVEAU prix (${frag(PRIX_OVERRIDE_TEST)} €)`, p.html.includes(frag(PRIX_OVERRIDE_TEST)))
    verifie(`${produit.name} : fiche n'affiche PLUS l'ancien prix statique (${frag(produit.price)} €)`, !p.html.includes(frag(produit.price)))

    const c = await checkout(produit.id)
    const montant = unitAmountEnvoyeAStripe()
    verifie(`${produit.name} : Stripe facture le NOUVEAU prix (${PRIX_OVERRIDE_TEST}), pas l'ancien`, montant === PRIX_OVERRIDE_TEST, 'obtenu ' + montant)
  }
  overrideRows = []

  console.log('\n--- C. Tondeuses, état RÉEL actuel (actif:false, aucun override, chantier dropshipping pas terminé) : ni fiche ni panier ne les exposent ---')
  for (const produit of produitsInactifsStatique) {
    overrideRows = []
    const p = await page('/products/' + produit.slug)
    verifie(`${produit.name} : fiche => 404 (pas encore publiée)`, p.statut === 404, 'obtenu ' + p.statut)

    const c = await checkout(produit.id)
    verifie(`${produit.name} : panier REFUSE (pas de montant facturé pour un produit non publié)`, c.statut !== 200, JSON.stringify(c.corps))
    verifie(`${produit.name} : message explicite "indisponible"`, String(c.corps.error ?? '').includes('indisponible'), JSON.stringify(c.corps))
  }

  console.log('\n--- D. Tondeuses, une fois ACTIVÉES (override actif:true, simulation de l\'état après lancement) : même cohérence fiche = panier = Stripe ---')
  for (const produit of produitsInactifsStatique) {
    overrideRows = [{ id: produit.id, name: null, price: PRIX_OVERRIDE_TEST, description: null, stock: null, benefit: null, images: [], actif: true }]
    const p = await page('/products/' + produit.slug)
    verifie(`${produit.name} activée : fiche => 200`, p.statut === 200, 'obtenu ' + p.statut)
    verifie(`${produit.name} activée : fiche affiche ${frag(PRIX_OVERRIDE_TEST)} €`, p.html.includes(frag(PRIX_OVERRIDE_TEST)))

    const c = await checkout(produit.id)
    verifie(`${produit.name} activée : panier accepté (200)`, c.statut === 200, JSON.stringify(c.corps))
    const montant = unitAmountEnvoyeAStripe()
    verifie(`${produit.name} activée : unit_amount envoyé à Stripe = ${PRIX_OVERRIDE_TEST}`, montant === PRIX_OVERRIDE_TEST, 'obtenu ' + montant)
  }
  overrideRows = []

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
