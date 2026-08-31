/**
 * Banc de verification F-004 — le webhook cesse-t-il de perdre des commandes ?
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-f004.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient lieu
 * de Supabase, et le serveur Next est demarre avec des variables d environnement
 * qui pointent dessus (celles du shell l emportent sur .env.local). Comme une
 * substitution ratee enverrait les insertions de test vers la PRODUCTION, le banc
 * commence par une pre-verification : il exige la preuve que le faux serveur
 * recoit bien le trafic Supabase, et refuse de continuer sinon.
 *
 * Aucun e-mail n est envoye : ALERT_EMAIL et RESEND_API_KEY sont volontairement
 * laissees vides, ce qui exerce au passage le chemin "alerte non configuree".
 *
 * Eprouve pour echouer : en remettant le return 200 inconditionnel dans
 * src/app/api/webhook/route.ts, le cas "panne base" passe au rouge.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { spawn } from 'node:child_process'
import Stripe from 'stripe'

const SECRET_WEBHOOK = 'whsec_banc_local_f004'
const PORT_NEXT = 3100

type Reponse = { statut: number; corps: unknown }
let reponseInsertion: Reponse = { statut: 201, corps: [] }
const recu: { chemin: string; corps: string }[] = []

const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    recu.push({ chemin: req.url ?? '', corps })
    if (req.method === 'POST' && (req.url ?? '').includes('/orders')) {
      res.writeHead(reponseInsertion.statut, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(reponseInsertion.corps))
      return
    }
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

function evenement(type: string, session: Record<string, unknown>) {
  return JSON.stringify({
    id: 'evt_banc_' + Math.random().toString(36).slice(2, 10),
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object: session },
  })
}

const stripe = new Stripe('sk_test_bidon', { apiVersion: '2026-05-27.dahlia' })

async function envoyer(charge: string, signature?: string): Promise<number> {
  const sig =
    signature ??
    stripe.webhooks.generateTestHeaderString({ payload: charge, secret: SECRET_WEBHOOK })
  const r = await fetch('http://127.0.0.1:' + PORT_NEXT + '/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
    body: charge,
  })
  return r.status
}

function sessionType(extra: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_banc_' + Math.random().toString(36).slice(2, 10),
    object: 'checkout.session',
    payment_intent: 'pi_test_banc_' + Math.random().toString(36).slice(2, 10),
    amount_total: 2980,
    currency: 'eur',
    customer_details: {
      email: 'client@exemple.test',
      address: { line1: '1 rue X', city: 'Fougeres', postal_code: '35300', country: 'FR' },
    },
    metadata: { items: '[{"id":"1","name":"Cire","qty":1,"price":2490}]' },
    ...extra,
  }
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
    STRIPE_SECRET_KEY_TEST: 'sk_test_bidon',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: SECRET_WEBHOOK,
    ALERT_EMAIL: '',
    RESEND_API_KEY: '',
  }

  // Un next dev residuel sur ce port servirait les requetes avec l ancienne
  // configuration, et le banc mesurerait un serveur qui n est pas le sien.
  const portLibre = await new Promise<boolean>((r) => {
    const sonde = http.createServer()
    sonde.once('error', () => r(false))
    sonde.once('listening', () => sonde.close(() => r(true)))
    sonde.listen(PORT_NEXT, '127.0.0.1')
  })
  if (!portLibre) {
    console.log('  ARRET : le port ' + PORT_NEXT + ' est deja occupe.')
    console.log('  Un serveur residuel repondrait a la place du notre. Libere-le puis relance.')
    faux.close()
    process.exit(1)
  }

  console.log('  demarrage de next dev sur le port ' + PORT_NEXT + ' ...')
  // On lance le binaire Next directement, sans passer par npx ni par un shell :
  // le pid obtenu est alors celui du serveur, et non celui d un intermediaire
  // qu on tuerait en laissant le serveur vivant derriere (constate).
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
      const r = await fetch('http://127.0.0.1:' + PORT_NEXT + '/')
      if (r.ok) break
    } catch {
      /* pas encore pret */
    }
    await new Promise((r) => setTimeout(r, 1000))
  }

  // ---- PRE-VERIFICATION : Supabase est-il REELLEMENT detourne ? ----
  console.log('\n--- 0. Pre-verification : le trafic Supabase va-t-il au faux serveur ? ---')
  recu.length = 0
  await fetch('http://127.0.0.1:' + PORT_NEXT + '/products').catch(() => {})
  const detourne = recu.some((r) => r.chemin.includes('product_overrides'))
  if (!detourne) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete product_overrides.')
    console.log('  Les variables d environnement n ont PAS ete substituees — les insertions')
    console.log('  de test partiraient vers la PRODUCTION. Aucun webhook ne sera envoye.')
    arreter()
    process.exit(1)
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- 1. Signature invalide ---')
  verifie(
    'signature bidon => 400',
    400,
    await envoyer(evenement('checkout.session.completed', sessionType()), 't=1,v1=faux'),
  )

  console.log('\n--- 2. Insertion reussie ---')
  reponseInsertion = { statut: 201, corps: [] }
  recu.length = 0
  const s2 = sessionType()
  verifie('=> 200', 200, await envoyer(evenement('checkout.session.completed', s2)))
  const insertion = recu.find((r) => r.chemin.includes('/orders'))
  verifie('une insertion a bien eu lieu', true, insertion !== undefined)
  if (insertion) {
    // supabase-js peut envoyer un objet seul ou un tableau selon la version.
    const brut = JSON.parse(insertion.corps)
    const ligne = Array.isArray(brut) ? brut[0] : brut
    verifie('montant = amount_total Stripe', 2980, ligne.total)
    verifie('payment intent enregistre', s2.payment_intent, ligne.stripe_payment_intent_id)
    verifie('email client', 'client@exemple.test', ligne.email)
    verifie('statut', 'paid', ligne.status)
  }

  console.log('\n--- 3. Redelivrance : la base refuse en 23505 ---')
  reponseInsertion = {
    statut: 409,
    corps: {
      code: '23505',
      message: 'duplicate key value violates unique constraint "orders_stripe_payment_intent_id_key"',
      details: null,
      hint: null,
    },
  }
  verifie(
    'doublon => 200 (pas de retry Stripe)',
    200,
    await envoyer(evenement('checkout.session.completed', sessionType())),
  )

  console.log('\n--- 4. Panne base : c est LE defaut F-004 ---')
  reponseInsertion = {
    statut: 500,
    corps: { code: 'XX000', message: 'panne simulee', details: null, hint: null },
  }
  const statutPanne = await envoyer(evenement('checkout.session.completed', sessionType()))
  verifie('panne => non-2xx (Stripe doit retenter)', true, statutPanne >= 400)
  verifie('panne => 500 precisement', 500, statutPanne)

  console.log('\n--- 5. Evenement d un autre type ---')
  reponseInsertion = { statut: 201, corps: [] }
  recu.length = 0
  verifie('=> 200', 200, await envoyer(evenement('payment_intent.succeeded', sessionType())))
  verifie('aucune insertion', undefined, recu.find((r) => r.chemin.includes('/orders')))

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  arreter()
  faux.close()
  process.exit(ko === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
