/**
 * Banc de verification du bloc 1 — les quatre correctifs de securite.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-bloc1.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Le serveur Next est demarre avec des
 * variables d environnement qui pointent Supabase vers un faux PostgREST local, et
 * avec un ADMIN_SESSION_SECRET et un ADMIN_PASSWORD propres au banc. Comme une
 * substitution ratee enverrait le trafic vers la PRODUCTION, le banc commence par
 * une pre-verification et refuse de continuer sans preuve du detournement.
 *
 * Eprouve pour echouer : en rendant la garde a nouveau constante dans
 * src/lib/admin-auth.ts, le cas 1 passe au rouge.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { jsonLd } from '../src/lib/schema'

const PORT_NEXT = 3101
const SECRET = 'banc-bloc1-secret-de-signature-suffisamment-long-0123456789'
const MOT_DE_PASSE = 'banc-bloc1-mot-de-passe'

/**
 * Les routes d administration, avec un verbe qu elles implementent REELLEMENT :
 * ship et barbers/upload n exposent que POST, et un GET y renvoie 405 avant meme
 * d atteindre la garde -- ce qui ne prouverait rien.
 */
const ROUTES_ADMIN: [string, string][] = [
  ['orders', 'GET'], ['products', 'GET'], ['reviews', 'GET'], ['salons', 'GET'],
  ['salon', 'GET'], ['legal', 'GET'], ['barbers', 'GET'], ['temoignages-pros', 'GET'],
  ['ship', 'POST'], ['barbers/upload', 'POST'],
]

const recu: string[] = []
const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    recu.push(req.url ?? '')
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

async function statut(chemin: string, cookie?: string, methode = 'GET'): Promise<number> {
  const r = await fetch(base() + chemin, {
    method: methode,
    headers: cookie ? { Cookie: cookie } : {},
  })
  return r.status
}

function jetonSigne(expirationSecondes: number, cle = SECRET): string {
  const charge = expirationSecondes + '.abcdefghijkl'
  const sig = createHmac('sha256', cle).update(charge).digest('base64url')
  return charge + '.' + sig
}

async function main() {
  // ---- 1. Echappement JSON-LD : pur, aucun serveur necessaire ----
  console.log('\n--- 1. Echappement du JSON-LD (P0-2) ---')
  const charge = { name: 'Cire</script><script>alert(1)</script>', d: 'a & b < c' }
  const sortie = jsonLd(charge)
  verifie('aucun </script> en clair', false, sortie.includes('</script>'))
  verifie('aucun < en clair', false, sortie.includes('<'))
  const relu = JSON.parse(sortie)
  verifie('aller-retour fidele (les moteurs lisent la meme chose)', charge.name, relu.name)
  verifie('esperluette preservee', charge.d, relu.d)

  // ---- serveur ----
  await new Promise<void>((r) => faux.listen(0, '127.0.0.1', r))
  const portFaux = (faux.address() as AddressInfo).port
  console.log('\n  faux PostgREST sur 127.0.0.1:' + portFaux)

  const portLibre = await new Promise<boolean>((r) => {
    const sonde = http.createServer()
    sonde.once('error', () => r(false))
    sonde.once('listening', () => sonde.close(() => r(true)))
    sonde.listen(PORT_NEXT, '127.0.0.1')
  })
  if (!portLibre) {
    console.log('  ARRET : le port ' + PORT_NEXT + ' est deja occupe. Libere-le puis relance.')
    faux.close()
    process.exit(1)
  }

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portFaux,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    STRIPE_SECRET_KEY_TEST: 'sk_test_bidon',
    STRIPE_SECRET_KEY: '',
    ADMIN_SESSION_SECRET: SECRET,
    ADMIN_PASSWORD: MOT_DE_PASSE,
  }

  console.log('  demarrage de next dev sur le port ' + PORT_NEXT + ' ...')
  const serveur = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', String(PORT_NEXT)], {
    env,
    stdio: 'ignore',
  })

  let arrete = false
  const arreter = () => {
    if (arrete) return
    arrete = true
    if (process.platform === 'win32' && serveur.pid) {
      spawn('taskkill', ['/pid', String(serveur.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      serveur.kill('SIGTERM')
    }
  }
  process.on('exit', arreter)

  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(base() + '/')
      if (r.ok) break
    } catch {
      /* pas encore pret */
    }
    await new Promise((r) => setTimeout(r, 1000))
  }

  console.log('\n--- 0. Pre-verification : Supabase est-il detourne ? ---')
  recu.length = 0
  await fetch(base() + '/products').catch(() => {})
  if (!recu.some((u) => u.includes('product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete. Les variables')
    console.log('  d environnement n ont PAS ete substituees. Aucun test ne sera joue.')
    arreter()
    process.exit(1)
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  // ---- 2. Le cookie forge, c est la regression a empecher ----
  console.log('\n--- 2. Cookie forge « authenticated » (P0-1, le defaut d origine) ---')
  let refusees = 0
  for (const [r, verbe] of ROUTES_ADMIN) {
    const s = await statut('/api/admin/' + r, 'spbarber_admin=authenticated', verbe)
    if (s === 401) refusees++
    else console.log('        ' + verbe + ' ' + r + ' repond ' + s + ' au lieu de 401')
  }
  verifie('les ' + ROUTES_ADMIN.length + ' routes refusent le cookie forge', ROUTES_ADMIN.length, refusees)
  verifie('etat de session : non authentifie', { authenticated: false },
    await (await fetch(base() + '/api/admin/auth', { headers: { Cookie: 'spbarber_admin=authenticated' } })).json())

  // ---- 3. Connexion legitime ----
  console.log('\n--- 3. Connexion avec le bon mot de passe ---')
  const rep = await fetch(base() + '/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: MOT_DE_PASSE }),
  })
  verifie('=> 200', 200, rep.status)
  const brut = rep.headers.get('set-cookie') ?? ''
  const jeton = /spbarber_admin=([^;]+)/.exec(brut)?.[1] ?? ''
  verifie('le cookie n est plus la constante', false, jeton === 'authenticated')
  verifie('le jeton a trois segments', 3, jeton.split('.').length)
  verifie('cookie httpOnly', true, /httponly/i.test(brut))
  verifie('cookie sameSite=strict', true, /samesite=strict/i.test(brut))
  const cookieValide = 'spbarber_admin=' + jeton
  verifie('acces admin accorde', 200, await statut('/api/admin/orders', cookieValide))

  console.log('\n--- 4. Mauvais mot de passe ---')
  const mauvais = await fetch(base() + '/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: MOT_DE_PASSE + 'x' }),
  })
  verifie('=> 401', 401, mauvais.status)
  verifie('aucun cookie pose', null, mauvais.headers.get('set-cookie'))

  // ---- 5. Jetons falsifies ----
  console.log('\n--- 5. Jetons falsifies ---')
  const futur = Math.floor(Date.now() / 1000) + 3600
  verifie('signature alteree => 401', 401,
    await statut('/api/admin/orders', 'spbarber_admin=' + jetonSigne(futur).slice(0, -3) + 'aaa'))
  verifie('signe avec une autre cle => 401', 401,
    await statut('/api/admin/orders', 'spbarber_admin=' + jetonSigne(futur, 'une-autre-cle-tout-aussi-longue-0123456789')))
  verifie('jeton expire, pourtant bien signe => 401', 401,
    await statut('/api/admin/orders', 'spbarber_admin=' + jetonSigne(Math.floor(Date.now() / 1000) - 10)))
  verifie('jeton vide => 401', 401, await statut('/api/admin/orders', 'spbarber_admin='))
  verifie('expiration bricolee sans resigner => 401', 401,
    await statut('/api/admin/orders', 'spbarber_admin=' + (futur + 99999) + '.' + jetonSigne(futur).split('.').slice(1).join('.')))

  // ---- 6. Les deux GET autrefois ouverts ----
  console.log('\n--- 6. Les deux GET autrefois non gardes (P0-3) ---')
  verifie('barbers sans cookie => 401', 401, await statut('/api/admin/barbers'))
  verifie('temoignages-pros sans cookie => 401', 401, await statut('/api/admin/temoignages-pros'))
  verifie('barbers avec cookie valide => 200', 200, await statut('/api/admin/barbers', cookieValide))

  // ---- 7. Route morte supprimee ----
  console.log('\n--- 7. Route morte /api/checkout/confirm (P0-4) ---')
  verifie('=> 404', 404, await statut('/api/checkout/confirm?session_id=cs_test_x'))

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  arreter()
  // Pas de process.exit : forcer la sortie pendant qu un handle se ferme fait
  // echouer une assertion libuv sous Windows. On libere tout et on laisse la
  // boucle d evenements se vider d elle-meme.
  serveur.unref()
  faux.close()
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
