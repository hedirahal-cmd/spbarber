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
  // provenance du montant soit sans ambiguite. La Cire Cheveux Premium (id 1)
  // est retiree de la vente (actif:false) dans le catalogue statique depuis la
  // decision Hedi du 2026-09-28 -- sans repli explicite ici, les cas 1, 6 et 7
  // ci-dessous (qui testent la provenance du prix et la validation d'entrees,
  // pas le statut actif) echoueraient sur "produit indisponible" au lieu de
  // tester ce qu'ils sont censes tester.
  { id: '1', name: null, price: 1990, description: null, stock: null, benefit: null, actif: true },
  { id: '2', name: null, price: 2890, description: null, stock: null, benefit: null },
  // Meme raison pour la Tondeuse Fade Pro (id 6, actif:false) : les cas 3 et 5
  // testent la resolution du slug et la validation de variante, pas le
  // statut actif.
  { id: '6', name: null, price: null, description: null, stock: null, benefit: null, actif: true },
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

  console.log('\n--- 3. Slug falsifie : le vrai slug fait foi cote serveur ---')
  r = await resolveCartItems([
    { product: { id: '6', slug: 'peigne-texture-expert', price: 7990 }, quantity: 1 },
  ])
  verifie('slug repris du serveur', 'tondeuse-fade-pro', r[0].product.slug)

  console.log('\n--- 4. Sous-total gonfle pour decrocher la livraison offerte ---')
  r = await resolveCartItems([
    { product: { id: '4', slug: 'peigne-texture-expert', price: 99999 }, quantity: 1 },
  ])
  const sousTotal = r.reduce((s, i) => s + i.unitAmount * i.quantity, 0)
  verifie('sous-total serveur', 1490, sousTotal)
  verifie('livraison NON offerte', false, sousTotal >= 6000)

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
  // On NE FORCE PAS la sortie : appeler process.exit() pendant qu un handle se
  // ferme fait echouer une assertion libuv sous Windows, et le banc sortait alors
  // en 127 tout en annoncant 0 echec. Sortir depuis le callback de fermeture
  // reduisait le defaut sans le supprimer (encore reproduit 1 fois sur 3 sous
  // charge). On ferme le serveur, on pose le code, et on laisse la boucle
  // d evenements se vider d elle-meme : plus rien ne peut courir.
  serveur.close()
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => { console.error(e); process.exit(1) })
