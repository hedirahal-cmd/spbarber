/**
 * Banc de verification du bloc Avis (selecteur de note + produits multiples).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-avis-produits.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient
 * lieu de Supabase, le serveur Next demarre avec des variables qui pointent
 * dessus. Meme pre-verification que les autres bancs. Jeton admin forge avec
 * un ADMIN_SESSION_SECRET connu de ce seul processus, meme principe que les
 * bancs precedents (salons, robustesse).
 *
 * Eprouve pour echouer : en retirant le filtrage des ids inconnus dans
 * /api/admin/reviews (POST), le cas B echoue -- l'id fantome se retrouve
 * enregistre tel quel.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3108
const ADMIN_SECRET = 'banc_avis_produits_secret_de_test_1234567890abcdef'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'bancavisalea'
  const charge = `${expiration}.${alea}`
  const sig = createHmac('sha256', ADMIN_SECRET).update(charge).digest('base64url')
  return `${charge}.${sig}`
}

let reviews: Record<string, unknown>[] = []
const recu: { methode: string | undefined; chemin: string }[] = []

const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ methode: req.method, chemin: u.pathname + u.search })
    const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')

    if (!u.pathname.includes('/reviews')) {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return
    }

    if (req.method === 'GET') {
      const visibleFiltre = u.searchParams.get('visible')
      let lignes = reviews.slice()
      if (visibleFiltre === 'eq.true') lignes = lignes.filter((r) => r.visible === true)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? (lignes[0] ?? null) : lignes))
      return
    }

    if (req.method === 'POST') {
      const body = JSON.parse(corps || '{}')
      const entree = { id: 'r' + (reviews.length + 1), ...body }
      reviews.push(entree)
      res.writeHead(201, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? entree : [entree]))
      return
    }

    if (req.method === 'PATCH') {
      const idFiltre = u.searchParams.get('id')?.replace(/^eq\./, '') ?? null
      const body = JSON.parse(corps || '{}')
      const idx = idFiltre ? reviews.findIndex((r) => r.id === idFiltre) : -1
      if (idx === -1) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return }
      reviews[idx] = { ...reviews[idx], ...body }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? reviews[idx] : [reviews[idx]]))
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

async function admin(methode: string, corps?: unknown): Promise<{ statut: number; corps: unknown }> {
  const r = await fetch(base() + '/api/admin/reviews', {
    method: methode,
    headers: { 'Content-Type': 'application/json', Cookie: `spbarber_admin=${jetonAdminValide()}` },
    body: corps !== undefined ? JSON.stringify(corps) : undefined,
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
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
  }

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter(); faux.close(); process.exitCode = 1; return
  }
  const arreter = demarrage.arreter

  console.log('\n--- 0. Pre-verification : Supabase est-il detourne ? ---')
  recu.length = 0
  await fetch(base() + '/').catch(() => {})
  if (!recu.some((r) => r.chemin.includes('/reviews'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete /reviews.')
    arreter(); faux.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- A. Validation de la note (regression, via le validateur partage) ---')
  let r = await admin('POST', { author: 'Test', rating: 'abc', text: 'Un texte assez long pour passer.', product_ids: [] })
  verifie('note non numerique => 400', r.statut === 400, 'obtenu ' + r.statut)
  verifie('rien enregistre', reviews.length === 0, 'obtenu ' + reviews.length)

  console.log('\n--- B. Filtrage des ids produit ---')
  r = await admin('POST', { author: 'Karim', rating: '5', text: 'Excellent produit, je recommande.', product_ids: ['1', 'id-fantome', '5'] })
  verifie('creation => 200/201', r.statut === 200 || r.statut === 201, 'obtenu ' + r.statut)
  verifie('les 2 ids reels sont conserves', JSON.stringify(reviews[0]?.product_ids) === JSON.stringify(['1', '5']), 'obtenu ' + JSON.stringify(reviews[0]?.product_ids))
  verifie('l id fantome a ete filtre (pas juste ignore globalement)', !((reviews[0]?.product_ids as string[])?.includes('id-fantome')))

  r = await admin('POST', { author: 'Sans Produit', rating: '4', text: 'Avis sans produit precis associe.' })
  verifie('product_ids absent => tableau vide, pas d erreur', Array.isArray(reviews[1]?.product_ids) && (reviews[1]?.product_ids as string[]).length === 0)

  console.log('\n--- C. Bascule "verifie" (route generique, deja en place) ---')
  r = await admin('PUT', { id: reviews[0].id, verified: true })
  verifie('bascule verifie => 200', r.statut === 200, 'obtenu ' + r.statut)
  verifie('la ligne est bien passee a verified:true', reviews[0]?.verified === true)

  console.log('\n--- D. Page d accueil : resolution des noms de produits ---')
  reviews[0].visible = true
  reviews[0].product_ids = ['1']
  const legacy = { id: 'legacy-1', author: 'Ancien Avis', rating: 5, text: 'Avis cree avant ce champ.', visible: true, product_name: 'Nom En Dur Historique' }
  reviews.push(legacy)
  const page = await (await fetch(base() + '/')).text()
  verifie('avis avec product_ids => vrai nom resolu depuis PRODUCTS (Cire Cheveux Premium)', page.includes('Cire Cheveux Premium'))
  verifie('avis historique sans product_ids => repli sur product_name', page.includes('Nom En Dur Historique'))

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
