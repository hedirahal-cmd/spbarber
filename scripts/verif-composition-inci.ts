/**
 * Banc de verification du bloc "Composition (INCI)" + contenance (2026-11-19,
 * demande Hedi, lot "compositions + shampooing noir", partie A) : affiches
 * uniquement sur les fiches cosmetiques, jamais sur les accessoires, avec le
 * texte EXACT (recopie de l'etiquette fournisseur, sans correction).
 *
 * Verifie aussi (2026-11-20) l'encadre "Bien utiliser votre shampooing
 * colorant" : place apres les etapes d'utilisation, mention reglementaire
 * des phenylenediamines conservee, ancien titre "Precautions" disparu.
 *
 * Et l'accordeon "Ingredients" (<details>, 2026-11-20) : replie par
 * defaut (pas d'attribut "open"), texte quand meme present dans le HTML
 * brut (pas de chargement differe -- lu par Google et les lecteurs
 * d'ecran meme replie).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-composition-inci.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — aucune base reelle, faux PostgREST local (meme pre-verification
 * que les autres bancs).
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3123

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

  console.log('\n--- A. Shampooing Noir Colorant (id 2) : contenance + composition + trace ingredients exactes ---')
  const a = await page('/products/shampooing-noir-colorant')
  verifie('=> 200', a.statut === 200, 'obtenu ' + a.statut)
  verifie('contenance "500 ml" affichee pres du prix', a.html.includes('500 ml'))
  verifie('accordeon "Ingrédients" present (<details><summary>)', a.html.includes('<details class="sn-ingredients"') && a.html.includes('<summary class="sn-desc-ttl">Ingrédients</summary>'))
  verifie('accordeon replie par defaut (pas d\'attribut "open")', !a.html.includes('<details class="sn-ingredients" open'))
  verifie('premier ingredient exact ("Water")', a.html.includes('Water, Cetearyl Alcohol'))
  verifie('ingredient a casse particuliere non corrige ("m-aminophenol")', a.html.includes('m-aminophenol'))
  verifie('graphie differente non harmonisee ("p-phenyl-enediol")', a.html.includes('p-phenyl-enediol'))
  verifie('"Trace ingredients" distinct, present', a.html.includes('Trace ingredients : Camellia Japonica Seed Oil'))
  verifie('nouvel encadre "Bien utiliser votre shampooing colorant" present', a.html.includes('Bien utiliser votre shampooing colorant'))
  verifie('ancien titre "Précautions" disparu', !a.html.includes('Précautions'))
  verifie('mention reglementaire phenylenediamines (PPD) conservee', a.html.includes('Ce produit contient des phénylènediamines (PPD)'))
  verifie('mise en garde "Réservé aux adultes" presente', a.html.includes('Réservé aux adultes'))
  verifie('encadre place APRES les etapes d\'utilisation', a.html.indexOf('Bien utiliser votre shampooing colorant') > a.html.indexOf('COMMENT ÇA FONCTIONNE'))

  console.log('\n--- B. Crème Curl Control (id 3) : contenance + composition exactes ---')
  const b = await page('/products/creme-curl-control')
  verifie('=> 200', b.statut === 200, 'obtenu ' + b.statut)
  verifie('contenance "280 ml" affichee pres du prix', b.html.includes('280 ml'))
  verifie('composition exacte presente (ordre respecte)', b.html.includes('Aqua, Glycerin, Hydrogenated Avocado Oil'))
  verifie('aucun "Trace ingredients" invente pour ce produit', !b.html.includes('Trace ingredients'))

  console.log('\n--- C. Poudre Texturante (id 7) : contenance + composition en MAJUSCULES non reformatees ---')
  const c = await page('/products/poudre-texturante')
  verifie('=> 200', c.statut === 200, 'obtenu ' + c.statut)
  verifie('contenance "30 g" affichee pres du prix', c.html.includes('30 g'))
  verifie('composition en majuscules recopiee telle quelle', c.html.includes('MAGNESIUM STEARATE, CORN STARCH, SILICA'))

  console.log('\n--- D. Peigne Texture Expert (id 4, accessoire) : AUCUN bloc composition/contenance ---')
  const d = await page('/products/peigne-texture-expert')
  verifie('=> 200', d.statut === 200, 'obtenu ' + d.statut)
  verifie('pas d\'accordeon "Ingrédients"', !d.html.includes('sn-ingredients'))

  console.log('\n--- E. Pack Barbe Complet (id 5, kit multi-produits, pas de donnee fournie) : AUCUN bloc composition/contenance ---')
  const e = await page('/products/pack-barbe-complet')
  verifie('=> 200', e.statut === 200, 'obtenu ' + e.statut)
  verifie('pas d\'accordeon "Ingrédients"', !e.html.includes('sn-ingredients'))

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
