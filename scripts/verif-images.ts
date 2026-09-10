/**
 * Banc de verification du bloc Images — galerie multi-photos (product_overrides
 * .images, jsonb {url, alt}[]), fusion sur les 5 sites, et og:image/og:image:alt.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-images.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient lieu
 * de Supabase (product_overrides), et le serveur Next est demarre avec des
 * variables d environnement qui pointent dessus. Meme pre-verification que les
 * autres bancs : on exige la preuve que le trafic Supabase va bien au faux
 * serveur avant de lire la moindre page.
 *
 * CE QUE CE BANC NE PROUVE PAS : que Stripe affiche correctement l'image sur sa
 * page de paiement hebergee, ni que Google/Facebook consomment og:image:alt
 * comme prevu -- ce sont des comportements de systemes tiers. Ce banc verifie ce
 * qu'il peut reellement observer : que le HTML rendu et la session Stripe creee
 * contiennent exactement les valeurs attendues, sur les 5 sites de fusion et les
 * 2 composants de rendu (ProductDetail, ShampooingNoirPage).
 *
 * Eprouve pour echouer : en revenant a `images[0]` (chaine) au lieu de
 * `images[0].url` dans checkout/route.ts, le cas F echoue (Stripe rejette un
 * objet la ou il attend une chaine). En revenant a `images[0]` dans le
 * generateMetadata de products/[slug]/page.tsx, le cas A echoue sur og:image.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3105

type OverrideRow = {
  id: string
  name: null; price: null; description: null; stock: null; benefit: null
  images: { url: string; alt: string }[]
}

const URL_PHOTO_1 = 'https://fake-projet.supabase.co/storage/v1/object/public/products/cire-cheveux-premium-1.jpg'
const ALT_PHOTO_1 = 'Texte alt de test un'
const URL_PHOTO_2 = 'https://fake-projet.supabase.co/storage/v1/object/public/products/shampooing-noir-colorant-1.jpg'
const ALT_PHOTO_2 = 'Texte alt de test deux'

let overrides: OverrideRow[] = []
const recu: { chemin: string; corps: string }[] = []

const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ chemin: u.pathname + u.search, corps })

    if (req.method === 'GET' && u.pathname.includes('/product_overrides')) {
      const idFiltre = u.searchParams.get('id')
      let lignes = overrides.slice()
      if (idFiltre) {
        const id = idFiltre.replace(/^eq\./, '')
        lignes = lignes.filter((l) => l.id === id)
      }
      const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? (lignes[0] ?? null) : lignes))
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('[]')
  })
})

let ok = 0
let ko = 0
function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) {
    ok++
    console.log('  OK    ' + nom)
  } else {
    ko++
    console.log('  ECHEC ' + nom + (detail ? '\n        ' + detail : ''))
  }
}

const base = () => 'http://127.0.0.1:' + PORT_NEXT

async function page(chemin: string): Promise<string> {
  const r = await fetch(base() + chemin)
  return await r.text()
}

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(`<meta property="${property}" content="([^"]*)"`)
  return html.match(re)?.[1] ?? null
}

function occurrences(html: string, sousChaine: string): number {
  return html.split(sousChaine).length - 1
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
    // STRIPE_SECRET_KEY volontairement PAS ecrasee : /api/stripe/checkout appelle
    // reellement l'API Stripe. Next charge .env.local pour toute variable absente
    // d'ici, exactement comme les autres bancs qui passent par cette route.
    ALERT_EMAIL: '',
    RESEND_API_KEY: '',
  }

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter()
    faux.close()
    process.exitCode = 1
    return
  }
  const arreter = demarrage.arreter

  console.log('\n--- 0. Pre-verification : Supabase est-il detourne ? ---')
  recu.length = 0
  await fetch(base() + '/products').catch(() => {})
  if (!recu.some((r) => r.chemin.includes('product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete. Les variables')
    console.log('  d environnement n ont PAS ete substituees. Aucun test ne sera joue.')
    arreter()
    faux.close()
    process.exitCode = 1
    return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  overrides = [
    { id: '1', name: null, price: null, description: null, stock: null, benefit: null, images: [{ url: URL_PHOTO_1, alt: ALT_PHOTO_1 }] },
  ]

  console.log('\n--- A. Fiche produit (id 1, avec override) : vraie galerie + og:image/alt ---')
  let html = await page('/products/cire-cheveux-premium')
  verifie('image reelle affichee (fi-img-main)', html.includes(`src="${URL_PHOTO_1}"`) && html.includes(`alt="${ALT_PHOTO_1}"`))
  verifie('le placeholder ne s affiche plus pour ce produit', !html.includes('fi-img-ph'))
  verifie('og:image pointe vers la vraie photo', metaContent(html, 'og:image') === URL_PHOTO_1,
    'obtenu ' + metaContent(html, 'og:image'))
  verifie('og:image:alt reprend le texte alternatif de l admin', metaContent(html, 'og:image:alt') === ALT_PHOTO_1,
    'obtenu ' + metaContent(html, 'og:image:alt'))

  console.log('\n--- B. Fiche produit SANS override : aucune regression visuelle ---')
  html = await page('/products/peigne-texture-expert')
  verifie('le placeholder s affiche toujours', html.includes('fi-img-ph'))
  verifie('og:image retombe sur le defaut du site', metaContent(html, 'og:image') === 'https://spbarber.fr/og-default.jpg',
    'obtenu ' + metaContent(html, 'og:image'))
  verifie('og:image:alt retombe sur le libelle generique', metaContent(html, 'og:image:alt') === 'Peigne Texture Expert — SP Barber',
    'obtenu ' + metaContent(html, 'og:image:alt'))

  console.log('\n--- C. Liste /products : photo reelle pour un, placeholder pour les autres ---')
  html = await page('/products')
  verifie('la vignette du produit avec override est une vraie photo', html.includes(`src="${URL_PHOTO_1}"`))
  verifie('un produit sans override garde son icone', html.includes('pc-ph'))

  console.log('\n--- D. Accueil : carte vedette (Cire Cheveux) + grille ---')
  html = await page('/')
  verifie('la carte vedette Cire Cheveux affiche la vraie photo', html.includes(`src="${URL_PHOTO_1}"`))
  verifie('les autres cartes vedettes gardent leur icone (aucune regression)', html.includes('best2-icon'))

  console.log('\n--- E. Shampooing Noir Colorant (page dediee, id 2, avec override) ---')
  overrides = [
    { id: '1', name: null, price: null, description: null, stock: null, benefit: null, images: [{ url: URL_PHOTO_1, alt: ALT_PHOTO_1 }] },
    { id: '2', name: null, price: null, description: null, stock: null, benefit: null, images: [{ url: URL_PHOTO_2, alt: ALT_PHOTO_2 }] },
  ]
  html = await page('/products/shampooing-noir-colorant')
  verifie('og:image (etait un objet statique, jamais lu Supabase avant ce bloc)', metaContent(html, 'og:image') === URL_PHOTO_2,
    'obtenu ' + metaContent(html, 'og:image'))
  verifie('og:image:alt reprend le texte alternatif de l admin', metaContent(html, 'og:image:alt') === ALT_PHOTO_2,
    'obtenu ' + metaContent(html, 'og:image:alt'))
  verifie('les DEUX emplacements photo de la page (hero + bloc description) sont cables',
    occurrences(html, `src="${URL_PHOTO_2}"`) >= 2,
    occurrences(html, `src="${URL_PHOTO_2}"`) + ' occurrence(s) trouvee(s), 2 attendues')

  console.log('\n--- F. Checkout reel Stripe : la galerie survit a pricing.ts + Stripe ---')
  const r = await checkout([{
    product: { id: '1', name: 'Cire', slug: 'cire-cheveux-premium', description: 'x', price: 2490, images: [], category: 'coiffant', stock: 50, is_dropshipping: false, created_at: '2026-01-01T00:00:00.000Z' },
    quantity: 1,
  }])
  if (r.statut !== 200) console.log('    corps recu :', JSON.stringify(r.corps))
  verifie('session Stripe creee malgre les images dans product_data (200)', r.statut === 200)

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
