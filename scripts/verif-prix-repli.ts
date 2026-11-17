/**
 * Banc de verification du prix de repli (2026-11-17, demande Hedi, suite a
 * l'audit "14,90 € vs 9,90 €" sur l'etiquette Boxtal d'une commande mixte) :
 *
 *   - product_overrides repond normalement => le prix REEL (override) est
 *     affiche sur la fiche produit, jamais le prix statique du catalogue ;
 *   - product_overrides est injoignable => la fiche produit continue de
 *     s'afficher (pas de page cassee), avec le prix statique ALIGNE en
 *     repli, ET une ligne est journalisee cote serveur (jusque-la silencieux
 *     dans 2 des 3 chemins -- voir src/lib/product-overrides-server.ts) ;
 *   - meme comportement verifie sur /commande-confirmee (achat express,
 *     cas C) -- la 4e implementation du meme repli silencieux, trouvee et
 *     unifiee apres coup (2026-11-17) ;
 *   - le PAIEMENT, lui, reste refuse en 503 dans ce cas (deja prouve par
 *     scripts/verif-f001.ts, reconfirme ici en bout de banc plutot que
 *     duplique -- meme module src/lib/pricing.ts, jamais touche par ce
 *     chantier).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-prix-repli.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — aucune base reelle. Faux PostgREST local, meme pre-verification
 * que les autres bancs. La capture de la sortie du serveur (capturerSortie,
 * voir banc-serveur.ts) est strictement locale a ce processus : aucune
 * donnee ne sort de la machine.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Stripe from 'stripe'
import { demarrerServeur } from './banc-serveur'

/**
 * Next.js charge .env.local pour le SERVEUR qu'il demarre lui-meme, pas pour
 * ce script orchestrateur (meme limite que verif-france-only.ts, cas O) --
 * le cas C ci-dessous a besoin de la vraie cle ici pour creer un vrai
 * PaymentIntent de test.
 */
function lireCleStripeLocale(): string | null {
  try {
    const contenu = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
    const ligne = contenu.split('\n').find((l) => l.trim().startsWith('STRIPE_SECRET_KEY='))
    if (!ligne) return null
    return ligne.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '') || null
  } catch {
    return null
  }
}

const PORT_NEXT = 3118
// Prix de l'override simule, VOLONTAIREMENT different a la fois du prix
// statique aligne (990 = 9,90 €, voir src/lib/products.ts) et de l'ancien
// prix statique obsolete (1490 = 14,90 €) -- pour que la provenance du
// montant affiche soit sans ambiguite possible.
const PRIX_OVERRIDE = 850 // 8,50 €
const PRIX_STATIQUE_ALIGNE = 990 // 9,90 €
const SLUG_PEIGNE = 'peigne-texture-expert'

let modeErreur = false
const recu: { chemin: string }[] = []

const fauxSupabase = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ chemin: u.pathname + u.search })

    if (u.pathname.includes('/product_overrides')) {
      if (modeErreur) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: 'panne simulee (verif-prix-repli)' }))
        return
      }
      const ligne = { id: '4', name: null, price: PRIX_OVERRIDE, description: null, stock: null, benefit: null, images: [], actif: true }
      const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? ligne : [ligne]))
      return
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

async function page(chemin: string): Promise<{ statut: number; html: string }> {
  const r = await fetch(base() + chemin)
  return { statut: r.status, html: await r.text() }
}

async function main() {
  await new Promise<void>((r) => fauxSupabase.listen(0, '127.0.0.1', r))
  const portSupabase = (fauxSupabase.address() as AddressInfo).port
  console.log('  faux PostgREST sur 127.0.0.1:' + portSupabase)

  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:' + portSupabase,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
    SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
    ALERT_EMAIL: '',
    RESEND_API_KEY: '',
  }

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env, capturerSortie: true })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter(); fauxSupabase.close(); process.exitCode = 1; return
  }
  const { arreter, sortie } = demarrage

  console.log('\n--- 0. Pre-verification : Supabase est-il detourne ? ---')
  recu.length = 0
  await fetch(base() + '/products').catch(() => {})
  if (!recu.some((r) => r.chemin.includes('product_overrides'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete. Abandon.')
    arreter(); fauxSupabase.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- A. product_overrides répond : le prix RÉEL (override) est affiché, pas le prix statique ---')
  modeErreur = false
  const a = await page('/products/' + SLUG_PEIGNE)
  verifie('=> 200', a.statut === 200, 'obtenu ' + a.statut)
  verifie('affiche le prix de l\'override (8,50 €)', a.html.includes('8,50'), 'cherché "8,50" dans la page')
  verifie('n\'affiche PAS le prix statique aligné (9,90 €) à sa place', !a.html.includes('9,90'), 'trouvé "9,90" alors que l\'override devait l\'emporter')
  verifie('n\'affiche PAS l\'ancien prix statique obsolète (14,90 €)', !a.html.includes('14,90'))

  console.log('\n--- B. product_overrides injoignable : la fiche reste utilisable, prix STATIQUE ALIGNÉ affiché, ET journalisé ---')
  modeErreur = true
  const b = await page('/products/' + SLUG_PEIGNE)
  verifie('=> 200 (la page ne casse jamais pour un visiteur)', b.statut === 200, 'obtenu ' + b.statut)
  verifie('affiche le prix statique ALIGNÉ en repli (9,90 €)', b.html.includes('9,90'), 'cherché "9,90" dans la page')
  verifie('n\'affiche PAS le prix de l\'override (8,50 €), inaccessible dans ce cas', !b.html.includes('8,50'))
  verifie('n\'affiche PAS l\'ancien prix statique obsolète (14,90 €) -- preuve que l\'alignement a bien eu lieu', !b.html.includes('14,90'))
  // Supabase-js ne LEVE PAS d'exception sur une erreur HTTP (meme famille de
  // piege que resend.emails.send(), voir src/lib/alerte-operationnelle.ts) :
  // .select() revient avec { data: null, error: {...} } sans exception, donc
  // c'est la ligne de log INCONDITIONNELLE (succes ET echec confondus, avec
  // error:null ou error:<message>) qui porte la preuve ici, pas un bloc catch
  // qui ne se declenche jamais pour ce type d'echec.
  const sortieApresEchec = sortie()
  verifie(
    'une ligne EST journalisée côté serveur pour cet échec (silencieux avant ce correctif)',
    sortieApresEchec.includes('[product-overrides] lecture') && sortieApresEchec.includes('panne simulee (verif-prix-repli)'),
    'sortie serveur ne contient pas le marqueur attendu (voir src/lib/product-overrides-server.ts)',
  )
  modeErreur = false

  console.log('\n--- C. Page "commande confirmée" (achat express, 4e implémentation unifiée) : même comportement ---')
  const cleStripeLocale = lireCleStripeLocale()
  if (!cleStripeLocale) {
    console.log('  IGNORÉ : STRIPE_SECRET_KEY absente de .env.local -- impossible de créer un vrai PaymentIntent de test ici.')
  } else {
    const stripeReel = new Stripe(cleStripeLocale, { apiVersion: '2026-05-27.dahlia' })
    // pm_card_visa : methode de paiement de test fournie par Stripe, confirme
    // SANS authentification supplementaire -- aucun argent reel, meme principe
    // que les autres bancs qui appellent reellement l'API Stripe en mode test
    // (voir verif-images.ts cas F, verif-france-only.ts cas O).
    const pi = await stripeReel.paymentIntents.create({
      amount: 2000,
      currency: 'eur',
      payment_method: 'pm_card_visa',
      payment_method_types: ['card'],
      confirm: true,
      receipt_email: 'client-confirmee@exemple.test',
      metadata: { source: 'express_checkout', items: JSON.stringify([{ id: '4', qty: 1 }]) },
      shipping: { name: 'Jean Confirmée', address: { line1: '1 rue du Test', city: 'Fougères', postal_code: '35300', country: 'FR' } },
    })
    verifie('PaymentIntent de test confirmé avec succès', pi.status === 'succeeded', 'statut obtenu ' + pi.status)

    modeErreur = false
    const c1 = await page('/commande-confirmee?payment_intent=' + pi.id)
    verifie('=> 200', c1.statut === 200, 'obtenu ' + c1.statut)
    verifie('affiche le prix de l\'override (8,50 €)', c1.html.includes('8,50'), 'cherché "8,50" dans la page')
    verifie('n\'affiche PAS le prix statique aligné (9,90 €) à sa place', !c1.html.includes('9,90'))

    modeErreur = true
    const c2 = await page('/commande-confirmee?payment_intent=' + pi.id)
    verifie('=> 200 (la page de confirmation ne casse jamais pour le client)', c2.statut === 200, 'obtenu ' + c2.statut)
    verifie('affiche le prix statique ALIGNÉ en repli (9,90 €)', c2.html.includes('9,90'), 'cherché "9,90" dans la page')
    verifie('n\'affiche PAS le prix de l\'override (8,50 €), inaccessible dans ce cas', !c2.html.includes('8,50'))
    const sortieApresEchecC = sortie()
    verifie(
      'une ligne EST journalisée côté serveur pour cette 4e implémentation aussi',
      sortieApresEchecC.includes('[product-overrides] lecture') && sortieApresEchecC.includes('panne simulee (verif-prix-repli)'),
    )
    modeErreur = false
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
