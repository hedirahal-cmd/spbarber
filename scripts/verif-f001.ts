/**
 * Banc de verification F-001 — le prix facture vient-il du serveur ?
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-f001.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * Il ne touche AUCUNE base reelle : un faux PostgREST local tient lieu de
 * product_overrides, et les variables d'environnement Supabase sont ecrasees
 * vers ce serveur local avant que le module de prix ne soit charge. Aucune cle
 * n'est lue, aucun appel Stripe n'est fait.
 *
 * Eprouve pour echouer : en faisant confiance au prix client dans
 * src/lib/pricing.ts, le banc passe a 4 echecs. Un banc qui ne sait pas
 * rougir ne prouve rien.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'

const OVERRIDES = [
  // Prix volontairement DIFFERENT du catalogue statique (2490) pour que la
  // provenance du montant soit sans ambiguite.
  { id: '1', name: null, price: 1990, description: null, stock: null, benefit: null },
  { id: '2', name: null, price: 2890, description: null, stock: null, benefit: null },
]

let modeErreur = false

const serveur = http.createServer((req, res) => {
  if (modeErreur) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'panne simulee' }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(OVERRIDES))
})

const POIDS_PRODUIT: Record<string, number> = {
  'cire-cheveux-premium': 150, 'shampooing-noir-colorant': 300,
  'creme-curl-control': 200, 'peigne-texture-expert': 100,
  'pack-barbe-complet': 600, 'tondeuse-fade-pro': 800,
}

let ok = 0
let ko = 0
function verifie(nom: string, attendu: unknown, obtenu: unknown) {
  const a = JSON.stringify(attendu)
  const o = JSON.stringify(obtenu)
  if (a === o) { ok++; console.log('  OK   ' + nom + '  => ' + o) }
  else { ko++; console.log('  ECHEC ' + nom + '\n        attendu ' + a + '\n        obtenu  ' + o) }
}

async function main() {
  await new Promise<void>((r) => serveur.listen(0, '127.0.0.1', r))
  const port = (serveur.address() as AddressInfo).port
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:' + port
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-factice'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-factice'

  const { resolveCartItems, CartValidationError } = await import('@/lib/pricing')

  const echec = async (nom: string, items: unknown, statutAttendu: number) => {
    try {
      await resolveCartItems(items)
      ko++; console.log('  ECHEC ' + nom + ' : aucune erreur levee')
    } catch (e) {
      if (e instanceof CartValidationError) verifie(nom, statutAttendu, e.status)
      else { ko++; console.log('  ECHEC ' + nom + ' : mauvaise erreur ' + String(e)) }
    }
  }

  console.log('\n--- 1. Prix falsifie a 1 centime (l\'attaque de F-001) ---')
  let r = await resolveCartItems([
    { product: { id: '1', slug: 'cire-cheveux-premium', price: 1 }, quantity: 1 },
  ])
  verifie('prix serveur, pas le 1 centime envoye', 1990, r[0].unitAmount)

  console.log('\n--- 2. Produit sans override : le catalogue statique fait foi ---')
  r = await resolveCartItems([
    { product: { id: '3', slug: 'creme-curl-control', price: 5 }, quantity: 2 },
  ])
  verifie('prix statique', 2690, r[0].unitAmount)

  console.log('\n--- 3. Slug falsifie pour alleger le port ---')
  r = await resolveCartItems([
    // id = tondeuse (800 g) mais slug maquille en peigne (100 g)
    { product: { id: '6', slug: 'peigne-texture-expert', price: 7990 }, quantity: 1 },
  ])
  verifie('slug repris du serveur', 'tondeuse-fade-pro', r[0].product.slug)
  verifie('poids reel', 800, POIDS_PRODUIT[r[0].product.slug])

  console.log('\n--- 4. Sous-total gonfle pour decrocher la livraison offerte ---')
  r = await resolveCartItems([
    { product: { id: '4', slug: 'peigne-texture-expert', price: 99999 }, quantity: 1 },
  ])
  const sousTotal = r.reduce((s, i) => s + i.unitAmount * i.quantity, 0)
  verifie('sous-total serveur', 1490, sousTotal)
  verifie('livraison NON offerte', false, sousTotal >= 4900)

  console.log('\n--- 5. Variantes ---')
  r = await resolveCartItems([
    { product: { id: '6', slug: 'tondeuse-fade-pro' }, variant: { id: '6b', price: 1 }, quantity: 1 },
  ])
  verifie('variante 6b au prix serveur', 8990, r[0].unitAmount)
  await echec('variante inexistante refusee', [
    { product: { id: '6', slug: 'tondeuse-fade-pro' }, variant: { id: '6z', price: 1 }, quantity: 1 },
  ], 400)

  console.log('\n--- 6. Entrees invalides ---')
  await echec('produit inconnu', [{ product: { id: '999' }, quantity: 1 }], 400)
  await echec('quantite 0', [{ product: { id: '1' }, quantity: 0 }], 400)
  await echec('quantite negative', [{ product: { id: '1' }, quantity: -3 }], 400)
  await echec('quantite fractionnaire', [{ product: { id: '1' }, quantity: 1.5 }], 400)
  await echec('quantite demesuree', [{ product: { id: '1' }, quantity: 1e9 }], 400)
  await echec('panier vide', [], 400)

  console.log('\n--- 7. Base injoignable : on refuse plutot que de facturer a l\'aveugle ---')
  modeErreur = true
  await echec('lecture en panne => 503', [{ product: { id: '1' }, quantity: 1 }], 503)
  modeErreur = false

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  // On sort DANS le callback de fermeture : quitter pendant qu un handle est en
  // cours de fermeture fait echouer une assertion libuv sous Windows, et le banc
  // sortait alors en 127 tout en annoncant 0 echec (reproduit 2 fois sur 3).
  serveur.close(() => process.exit(ko === 0 ? 0 : 1))
}

main().catch((e) => { console.error(e); process.exit(1) })
