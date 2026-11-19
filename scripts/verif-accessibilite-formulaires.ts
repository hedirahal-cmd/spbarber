/**
 * Banc de verification de l'accessibilite des formulaires /retractation et
 * "avis produit" (2026-11-19, audit externe relaye par Hedi, point 3) :
 * chaque <label> doit etre relie a son champ par for/id (htmlFor cote React),
 * pas seulement visuellement adjacent -- sinon un lecteur d'ecran n'annonce
 * pas le libelle quand le champ recoit le focus.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-accessibilite-formulaires.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — aucune base reelle, faux PostgREST local (meme pre-verification
 * que les autres bancs).
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3122

const fauxSupabase = http.createServer((req, res) => {
  req.on('data', () => {})
  req.on('end', () => {
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

/**
 * Extrait toute paire (for="X", <... id="X" ...>) dans un extrait de HTML, et
 * verifie que chaque for= pointe vers un id= reellement present dans le MEME
 * extrait. Ne verifie PAS le piege a robots (deliberement sans id, lui n'a
 * pas besoin d'etre annonce -- voir le commentaire dans RetractationForm.tsx).
 */
function verifieAssociationsLabel(nom: string, html: string, forsAttendus: string[]) {
  for (const id of forsAttendus) {
    const aUnFor = html.includes('for="' + id + '"')
    const aUnId = html.includes('id="' + id + '"')
    verifie(nom + ' : "' + id + '" relie (for+id presents)', aUnFor && aUnId, 'for=' + aUnFor + ' id=' + aUnId)
  }
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

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter(); fauxSupabase.close(); process.exitCode = 1; return
  }
  const { arreter } = demarrage

  console.log('\n--- A. /retractation : chaque champ du formulaire relie a son label ---')
  const a = await page('/retractation')
  verifie('=> 200', a.statut === 200, 'obtenu ' + a.statut)
  verifieAssociationsLabel('retractation', a.html, [
    'rtn-nom', 'rtn-email', 'rtn-numero-commande', 'rtn-date-commande', 'rtn-produits', 'rtn-motif',
  ])

  console.log('\n--- B. Fiche produit : formulaire "avis" relie a son label ---')
  const b = await page('/products/shampooing-noir-colorant')
  verifie('=> 200', b.statut === 200, 'obtenu ' + b.statut)
  verifieAssociationsLabel('avis (id 2)', b.html, [
    'rf-author-2', 'rf-rating-2', 'rf-text-2', 'rf-email-2',
  ])

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
