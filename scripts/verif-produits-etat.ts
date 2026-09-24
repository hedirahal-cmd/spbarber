/**
 * Banc de verification du bloc Etat produit — fiche active/inactive (retrait
 * du site sans suppression, comme actif sur les salons) et Bestsellers de
 * l'accueil configurables en admin (case a cocher + ordre + badge/categorie
 * en texte libre, avec repli automatique si vide).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-produits-etat.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient
 * lieu de Supabase (product_overrides), le serveur Next demarre avec des
 * variables d'environnement qui pointent dessus. Meme pre-verification que
 * les autres bancs. Jeton admin forge avec un ADMIN_SESSION_SECRET connu de
 * ce seul processus.
 *
 * CE QUE CE BANC NE PROUVE PAS : que Stripe rejette reellement une session de
 * paiement deja creee avant la desactivation -- resolveCartItems refuse la
 * ligne AVANT tout appel a Stripe, ce banc verifie ce point precis, pas le
 * comportement de Stripe lui-meme.
 *
 * Eprouve pour echouer :
 * - en retirant `if (product.actif === false) notFound()` dans
 *   products/[slug]/page.tsx, le cas A echoue (200 au lieu de 404).
 * - en retirant le controle actif dans src/lib/pricing.ts, le cas E echoue
 *   (checkout accepte un produit desactive).
 * - en remettant `!== undefined` a la place de `!= null` pour actif/
 *   is_bestseller dans PUT /api/admin/products, le cas F echoue.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3113
const ADMIN_SECRET = 'banc_produits_etat_secret_de_test_1234567890abcdef'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'bancproduitsetatalea'
  const charge = `${expiration}.${alea}`
  const sig = createHmac('sha256', ADMIN_SECRET).update(charge).digest('base64url')
  return `${charge}.${sig}`
}

let overrides: Record<string, Record<string, unknown>> = {}
const recu: { methode: string | undefined; chemin: string }[] = []

const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ methode: req.method, chemin: u.pathname + u.search })
    const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')

    if (!u.pathname.includes('/product_overrides')) {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return
    }

    if (req.method === 'GET') {
      const idFiltre = u.searchParams.get('id')
      let lignes = Object.values(overrides)
      if (idFiltre) {
        const id = idFiltre.replace(/^eq\./, '')
        lignes = lignes.filter((l) => l.id === id)
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? (lignes[0] ?? null) : lignes))
      return
    }

    if (req.method === 'POST') {
      const parsed = JSON.parse(corps || '{}')
      for (const l of Array.isArray(parsed) ? parsed : [parsed]) {
        overrides[String(l.id)] = { ...l }
      }
      res.writeHead(201, { 'Content-Type': 'application/json' }); res.end('[]')
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]')
  })
})

let ok = 0
let ko = 0
function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) { ok++; console.log('  OK    ' + nom) }
  else { ko++; console.log('  ECHEC ' + nom + (detail ? '\n        ' + detail : '')) }
}

const base = () => 'http://127.0.0.1:' + PORT_NEXT

async function page(chemin: string): Promise<{ statut: number; corps: string }> {
  const r = await fetch(base() + chemin)
  return { statut: r.status, corps: await r.text() }
}

async function putAdmin(body: unknown, avecCookie = true): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/admin/products', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(avecCookie ? { Cookie: `spbarber_admin=${jetonAdminValide()}` } : {}) },
    body: JSON.stringify(body),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

async function getAdmin(): Promise<Record<string, unknown>[]> {
  const r = await fetch(base() + '/api/admin/products', { headers: { Cookie: `spbarber_admin=${jetonAdminValide()}` } })
  return r.json()
}

async function checkout(items: unknown[]): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  return { statut: r.status, corps: await r.json() }
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
    ADMIN_SESSION_SECRET: ADMIN_SECRET,
    ALERT_EMAIL: '',
    RESEND_API_KEY: '',
  }

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter(); faux.close(); process.exitCode = 1; return
  }
  const arreter = demarrage.arreter

  console.log('\n--- 0. Pre-verification : Supabase est-il detourne ? ---')
  recu.length = 0
  await fetch(base() + '/products').catch(() => {})
  if (!recu.some((r) => r.chemin.includes('product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete. Les variables')
    console.log('  d environnement n ont PAS ete substituees. Aucun test ne sera joue.')
    arreter(); faux.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- A. Fiche produit desactivee (id 2, Shampooing Noir) -> 404 ---')
  overrides = { '2': { id: '2', actif: false } }
  let p = await page('/products/shampooing-noir-colorant')
  verifie('statut 404', p.statut === 404, 'obtenu ' + p.statut)

  console.log('\n--- B. Fiche produit sans override -> 200 (non-regression) ---')
  overrides = {}
  p = await page('/products/shampooing-noir-colorant')
  verifie('statut 200', p.statut === 200, 'obtenu ' + p.statut)

  console.log('\n--- C. Liste /products : exclut la fiche desactivee, garde les autres ---')
  overrides = { '2': { id: '2', actif: false } }
  p = await page('/products')
  const debutListe = p.corps.indexOf('prod-grid')
  const finListe = p.corps.indexOf('</section>', debutListe)
  const zoneListe = p.corps.slice(debutListe, finListe)
  verifie('Shampooing Noir absent de la liste (footer non concerne, hors perimetre)', !zoneListe.includes('shampooing-noir-colorant'))
  verifie('Cire Cheveux (non touchee) toujours presente', zoneListe.includes('cire-cheveux-premium'))

  console.log('\n--- D. Accueil : Bestsellers configures en admin ---')
  overrides = {
    '5': { id: '5', is_bestseller: true, bestseller_ordre: 1, bestseller_badge: 'Meilleure vente', bestseller_cat: 'Pack complet · Barbe' },
    '2': { id: '2', is_bestseller: true, bestseller_ordre: 2, bestseller_badge: null, bestseller_cat: null },
    '7': { id: '7', is_bestseller: true, bestseller_ordre: 3 },
    '4': { id: '4', is_bestseller: true, bestseller_ordre: 4 },
    '3': { id: '3', is_bestseller: true, bestseller_ordre: 0, actif: false },
    '1': { id: '1', is_bestseller: false },
  }
  p = await page('/')
  const debutGrille = p.corps.indexOf('best2-grid')
  const finGrille = p.corps.indexOf('</section>', debutGrille)
  const zoneBestsellers = p.corps.slice(debutGrille, finGrille)
  const nbCartes = (zoneBestsellers.match(/best2-card"/g) ?? []).length
  verifie('exactement 3 cartes rendues (grille figee a 3 colonnes)', nbCartes === 3, 'obtenu ' + nbCartes)
  verifie('Pack Barbe present avec son badge personnalise', zoneBestsellers.includes('Meilleure vente') && zoneBestsellers.includes('pack-barbe-complet'))
  verifie('Shampooing Noir : repli automatique sur le badge generique "Bestseller"', zoneBestsellers.includes('shampooing-noir-colorant'))
  verifie('Poudre Texturante presente (3e, ordre 3)', zoneBestsellers.includes('poudre-texturante'))
  verifie('Creme Curl absente malgre is_bestseller:true (actif:false doit primer)', !zoneBestsellers.includes('creme-curl-control'))
  verifie('Cire Cheveux absente des Bestsellers (is_bestseller:false)', !zoneBestsellers.includes('cire-cheveux-premium'))
  verifie('raccourci accueil pointe vers la Poudre, plus vers la Cire', p.corps.includes('/products/poudre-texturante') && !p.corps.includes('/products/cire-cheveux-premium" class'))

  console.log('\n--- E. Checkout : produit desactive refuse, meme via un lien/panier deja existant ---')
  overrides = { '2': { id: '2', actif: false } }
  const ligneShampoing = {
    product: { id: '2', name: 'Shampooing', slug: 'shampooing-noir-colorant', description: 'x', price: 2890, images: [], category: 'soin', stock: 50, is_dropshipping: false, created_at: '2026-01-01T00:00:00.000Z' },
    quantity: 1,
  }
  const rc = await checkout([ligneShampoing])
  verifie('checkout refuse => 400', rc.statut === 400, 'obtenu ' + rc.statut + ' ' + JSON.stringify(rc.corps))
  verifie('message exploitable', typeof rc.corps.error === 'string' && rc.corps.error.includes('indisponible'), 'obtenu ' + JSON.stringify(rc.corps.error))

  console.log('\n--- F. API admin : actif/is_bestseller ne s ecrasent pas silencieusement ---')
  overrides = { '5': { id: '5', name: 'Pack Barbe', actif: true, is_bestseller: true, bestseller_ordre: 1 } }
  let res = await putAdmin({ id: '5', stock: 40 })
  verifie('sauvegarde partielle (stock seul) => 200', res.statut === 200)
  verifie('actif preserve (pas ecrase par l absence du champ)', overrides['5'].actif === true)
  verifie('is_bestseller preserve', overrides['5'].is_bestseller === true)
  verifie('le nom n a pas ete efface', overrides['5'].name === 'Pack Barbe')

  res = await putAdmin({ id: '5', actif: false })
  verifie('desactivation explicite => 200', res.statut === 200)
  verifie('actif passe bien a false', overrides['5'].actif === false)
  verifie('is_bestseller toujours intact malgre la desactivation', overrides['5'].is_bestseller === true)

  console.log('\n--- G. API admin : GET retourne aussi les produits inactifs (visibilite admin) ---')
  const liste = await getAdmin()
  verifie('le produit desactive apparait quand meme dans la liste admin', liste.some((r) => r.id === '5' && r.actif === false))

  console.log('\n--- H. API admin sans session : refusee ---')
  res = await putAdmin({ id: '5', actif: false }, false)
  verifie('PUT sans cookie => 401', res.statut === 401)

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
