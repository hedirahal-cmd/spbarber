/**
 * Banc de verification du correctif "null explicite vs champ absent" sur
 * social_proof_visible dans PUT /api/admin/products.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-products-visible.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient
 * lieu de Supabase, le serveur Next demarre avec des variables d'environnement
 * qui pointent dessus. Meme pre-verification que les autres bancs. Jeton
 * admin forge avec un ADMIN_SESSION_SECRET connu de ce seul processus.
 *
 * Eprouve pour echouer : en remettant `!== undefined` a la place de `!= null`
 * dans route.ts, le cas A echoue -- un null explicite ecrase la valeur
 * existante avec false au lieu de la preserver.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3111
const ADMIN_SECRET = 'banc_products_visible_secret_de_test_1234567890abcdef'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'bancproductsalea'
  const charge = `${expiration}.${alea}`
  const sig = createHmac('sha256', ADMIN_SECRET).update(charge).digest('base64url')
  return `${charge}.${sig}`
}

let overrides: Record<string, Record<string, unknown>> = {}
const recu: { chemin: string }[] = []

const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ chemin: u.pathname + u.search })
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

async function putAdmin(body: unknown): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/admin/products', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: `spbarber_admin=${jetonAdminValide()}` },
    body: JSON.stringify(body),
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
  await fetch(base() + '/api/admin/products', { headers: { Cookie: `spbarber_admin=${jetonAdminValide()}` } })
  if (!recu.some((r) => r.chemin.includes('/product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete /product_overrides.')
    arreter(); faux.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- A. Un produit visible ("true") ne doit pas basculer a false sur un null explicite ---')
  overrides = { p1: { id: 'p1', name: 'Produit Un', social_proof_text: 'Texte existant', social_proof_visible: true } }
  let r = await putAdmin({ id: 'p1', name: 'Produit Un', price: 1000, description: 'd', stock: 5, benefit: 'b', images: [], social_proof_visible: null })
  verifie('sauvegarde => 200', r.statut === 200, 'obtenu ' + r.statut)
  verifie('social_proof_visible reste true (pas ecrase par le null explicite)', overrides.p1?.social_proof_visible === true, 'obtenu ' + JSON.stringify(overrides.p1?.social_proof_visible))
  verifie('les autres champs ont bien ete mis a jour', overrides.p1?.price === 1000)

  console.log('\n--- B. Une vraie valeur (false) continue de s ecrire ---')
  r = await putAdmin({ id: 'p1', social_proof_visible: false })
  verifie('sauvegarde => 200', r.statut === 200, 'obtenu ' + r.statut)
  verifie('social_proof_visible passe bien a false', overrides.p1?.social_proof_visible === false, 'obtenu ' + JSON.stringify(overrides.p1?.social_proof_visible))

  console.log('\n--- C. Une vraie valeur (true) continue de s ecrire ---')
  r = await putAdmin({ id: 'p1', social_proof_visible: true })
  verifie('sauvegarde => 200', r.statut === 200, 'obtenu ' + r.statut)
  verifie('social_proof_visible passe bien a true', overrides.p1?.social_proof_visible === true, 'obtenu ' + JSON.stringify(overrides.p1?.social_proof_visible))

  console.log('\n--- D. Champ absent (jamais envoye) : non-regression, deja correct avant ---')
  overrides.p1.social_proof_visible = true
  r = await putAdmin({ id: 'p1', name: 'Nom change seul' })
  verifie('sauvegarde => 200', r.statut === 200, 'obtenu ' + r.statut)
  verifie('social_proof_visible inchange (true) quand le champ est absent', overrides.p1?.social_proof_visible === true, 'obtenu ' + JSON.stringify(overrides.p1?.social_proof_visible))
  verifie('le nom a bien ete mis a jour', overrides.p1?.name === 'Nom change seul')

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
