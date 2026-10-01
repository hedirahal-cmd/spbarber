/**
 * Banc de verification du bloc Contenu -- onglet admin pour editer/masquer
 * les bandeaux marketing du site (bandeau d'annonce, bannière CTA accueil,
 * 4 reperes de confiance fiche produit).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-contenu.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient
 * lieu de Supabase (product_overrides + site_content), le serveur Next
 * demarre avec des variables d'environnement qui pointent dessus. Meme
 * pre-verification que les autres bancs. Jeton admin forge avec un
 * ADMIN_SESSION_SECRET connu de ce seul processus.
 *
 * Eprouve pour echouer (2 regressions distinctes) :
 * 1. En revenant a un upsert "aveugle" dans PUT /api/admin/products (sans
 *    relire la ligne existante avant d'ecrire), le cas C echoue : editer un
 *    champ isole (before_image_url) efface le nom personnalise du produit
 *    deja enregistre par l'onglet Produits.
 * 2. En retirant la liste blanche de cles dans PUT /api/admin/site-content,
 *    le cas B echoue : une cle inconnue est acceptee et enregistree.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3110
const ADMIN_SECRET = 'banc_contenu_secret_de_test_1234567890abcdef'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'banccontenualea'
  const charge = `${expiration}.${alea}`
  const sig = createHmac('sha256', ADMIN_SECRET).update(charge).digest('base64url')
  return `${charge}.${sig}`
}

let overrides: Record<string, Record<string, unknown>> = {}
let siteContent: Record<string, Record<string, unknown>> = {}
const recu: { methode: string | undefined; chemin: string }[] = []

function normaliserCorps(corps: string): Record<string, unknown>[] {
  const parsed = JSON.parse(corps || '{}')
  return Array.isArray(parsed) ? parsed : [parsed]
}

const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ methode: req.method, chemin: u.pathname + u.search })
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
        for (const l of normaliserCorps(corps)) {
          overrides[String(l.id)] = { ...l }
        }
        res.writeHead(201, { 'Content-Type': 'application/json' }); res.end('[]')
        return
      }
    }

    if (u.pathname.includes('/site_content')) {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(Object.values(siteContent)))
        return
      }
      if (req.method === 'POST') {
        for (const l of normaliserCorps(corps)) {
          siteContent[String(l.key)] = { ...l }
        }
        res.writeHead(201, { 'Content-Type': 'application/json' }); res.end('[]')
        return
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('[]')
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

async function putAdmin(chemin: string, body: unknown): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + chemin, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: `spbarber_admin=${jetonAdminValide()}` },
    body: JSON.stringify(body),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
}

/** Bornee par un marqueur de fin plutot qu'une longueur fixe -- les icones
 * lucide rendent en SVG inline de taille variable, une longueur fixe coupe
 * parfois avant le dernier item. */
function zoneEntre(html: string, debut: string, fin: string): string {
  const i = html.indexOf(debut)
  if (i === -1) return ''
  const j = html.indexOf(fin, i)
  return j === -1 ? html.slice(i, i + 4000) : html.slice(i, j)
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
  await page('/')
  if (!recu.some((r) => r.chemin.includes('/site_content') || r.chemin.includes('/product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete attendue.')
    arreter(); faux.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- A. Valeurs par defaut (aucune ligne en base) = copie actuelle du site ---')
  const accueil = await page('/')
  verifie('bandeau d annonce par defaut present', accueil.includes('Livraison offerte dès 59€ · Expédition 48h'))
  verifie('bannière CTA par defaut presente', accueil.includes('Rejoignez nos clients satisfaits'))

  const ficheCurl = await page('/products/creme-curl-control')
  // "France" masque par defaut depuis le 2026-10-01 (decision Hedi, formulation
  // a revoir) -- seuls 3 reperes sur 4 sont visibles tant qu'il reste masque.
  verifie('les 3 reperes de confiance visibles par defaut sont presents', ['Sécurisé', 'Livraison 3-5 jours', 'Retour 30j'].every((t) => ficheCurl.includes(t)))
  verifie('repere France masque par defaut', !ficheCurl.includes('🇫🇷'))

  console.log('\n--- B. Edition des bandeaux du site (site_content) ---')
  let r = await putAdmin('/api/admin/site-content', { key: 'announcement_bar', text: 'TEXTE PERSO BANDEAU', visible: true })
  verifie('sauvegarde bandeau => 200', r.statut === 200, 'obtenu ' + r.statut)
  let accueil2 = await page('/')
  verifie('nouveau texte du bandeau applique', accueil2.includes('TEXTE PERSO BANDEAU'))
  verifie('ancien texte du bandeau disparu', !accueil2.includes('Livraison offerte dès 59€ · Expédition 48h'))

  r = await putAdmin('/api/admin/site-content', { key: 'home_cta_banner', text: 'Peu importe', visible: false })
  verifie('masquage bannière CTA => 200', r.statut === 200, 'obtenu ' + r.statut)
  accueil2 = await page('/')
  verifie('bannière CTA masquee (texte absent)', !accueil2.includes('Rejoignez nos clients satisfaits') && !accueil2.includes('>Peu importe<'))

  r = await putAdmin('/api/admin/site-content', { key: 'cle_qui_nexiste_pas', text: 'x', visible: true })
  verifie('cle de bandeau inconnue rejetee => 400', r.statut === 400, 'obtenu ' + r.statut)
  verifie('rien enregistre pour cette cle inconnue', !('cle_qui_nexiste_pas' in siteContent))

  console.log('\n--- C. Edition partielle (avant/apres) ne doit PAS ecraser le reste de la fiche produit ---')
  r = await putAdmin('/api/admin/products', { id: '1', name: 'Cire Custom Test', price: 1999, description: 'd', stock: 5, benefit: 'b', images: [] })
  verifie('sauvegarde complete (onglet Produits) => 200', r.statut === 200, 'obtenu ' + r.statut)
  r = await putAdmin('/api/admin/products', { id: '1', before_image_url: 'https://exemple.test/avant.jpg' })
  verifie('sauvegarde partielle (champ isole) => 200', r.statut === 200, 'obtenu ' + r.statut)
  verifie('le nom personnalise du produit 1 n a PAS ete efface', overrides['1']?.name === 'Cire Custom Test', 'obtenu ' + JSON.stringify(overrides['1']?.name))
  verifie('le champ isole a bien ete enregistre', overrides['1']?.before_image_url === 'https://exemple.test/avant.jpg')

  const ficheCire2 = await page('/products/cire-cheveux-premium')
  verifie('nom personnalise toujours affiche sur la fiche', ficheCire2.includes('Cire Custom Test'))

  console.log('\n--- D. Edition des reperes de confiance, un par un ---')
  r = await putAdmin('/api/admin/site-content', { key: 'trust_livraison', text: 'Livraison express 24h', visible: true })
  verifie('sauvegarde repere Livraison => 200', r.statut === 200, 'obtenu ' + r.statut)
  r = await putAdmin('/api/admin/site-content', { key: 'trust_securise', text: 'Sécurisé', visible: false })
  verifie('masquage repere Sécurisé => 200', r.statut === 200, 'obtenu ' + r.statut)

  const ficheCire4 = await page('/products/cire-cheveux-premium')
  const zoneTrust = zoneEntre(ficheCire4, 'trust-row', 'sn-hero-right')
  verifie('nouveau texte du repere Livraison applique dans la rangee', zoneTrust.includes('Livraison express 24h'))
  verifie('ancien texte "Livraison 3-5 jours" disparu de la rangee', !zoneTrust.includes('Livraison 3-5 jours'))
  verifie('repere Sécurisé masque (absent de la rangee)', !zoneTrust.includes('Sécurisé'))
  verifie('le repere non touche reste present', zoneTrust.includes('Retour 30j'))

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
