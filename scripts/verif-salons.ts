/**
 * Banc de verification du bloc Salons — suppression du systeme mort et
 * generalisation a N salons (/salon/[slug], TabSalons generique, API CRUD,
 * sitemap, redirection /salon).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-salons.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient
 * lieu de Supabase (table salons : GET/POST/PATCH/DELETE), et le serveur Next
 * est demarre avec des variables d'environnement qui pointent dessus. Meme
 * pre-verification que les autres bancs : on exige la preuve que le trafic
 * Supabase va bien au faux serveur avant de lire la moindre page.
 *
 * Les routes /api/admin/salons exigent une session admin. Plutot que le vrai
 * mot de passe (que je n'ai pas, et qui ne doit pas transiter dans un script),
 * ce banc FORGE un jeton valide avec le meme algorithme que src/lib/admin-auth.ts
 * (HMAC-SHA256), en pointant ADMIN_SESSION_SECRET sur une valeur connue de ce
 * seul processus -- exactement le meme principe que les bancs Stripe, qui
 * forgent une signature de webhook valide avec un STRIPE_WEBHOOK_SECRET connu.
 *
 * CE QUE CE BANC NE PROUVE PAS : que Google reindexera correctement /salon vers
 * /salon/<slug> apres la redirection 308, ni que les donnees structurees sont
 * effectivement exploitees par un moteur de recherche -- des comportements de
 * systemes tiers. Il verifie ce qu'il peut observer : le code HTTP, l'en-tete
 * Location, le contenu du HTML et du JSON-LD rendus, et l'etat reellement
 * ecrit par l'API dans la base (via le faux serveur).
 *
 * Eprouve pour echouer : en renvoyant `${BASE}/salon/fougeres` en dur au lieu du
 * slug de plus petit ordre dans src/app/salon/page.tsx, le cas A (deuxieme
 * partie, apres inversion de l'ordre) echoue. En retirant la coercition
 * latitude/longitude dans /api/admin/salons/route.ts, le cas G (coordonnees)
 * echoue.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3106
const ADMIN_SECRET = 'banc_salons_secret_de_test_1234567890abcdef_32c'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'bancsalonsalea'
  const charge = `${expiration}.${alea}`
  const sig = createHmac('sha256', ADMIN_SECRET).update(charge).digest('base64url')
  return `${charge}.${sig}`
}

type FakeSalon = {
  slug: string; nom: string | null; ville: string | null; code_postal: string | null
  adresse: string | null; telephone: string | null; horaires: string | null
  note_google: string | null; nombre_avis: string | null
  lien_planity: string | null; lien_google_maps: string | null
  actif: boolean; ordre: number; photos: string[]; avis_google: unknown[]
  description: string | null; seo_title: string | null; seo_description: string | null
  latitude: number | null; longitude: number | null
}

const DEFAUT_FAKE_SALON: FakeSalon = {
  slug: '', nom: null, ville: null, code_postal: null, adresse: null, telephone: null,
  horaires: null, note_google: null, nombre_avis: null, lien_planity: null, lien_google_maps: null,
  actif: false, ordre: 0, photos: [], avis_google: [],
  description: null, seo_title: null, seo_description: null, latitude: null, longitude: null,
}

let salons: FakeSalon[] = []
const recu: { methode: string | undefined; chemin: string }[] = []

const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ methode: req.method, chemin: u.pathname + u.search })

    if (!u.pathname.includes('/salons')) {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return
    }

    const slugFiltre = u.searchParams.get('slug')?.replace(/^eq\./, '') ?? null
    const actifFiltre = u.searchParams.get('actif')
    const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')

    if (req.method === 'GET') {
      let lignes = salons.slice()
      if (slugFiltre) lignes = lignes.filter((s) => s.slug === slugFiltre)
      if (actifFiltre === 'eq.true') lignes = lignes.filter((s) => s.actif)
      lignes.sort((a, b) => a.ordre - b.ordre)
      const limit = u.searchParams.get('limit')
      if (limit) lignes = lignes.slice(0, Number(limit))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? (lignes[0] ?? null) : lignes))
      return
    }

    if (req.method === 'POST') {
      const body = JSON.parse(corps || '{}')
      const entree = Array.isArray(body) ? body[0] : body
      if (salons.some((s) => s.slug === entree.slug)) {
        res.writeHead(409, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ code: '23505', message: 'duplicate key' }))
        return
      }
      const nouveau: FakeSalon = { ...DEFAUT_FAKE_SALON, ...entree }
      salons.push(nouveau)
      res.writeHead(201, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? nouveau : [nouveau]))
      return
    }

    if (req.method === 'PATCH') {
      const body = JSON.parse(corps || '{}')
      const idx = slugFiltre ? salons.findIndex((s) => s.slug === slugFiltre) : -1
      if (idx === -1) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return }
      salons[idx] = { ...salons[idx], ...body }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify([salons[idx]]))
      return
    }

    if (req.method === 'DELETE') {
      if (slugFiltre) salons = salons.filter((s) => s.slug !== slugFiltre)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('[]')
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

async function html(chemin: string): Promise<{ statut: number; corps: string }> {
  const r = await fetch(base() + chemin)
  return { statut: r.status, corps: await r.text() }
}

async function admin(methode: string, corps?: unknown, avecCookie = true): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/admin/salons', {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      ...(avecCookie ? { Cookie: `spbarber_admin=${jetonAdminValide()}` } : {}),
    },
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

  salons = [
    { ...DEFAUT_FAKE_SALON, slug: 'fougeres', nom: 'SP Barber Shop', ville: 'Fougères', code_postal: '35300', adresse: '48 Bd Jean Jaurès', actif: true, ordre: 1, note_google: '4.9', nombre_avis: '47', latitude: 48.3522, longitude: -1.2038, seo_title: 'Titre SEO Fougères personnalisé' },
    { ...DEFAUT_FAKE_SALON, slug: 'ernee', nom: 'SP Barbershop Ernée', ville: 'Ernée', code_postal: '53500', actif: true, ordre: 2 },
    { ...DEFAUT_FAKE_SALON, slug: 'brouillon', nom: 'Salon Brouillon', ville: 'Nulle Part', actif: false, ordre: 3 },
  ]

  console.log('\n--- A. Redirection /salon -> salon de plus petit ordre ---')
  let r = await fetch(base() + '/salon', { redirect: 'manual' })
  verifie('statut 308 (redirection permanente)', r.status === 308, 'obtenu ' + r.status)
  verifie('redirige vers /salon/fougeres (ordre 1)', (r.headers.get('location') ?? '').endsWith('/salon/fougeres'), 'obtenu ' + r.headers.get('location'))

  salons[0].ordre = 2; salons[1].ordre = 1
  r = await fetch(base() + '/salon', { redirect: 'manual' })
  verifie('ordre inversé -> redirige maintenant vers /salon/ernee (pas un slug en dur)', (r.headers.get('location') ?? '').endsWith('/salon/ernee'), 'obtenu ' + r.headers.get('location'))
  salons[0].ordre = 1; salons[1].ordre = 2

  console.log('\n--- B. /salon/fougeres : donnees completes (lat/long, note, seo_title) ---')
  let page = await html('/salon/fougeres')
  verifie('statut 200', page.statut === 200)
  verifie('titre SEO personnalisé utilisé', page.corps.includes('Titre SEO Fougères personnalisé'))
  verifie('JSON-LD contient geo (lat/long presentes)', page.corps.includes('"geo"') && page.corps.includes('48.3522'))
  verifie('JSON-LD contient aggregateRating (note presente)', page.corps.includes('"aggregateRating"') && page.corps.includes('"4.9"'))

  console.log('\n--- C. /salon/ernee : donnees minimales (pas de lat/long, pas de note, pas de titre SEO) ---')
  page = await html('/salon/ernee')
  verifie('statut 200', page.statut === 200)
  verifie('titre SEO auto-généré contient la ville (pas un texte fige pour Fougères)', page.corps.includes('Ernée'))
  verifie('JSON-LD n omet PAS geo par erreur globale mais l omet bien ICI (pas de lat/long)', !page.corps.includes('"geo"'))
  verifie('JSON-LD omet aggregateRating (pas de note)', !page.corps.includes('"aggregateRating"'))

  console.log('\n--- D. /salon/inconnu -> 404 ---')
  page = await html('/salon/ceci-n-existe-pas')
  verifie('statut 404', page.statut === 404, 'obtenu ' + page.statut)

  console.log('\n--- E. /salon/brouillon (existe mais actif:false) -> 404 ---')
  page = await html('/salon/brouillon')
  verifie('statut 404 (salon inactif non exposé)', page.statut === 404, 'obtenu ' + page.statut)

  console.log('\n--- F. Sitemap : par salon actif, plus d entree /salon isolee ---')
  page = await html('/sitemap.xml')
  verifie('contient /salon/fougeres', page.corps.includes('/salon/fougeres'))
  verifie('contient /salon/ernee', page.corps.includes('/salon/ernee'))
  verifie('n expose pas le salon inactif brouillon', !page.corps.includes('/salon/brouillon'))
  verifie('n a plus d entree /salon isolee (redirection, pas une page canonique)', !page.corps.includes('<loc>https://spbarber.fr/salon</loc>'))

  console.log('\n--- G. API admin — creation, coercition lat/long, suppression ---')
  let res = await admin('POST', { slug: 'test-salon', nom: 'Test Salon', ville: 'Testville', ordre: 4 })
  verifie('creation => 200/201', res.statut === 200 || res.statut === 201, 'obtenu ' + res.statut + ' ' + JSON.stringify(res.corps))
  verifie('4 salons en base apres creation', salons.length === 4, 'obtenu ' + salons.length)

  res = await admin('PUT', { slug: 'test-salon', latitude: '10.5', longitude: '-20.25' })
  verifie('mise a jour lat/long => 200', res.statut === 200)
  const testSalon = salons.find((s) => s.slug === 'test-salon')
  verifie('latitude stockee en NOMBRE (pas la chaine "10.5")', testSalon?.latitude === 10.5, 'obtenu ' + JSON.stringify(testSalon?.latitude))
  verifie('longitude stockee en NOMBRE (pas la chaine)', testSalon?.longitude === -20.25, 'obtenu ' + JSON.stringify(testSalon?.longitude))

  res = await admin('PUT', { slug: 'test-salon', latitude: '', longitude: '' })
  verifie('champ vide => 200', res.statut === 200)
  const testSalonVide = salons.find((s) => s.slug === 'test-salon')
  verifie('latitude vidée devient null (pas 0, pas NaN, pas "")', testSalonVide?.latitude === null, 'obtenu ' + JSON.stringify(testSalonVide?.latitude))

  res = await admin('DELETE', { slug: 'test-salon' })
  verifie('suppression => 200', res.statut === 200)
  verifie('3 salons en base apres suppression', salons.length === 3, 'obtenu ' + salons.length)

  console.log('\n--- H. API admin sans session : refusee ---')
  res = await admin('POST', { slug: 'intrus', nom: 'x' }, false)
  verifie('POST sans cookie => 401', res.statut === 401)
  res = await admin('DELETE', { slug: 'fougeres' }, false)
  verifie('DELETE sans cookie => 401 (le salon n est pas supprime)', res.statut === 401)
  verifie('fougeres toujours present', salons.some((s) => s.slug === 'fougeres'))

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
