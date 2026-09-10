/**
 * Banc de verification du bloc Robustesse — les correctifs verifiables par API :
 * validation de la note (reviews), verification de ligne touchee (salons PUT,
 * orders PATCH).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-robustesse.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient
 * lieu de Supabase, et le serveur Next demarre avec des variables qui
 * pointent dessus. Meme pre-verification que les autres bancs.
 *
 * CE QUE CE BANC NE PROUVE PAS : que l'admin voit reellement le message
 * d'erreur ou la liste d'articles a l'ecran -- c'est du React cote client,
 * apres hydratation, invisible a un banc HTTP. Comme pour tout le reste de
 * l'interface admin construite jusqu'ici, cette partie est verifiee par
 * relecture de code (types stricts, verifie par tsc) et par le test manuel
 * que Hedi fait lui-meme apres deploiement. Ce banc verifie ce qu'il peut
 * reellement observer : le contrat des routes API (codes de statut, contenu
 * des reponses), qui est la partie la plus a risque de bug logique.
 *
 * Eprouve pour echouer : en retirant `.select().maybeSingle()` de la route
 * salons PUT (retour a l'ancien `.update().eq()` seul), le cas B echoue :
 * un slug inconnu redevient 200 au lieu de 404.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3107
const ADMIN_SECRET = 'banc_robustesse_secret_de_test_1234567890abcdef32'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'bancrobustessealea'
  const charge = `${expiration}.${alea}`
  const sig = createHmac('sha256', ADMIN_SECRET).update(charge).digest('base64url')
  return `${charge}.${sig}`
}

let reviews: Record<string, unknown>[] = []
let salons: Record<string, unknown>[] = [{ slug: 'fougeres', nom: 'SP Barber Shop', actif: true, ordre: 1 }]
let orders: Record<string, unknown>[] = [{ id: 'order-1', email: 'client@exemple.test', status: 'pending', items: [] }]

const recu: { methode: string | undefined; chemin: string }[] = []

const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ methode: req.method, chemin: u.pathname + u.search })
    const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')

    if (u.pathname.includes('/reviews')) {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(reviews)); return
      }
      if (req.method === 'POST') {
        const body = JSON.parse(corps || '{}')
        const entree = { id: 'r' + (reviews.length + 1), ...body }
        reviews.push(entree)
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(objetUnique ? entree : [entree]))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return
    }

    if (u.pathname.includes('/salons')) {
      const slugFiltre = u.searchParams.get('slug')?.replace(/^eq\./, '') ?? null
      if (req.method === 'GET') {
        let lignes = salons.slice()
        if (slugFiltre) lignes = lignes.filter((s) => s.slug === slugFiltre)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(objetUnique ? (lignes[0] ?? null) : lignes))
        return
      }
      if (req.method === 'PATCH') {
        const body = JSON.parse(corps || '{}')
        const idx = slugFiltre ? salons.findIndex((s) => s.slug === slugFiltre) : -1
        if (idx === -1) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return }
        salons[idx] = { ...salons[idx], ...body }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(objetUnique ? salons[idx] : [salons[idx]]))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return
    }

    if (u.pathname.includes('/orders')) {
      const idFiltre = u.searchParams.get('id')?.replace(/^eq\./, '') ?? null
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(orders)); return
      }
      if (req.method === 'PATCH') {
        const body = JSON.parse(corps || '{}')
        const idx = idFiltre ? orders.findIndex((o) => o.id === idFiltre) : -1
        if (idx === -1) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return }
        orders[idx] = { ...orders[idx], ...body }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(objetUnique ? orders[idx] : [orders[idx]]))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return
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

async function admin(chemin: string, methode: string, corps?: unknown): Promise<{ statut: number; corps: unknown }> {
  const r = await fetch(base() + chemin, {
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
  if (!recu.some((r) => r.chemin.includes('/salons'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete /salons.')
    arreter(); faux.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- A. Validation de la note (reviews POST) ---')
  let r = await admin('/api/admin/reviews', 'POST', { author: 'Test', rating: 'abc', text: 'x' })
  verifie('note non numerique => 400', r.statut === 400, 'obtenu ' + r.statut)
  r = await admin('/api/admin/reviews', 'POST', { author: 'Test', rating: '0', text: 'x' })
  verifie('note 0 (hors bornes) => 400', r.statut === 400, 'obtenu ' + r.statut)
  r = await admin('/api/admin/reviews', 'POST', { author: 'Test', rating: '6', text: 'x' })
  verifie('note 6 (hors bornes) => 400', r.statut === 400, 'obtenu ' + r.statut)
  r = await admin('/api/admin/reviews', 'POST', { author: 'Test', rating: '3.5', text: 'x' })
  verifie('note non entiere => 400', r.statut === 400, 'obtenu ' + r.statut)
  verifie('aucun des rejets precedents n a ete enregistre', reviews.length === 0, 'obtenu ' + reviews.length + ' avis')
  r = await admin('/api/admin/reviews', 'POST', { author: 'Test', rating: '4', text: 'Très bien' })
  verifie('note valide (4) => 200/201', r.statut === 200 || r.statut === 201, 'obtenu ' + r.statut)
  verifie('note enregistree EXACTEMENT a 4 (pas ecretee, pas de repli sur 5)', reviews[0]?.rating === 4, 'obtenu ' + JSON.stringify(reviews[0]?.rating))

  console.log('\n--- B. Salons PUT : ligne reellement touchee ---')
  r = await admin('/api/admin/salons', 'PUT', { slug: 'fougeres', nom: 'Nouveau nom' })
  verifie('slug existant => 200', r.statut === 200, 'obtenu ' + r.statut)
  verifie('la ligne retournee reflete la modification', (r.corps as Record<string, unknown>)?.nom === 'Nouveau nom')
  r = await admin('/api/admin/salons', 'PUT', { slug: 'ceci-n-existe-pas', nom: 'x' })
  verifie('slug inconnu => 404 (pas un faux succes)', r.statut === 404, 'obtenu ' + r.statut)

  console.log('\n--- C. Orders PATCH : ligne reellement touchee ---')
  r = await admin('/api/admin/orders', 'PATCH', { id: 'order-1', status: 'shipped' })
  verifie('id existant => 200', r.statut === 200, 'obtenu ' + r.statut)
  verifie('la ligne retournee reflete le nouveau statut', (r.corps as Record<string, unknown>)?.status === 'shipped')
  r = await admin('/api/admin/orders', 'PATCH', { id: 'commande-inexistante', status: 'shipped' })
  verifie('id inconnu => 404 (pas un faux succes)', r.statut === 404, 'obtenu ' + r.statut)

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
