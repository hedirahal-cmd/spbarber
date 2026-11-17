/**
 * Banc de verification du mode "bientot disponible" (src/proxy.ts) --
 * 2026-11-17, demande Hedi (audit SEO avant ouverture) : le noindex/503
 * disparaissent-ils reellement, sans cache residuel, quand l'admin passe le
 * site a "ouvert" ?
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-ouverture-site.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — AUCUNE base reelle : un faux PostgREST local tient lieu de
 * Supabase pour la seule table lue par proxy.ts (`site_content`). Ce banc
 * est le SEUL a demarrer le serveur avec `forcerSiteOuvert: false` (voir
 * banc-serveur.ts) -- tous les autres continuent de contourner ce mode.
 *
 * DUREE : ce banc attend reellement ~31s en cas B pour laisser expirer le
 * cache en memoire de 30s documente dans proxy.ts -- c'est la preuve REELLE
 * de la transition, pas une hypothese sur le code.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHmac } from 'node:crypto'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3121
const ADMIN_SECRET = 'banc_ouverture_secret_de_test_1234567890abcdef'

function jetonAdminValide(): string {
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const alea = 'bancouverturealea'
  const charge = `${expiration}.${alea}`
  const sig = createHmac('sha256', ADMIN_SECRET).update(charge).digest('base64url')
  return `${charge}.${sig}`
}

// ───── Faux Supabase (PostgREST) -- uniquement site_content, voir proxy.ts ─────
let siteOuvert = false
const MESSAGE_ATTENTE = 'Ouverture imminente, restez connectés.'

const fauxSupabase = http.createServer((req, res) => {
  req.on('data', () => {})
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    if (u.pathname.includes('/site_content')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify([{ visible: siteOuvert, text: MESSAGE_ATTENTE }]))
      return
    }
    // Tout le reste (salons, reviews, temoignages_pros, product_overrides...) :
    // tableau vide -- la page d'accueil retombe alors sur ses propres replis
    // statiques (DEFAULT_SALONS, etc.), ce qui suffit a l'afficher sans erreur.
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

async function main() {
  await new Promise<void>((r) => fauxSupabase.listen(0, '127.0.0.1', r))
  const portSupabase = (fauxSupabase.address() as AddressInfo).port
  console.log('  faux PostgREST sur 127.0.0.1:' + portSupabase)

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portSupabase,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    ADMIN_SESSION_SECRET: ADMIN_SECRET,
  }

  // cheminSonde: '/robots.txt' (2026-11-17) -- ce banc demarre le site
  // VOLONTAIREMENT ferme (503 attendu et correct sur '/'), la sonde de
  // demarrage par defaut ('/', qui exige un 200) ne verrait donc jamais ce
  // serveur comme "pret". /robots.txt, exclu du proxy, repond toujours 200.
  const demarrage = await demarrerServeur({ port: PORT_NEXT, env, forcerSiteOuvert: false, cheminSonde: '/robots.txt' })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    // demarrage.arreter() AUSSI dans ce cas : si le processus next dev TOURNE
    // ENCORE (budget epuise, voir banc-serveur.ts) et qu'on ne l'arrete pas
    // ici, il reste orphelin en arriere-plan indefiniment -- bug reel observe
    // le 2026-11-17 (compilation ralentie par un second `next dev` concurrent
    // lance par erreur sur ce meme depot, jamais par ce banc lui-meme).
    demarrage.arreter()
    fauxSupabase.close(); process.exitCode = 1; return
  }
  const { arreter } = demarrage

  console.log('\n--- A. Site FERMÉ (site_ouvert=false) : 503, noindex, aucun cache ---')
  {
    const r = await fetch(base() + '/')
    const html = await r.text()
    verifie('=> 503', r.status === 503, 'obtenu ' + r.status)
    verifie('contient "Bientôt disponible"', html.includes('Bientôt disponible'))
    verifie('contient le message réel (pas un texte figé)', html.includes(MESSAGE_ATTENTE))
    verifie('<meta name="robots" content="noindex,nofollow"> présente', html.includes('name="robots" content="noindex,nofollow"'))
    verifie('en-tête X-Robots-Tag: noindex, nofollow', r.headers.get('x-robots-tag') === 'noindex, nofollow')
    verifie('en-tête Cache-Control: no-store (aucun cache ne doit garder cette page fermée)', r.headers.get('cache-control') === 'no-store')
  }

  console.log('\n--- A2. robots.txt et sitemap.xml restent accessibles MÊME site fermé (exclus du proxy, voir son matcher) ---')
  {
    const r = await fetch(base() + '/robots.txt')
    const txt = await r.text()
    verifie('robots.txt => 200 (jamais la page d\'attente)', r.status === 200, 'obtenu ' + r.status)
    verifie('robots.txt réel (contient Sitemap:)', txt.includes('Sitemap:'))
    const r2 = await fetch(base() + '/sitemap.xml')
    verifie('sitemap.xml => 200 (jamais la page d\'attente)', r2.status === 200, 'obtenu ' + r2.status)
  }

  console.log('\n--- A3. Une session admin valide traverse normalement le site, même fermé ---')
  {
    const r = await fetch(base() + '/', { headers: { Cookie: `spbarber_admin=${jetonAdminValide()}` } })
    const html = await r.text()
    verifie('=> 200 (pas 503 pour un admin connecté)', r.status === 200, 'obtenu ' + r.status)
    verifie('vraie page d\'accueil rendue (pas la page d\'attente)', !html.includes('Bientôt disponible'))
  }

  console.log('\n--- B. L\'admin ouvre le site (site_ouvert=true) : la fermeture disparaît sans redémarrage, sans résidu, dans le délai documenté (~30s de cache mémoire) ---')
  {
    siteOuvert = true
    const debut = Date.now()
    let dureeAvantOuverture = -1
    // On interroge jusqu'a ce que la fermeture disparaisse reellement --
    // preuve REELLE du delai de propagation documente dans proxy.ts (cache
    // en memoire de 30s), pas une hypothese sur sa duree exacte.
    for (;;) {
      const r = await fetch(base() + '/')
      if (r.status === 200) { dureeAvantOuverture = Date.now() - debut; break }
      if (Date.now() - debut > 45_000) break
      await new Promise((res) => setTimeout(res, 1000))
    }
    verifie(
      'le site s\'ouvre tout seul, sans redémarrage, en 45s au plus (délai documenté ~30s)',
      dureeAvantOuverture >= 0 && dureeAvantOuverture <= 45_000,
      dureeAvantOuverture < 0 ? 'jamais ouvert dans le délai' : dureeAvantOuverture + 'ms',
    )

    const r = await fetch(base() + '/')
    const html = await r.text()
    verifie('=> 200 (plus de 503)', r.status === 200, 'obtenu ' + r.status)
    verifie('vraie page d\'accueil rendue (plus "Bientôt disponible")', !html.includes('Bientôt disponible'))
    verifie('plus de X-Robots-Tag noindex résiduel', r.headers.get('x-robots-tag') !== 'noindex, nofollow', String(r.headers.get('x-robots-tag')))
    verifie('plus de <meta name="robots" content="noindex,nofollow"> résiduelle', !html.includes('name="robots" content="noindex,nofollow"'))
  }

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  arreter()
  fauxSupabase.close()
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
