/**
 * Banc de verification du slider avant/apres avec de vraies photos
 * (BeforeAfterSlider.tsx + before_image_url/after_image_url sur
 * product_overrides, produit Shampooing Noir uniquement).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-before-after.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient
 * lieu de Supabase, le serveur Next demarre avec des variables d'environnement
 * qui pointent dessus. Meme pre-verification que les autres bancs. Jeton
 * admin forge avec un ADMIN_SESSION_SECRET connu de ce seul processus.
 *
 * Eprouve pour echouer : en forcant le composant a toujours afficher le
 * dessin CSS (hasPhotos = false en dur), le cas B echoue -- les vraies
 * photos uploadees ne s'affichent plus alors qu'elles sont enregistrees.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3112
const ADMIN_SECRET = 'banc_before_after_secret_de_test_1234567890abcdef'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'bancbeforeafteralea'
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

    if (u.pathname.includes('/product_overrides')) {
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

async function page(chemin: string): Promise<string> {
  return await (await fetch(base() + chemin)).text()
}

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
  await page('/products/shampooing-noir-colorant')
  if (!recu.some((r) => r.chemin.includes('/product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete /product_overrides.')
    arreter(); faux.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- A. Sans photos enregistrees : dessin CSS inchange (pas de regression) ---')
  overrides = {}
  const sansPhotos = await page('/products/shampooing-noir-colorant')
  verifie('le dessin CSS "meches" est toujours present', sansPhotos.includes('aas-hair-wrap'))
  verifie('aucune balise photo aas-photo (rien a afficher)', !sansPhotos.includes('aas-photo'))

  console.log('\n--- B. Avec les 2 photos enregistrees : vraies photos, plus de dessin CSS ---')
  overrides = { '2': { id: '2', before_image_url: 'https://fake.supabase.co/storage/v1/object/public/products/shampooing-noir-colorant-1.jpg', after_image_url: 'https://fake.supabase.co/storage/v1/object/public/products/shampooing-noir-colorant-2.jpg' } }
  const avecPhotos = await page('/products/shampooing-noir-colorant')
  // src="..." (attribut HTML reellement rendu) et non une simple presence dans
  // la page : la donnee des props est aussi serialisee ailleurs dans le HTML
  // (charge utile React), ce qui la rendrait presente meme si le <img> n'est
  // jamais affiche -- piege deja rencontre avec le residu RSC sur ce projet.
  verifie('la balise <img> "avant" est reellement rendue', /aas-photo"[^>]*src="[^"]*shampooing-noir-colorant-1\.jpg"|src="[^"]*shampooing-noir-colorant-1\.jpg"[^>]*aas-photo/.test(avecPhotos))
  verifie('la balise <img> "apres" est reellement rendue', /aas-photo"[^>]*src="[^"]*shampooing-noir-colorant-2\.jpg"|src="[^"]*shampooing-noir-colorant-2\.jpg"[^>]*aas-photo/.test(avecPhotos))
  verifie('le texte alternatif "avant" est sur la balise rendue', avecPhotos.includes('alt="Shampooing Noir Colorant — avant"'))
  verifie('le texte alternatif "après" est sur la balise rendue', avecPhotos.includes('alt="Shampooing Noir Colorant — après"'))
  verifie('le dessin CSS "meches" a disparu (remplace par les photos)', !avecPhotos.includes('class="aas-hair-wrap"'))

  console.log('\n--- C. Une seule des deux photos enregistree : dessin CSS conserve (pas de slider a moitie casse) ---')
  overrides = { '2': { id: '2', before_image_url: 'https://fake.supabase.co/storage/v1/object/public/products/shampooing-noir-colorant-1.jpg', after_image_url: null } }
  const unePhoto = await page('/products/shampooing-noir-colorant')
  verifie('le dessin CSS reste actif tant que les 2 photos ne sont pas la', unePhoto.includes('aas-hair-wrap') && !unePhoto.includes('aas-photo'))

  console.log('\n--- D. Sauvegarde admin : ne doit pas ecraser le reste de la fiche produit ---')
  overrides = {}
  let r = await putAdmin({ id: '2', name: 'Shampooing Custom Test', price: 2890, description: 'd', stock: 10, benefit: 'b', images: [] })
  verifie('sauvegarde complete (onglet Produits) => 200', r.statut === 200, 'obtenu ' + r.statut)
  r = await putAdmin({ id: '2', before_image_url: 'https://fake.supabase.co/storage/v1/object/public/products/x-1.jpg', after_image_url: 'https://fake.supabase.co/storage/v1/object/public/products/x-2.jpg' })
  verifie('sauvegarde avant/apres seule => 200', r.statut === 200, 'obtenu ' + r.statut)
  verifie('le nom personnalise n a pas ete efface', overrides['2']?.name === 'Shampooing Custom Test', 'obtenu ' + JSON.stringify(overrides['2']?.name))
  verifie('before_image_url bien enregistre', overrides['2']?.before_image_url === 'https://fake.supabase.co/storage/v1/object/public/products/x-1.jpg')
  verifie('after_image_url bien enregistre', overrides['2']?.after_image_url === 'https://fake.supabase.co/storage/v1/object/public/products/x-2.jpg')

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
