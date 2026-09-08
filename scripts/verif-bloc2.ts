/**
 * Banc de verification du bloc 2 — le mode Stripe et le garde-fou live.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-bloc2.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — aucune cle reelle, aucun appel a Stripe. La detection de mode et le
 * garde-fou sont evalues dans des processus enfants, chacun avec un environnement
 * fabrique : c est le seul moyen d eprouver un module qui lit process.env a son
 * chargement. La verification de signature de webhook est purement locale.
 *
 * Eprouve pour echouer : en redonnant la priorite a STRIPE_SECRET_KEY_TEST dans
 * src/lib/stripe.ts, le cas 1 -- la regression a verrouiller -- passe au rouge.
 */
import { execFileSync } from 'node:child_process'
import { demarrerServeur } from './banc-serveur'
import fs from 'node:fs'
import { createHmac } from 'node:crypto'

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

const SONDE = 'scripts/.sonde-stripe.ts'
const SOURCE_SONDE = [
  'import { MODE_STRIPE, problemeConfigurationStripe } from "../src/lib/stripe"',
  'console.log("@@" + JSON.stringify({ mode: MODE_STRIPE, probleme: problemeConfigurationStripe() }))',
  '',
].join('\n')

/**
 * Charge src/lib/stripe.ts dans un processus neuf, avec l environnement donne,
 * et rend le mode detecte plus l eventuel probleme de configuration.
 */
function sonder(env: Record<string, string>): { mode: string; probleme: string | null } {
  fs.writeFileSync(SONDE, SOURCE_SONDE)
  try {
    const sortie = execFileSync('npx', ['tsx', SONDE], {
      // On neutralise explicitement les trois variables Stripe avant d appliquer
      // celles du cas : une valeur residuelle de l environnement courant fausserait
      // la mesure sans qu on le voie.
      env: {
        ...process.env,
        STRIPE_SECRET_KEY: '',
        STRIPE_SECRET_KEY_TEST: '',
        STRIPE_AUTORISER_LIVE: '',
        ...env,
      },
      encoding: 'utf8',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const ligne = sortie.split('\n').find((l) => l.startsWith('@@'))
    if (!ligne) throw new Error('sortie inattendue : ' + sortie.slice(0, 300))
    return JSON.parse(ligne.slice(2))
  } finally {
    fs.rmSync(SONDE, { force: true })
  }
}

const CLE_TEST = 'sk_test_' + 'A'.repeat(24)
const CLE_LIVE = 'sk_live_' + 'B'.repeat(24)

async function main() {
  console.log('\n--- 1. Une cle _TEST residuelle ne doit plus rien pouvoir ---')
  console.log('    (c est la regression exacte : avant, elle ecrasait la cle live)')
  let r = sonder({
    STRIPE_SECRET_KEY: CLE_LIVE,
    STRIPE_SECRET_KEY_TEST: CLE_TEST,
    STRIPE_AUTORISER_LIVE: 'oui',
  })
  verifie('cle live + _TEST residuelle => mode live', 'live', r.mode)
  verifie('aucun probleme de configuration', null, r.probleme)

  console.log('\n--- 2. Detection du mode sur le prefixe ---')
  verifie('sk_test_ => test', 'test', sonder({ STRIPE_SECRET_KEY: CLE_TEST }).mode)
  verifie('rk_test_ => test', 'test', sonder({ STRIPE_SECRET_KEY: 'rk_test_' + 'C'.repeat(24) }).mode)
  verifie(
    'rk_live_ => live',
    'live',
    sonder({ STRIPE_SECRET_KEY: 'rk_live_' + 'D'.repeat(24), STRIPE_AUTORISER_LIVE: 'oui' }).mode,
  )

  console.log('\n--- 3. Le garde-fou live (le coeur du bloc) ---')
  r = sonder({ STRIPE_SECRET_KEY: CLE_LIVE })
  verifie('cle live SANS autorisation => refus', true, (r.probleme ?? '').includes('STRIPE_AUTORISER_LIVE'))
  verifie('  et le mode reste correctement detecte', 'live', r.mode)

  r = sonder({ STRIPE_SECRET_KEY: CLE_LIVE, STRIPE_AUTORISER_LIVE: 'non' })
  verifie('autorisation a une autre valeur que "oui" => refus', true, (r.probleme ?? '').length > 0)

  r = sonder({ STRIPE_SECRET_KEY: CLE_LIVE, STRIPE_AUTORISER_LIVE: 'oui' })
  verifie('cle live AVEC autorisation => accepte', null, r.probleme)

  r = sonder({ STRIPE_SECRET_KEY: CLE_TEST })
  verifie('une cle de test n a jamais besoin d autorisation', null, r.probleme)

  console.log('\n--- 4. Configurations invalides ---')
  r = sonder({ STRIPE_SECRET_KEY: '' })
  verifie('cle vide => refus, sans planter a l import', true, (r.probleme ?? '').includes('absente'))
  verifie('  mode inconnu', 'inconnu', r.mode)

  r = sonder({ STRIPE_SECRET_KEY: 'pk_test_ceci_nest_pas_une_cle_secrete' })
  verifie('prefixe non reconnu => refus', true, (r.probleme ?? '').includes('indeterminable'))

  console.log('\n--- 5. Verification de signature du webhook ---')
  console.log('    (purement locale : constructEvent ne contacte pas Stripe)')
  const Stripe = (await import('stripe')).default
  const s = new Stripe(CLE_TEST, { apiVersion: '2026-05-27.dahlia' })
  const charge = JSON.stringify({ id: 'evt_1', object: 'event', type: 'ping', data: { object: {} } })
  const secret = 'whsec_banc_bloc2'
  const bonneSignature = s.webhooks.generateTestHeaderString({ payload: charge, secret })

  const signeAvec = (sec: string) => {
    const t = Math.floor(Date.now() / 1000)
    return 't=' + t + ',v1=' + createHmac('sha256', sec).update(t + '.' + charge).digest('hex')
  }

  let leve = false
  try {
    s.webhooks.constructEvent(charge, bonneSignature, secret)
  } catch {
    leve = true
  }
  verifie('bonne signature acceptee', false, leve)

  leve = false
  try {
    s.webhooks.constructEvent(charge, signeAvec('whsec_autre_secret'), secret)
  } catch {
    leve = true
  }
  verifie('signature d un autre secret refusee', true, leve)

  // ---- 6. Le webhook prive de son secret : 500, surtout pas 400 ----
  // C est le mode de panne le plus couteux du projet. 400 dit a Stripe
  // "ne retente pas" : apres une bascule en live sans avoir pose le nouveau
  // secret, chaque paiement serait encaisse sans qu aucune commande ne soit
  // enregistree, sans reprise et sans alerte.
  console.log('\n--- 6. Webhook sans STRIPE_WEBHOOK_SECRET (demarre un serveur) ---')
  const PORT = 3102
  const demarrage = await demarrerServeur({
    port: PORT,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:1',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-factice',
      SUPABASE_SERVICE_ROLE_KEY: 'service-factice',
      STRIPE_SECRET_KEY: CLE_TEST,
      STRIPE_SECRET_KEY_TEST: '',
      STRIPE_AUTORISER_LIVE: '',
      STRIPE_WEBHOOK_SECRET: '',
    },
  })
  if (!demarrage.ok) {
    ko++
    console.log('  ECHEC ' + demarrage.motif)
  } else {
    const rep = await fetch('http://127.0.0.1:' + PORT + '/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=peu importe' },
      body: charge,
    })
    verifie('secret absent => 500 (Stripe retentera)', 500, rep.status)
    verifie('  et surtout PAS 400 (qui ferait abandonner)', false, rep.status === 400)
    demarrage.arreter()
  }

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
