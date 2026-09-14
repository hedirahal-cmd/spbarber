/**
 * Banc de verification du bloc Avis public (formulaire de depot, ReviewsList
 * partage, resume reel par produit).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-avis-public.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — il ne touche AUCUNE base reelle. Un faux PostgREST local tient
 * lieu de Supabase. Meme pre-verification que les autres bancs.
 *
 * Eprouve pour echouer : en supprimant le "visible: false, verified: false"
 * force cote serveur dans /api/reviews (en les remplacant par ce que le
 * client envoie), le cas B echoue -- un avis se publierait directement sans
 * moderation.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { demarrerServeur } from './banc-serveur'

const PORT_NEXT = 3109

let reviews: Record<string, unknown>[] = []
const recu: { methode: string | undefined; chemin: string }[] = []

function contientTous(tableau: unknown, valeurs: string[]): boolean {
  if (!Array.isArray(tableau)) return false
  return valeurs.every((v) => tableau.includes(v))
}

const faux = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => (corps += c))
  req.on('end', () => {
    const u = new URL(req.url ?? '', 'http://x')
    recu.push({ methode: req.method, chemin: u.pathname + u.search })
    const objetUnique = req.headers.accept?.includes('vnd.pgrst.object+json')

    if (!u.pathname.includes('/reviews')) {
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return
    }

    if (req.method === 'GET') {
      let lignes = reviews.slice()
      const visibleFiltre = u.searchParams.get('visible')
      if (visibleFiltre === 'eq.true') lignes = lignes.filter((r) => r.visible === true)
      const containsFiltre = u.searchParams.get('product_ids')
      if (containsFiltre?.startsWith('cs.')) {
        const valeurs = containsFiltre.slice(4, -1).split(',').filter(Boolean) // cs.{a,b} -> [a,b]
        lignes = lignes.filter((r) => contientTous(r.product_ids, valeurs))
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? (lignes[0] ?? null) : lignes))
      return
    }

    if (req.method === 'POST') {
      const body = JSON.parse(corps || '{}')
      const entree = { id: 'r' + (reviews.length + 1), created_at: new Date().toISOString(), ...body }
      reviews.push(entree)
      res.writeHead(201, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(objetUnique ? entree : [entree]))
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]')
  })
})

let ok = 0
let ko = 0
function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) { ok++; console.log('  OK    ' + nom) }
  else { ko++; console.log('  ECHEC ' + nom + (detail ? '\n        ' + detail : '')) }
}

const base = () => 'http://127.0.0.1:' + PORT_NEXT

async function poster(corps: unknown): Promise<{ statut: number; corps: Record<string, unknown> }> {
  const r = await fetch(base() + '/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })
  return { statut: r.status, corps: await r.json().catch(() => ({})) }
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
  }

  const demarrage = await demarrerServeur({ port: PORT_NEXT, env })
  if (!demarrage.ok) {
    console.log('  ARRET : ' + demarrage.motif)
    demarrage.arreter(); faux.close(); process.exitCode = 1; return
  }
  const arreter = demarrage.arreter

  console.log('\n--- 0. Pre-verification : Supabase est-il detourne ? ---')
  recu.length = 0
  await fetch(base() + '/').catch(() => {})
  if (!recu.some((r) => r.chemin.includes('/reviews'))) {
    console.log('  ARRET : le faux PostgREST n a recu aucune requete /reviews.')
    arreter(); faux.close(); process.exitCode = 1; return
  }
  console.log('  OK    trafic Supabase detourne vers le faux serveur')

  console.log('\n--- A. Validation stricte ---')
  let r = await poster({ author: '', rating: '5', text: 'Un texte assez long pour passer la validation.' })
  verifie('nom vide => 400', r.statut === 400, 'obtenu ' + r.statut)
  r = await poster({ author: 'Client', rating: 'abc', text: 'Un texte assez long pour passer la validation.' })
  verifie('note invalide => 400', r.statut === 400, 'obtenu ' + r.statut)
  r = await poster({ author: 'Client', rating: '5', text: 'court' })
  verifie('texte < 10 caracteres => 400', r.statut === 400, 'obtenu ' + r.statut)
  verifie('aucun de ces rejets n a ete enregistre', reviews.length === 0, 'obtenu ' + reviews.length)

  console.log('\n--- B. Moderation forcee, quoi que le client envoie ---')
  r = await poster({ author: 'Client Honnete', rating: '5', text: 'Excellent produit, je recommande vivement.', product_id: '1', visible: true, verified: true })
  verifie('soumission valide => 200/201', r.statut === 200 || r.statut === 201, 'obtenu ' + r.statut)
  verifie('visible force a false malgre visible:true envoye', reviews[0]?.visible === false, 'obtenu ' + JSON.stringify(reviews[0]?.visible))
  verifie('verified force a false malgre verified:true envoye', reviews[0]?.verified === false, 'obtenu ' + JSON.stringify(reviews[0]?.verified))
  verifie('product_id valide conserve dans product_ids', JSON.stringify(reviews[0]?.product_ids) === JSON.stringify(['1']))

  console.log('\n--- C. Piege a robots ---')
  const avant = reviews.length
  r = await poster({ author: 'Robot', rating: '5', text: 'Un texte de robot assez long pour le reste.', site_web: 'http://spam.example' })
  verifie('faux succes renvoye au bot (ne pas reveler la detection)', r.statut === 200)
  verifie('rien n a ete enregistre', reviews.length === avant, 'obtenu ' + reviews.length + ' (attendu ' + avant + ')')

  console.log('\n--- D. Produit inconnu : ignore, pas un echec ---')
  r = await poster({ author: 'Client', rating: '4', text: 'Avis sur un produit qui n existe pas vraiment.', product_id: 'produit-fantome' })
  verifie('=> 200/201 quand meme', r.statut === 200 || r.statut === 201, 'obtenu ' + r.statut)
  const derniere = reviews[reviews.length - 1]
  verifie('product_ids vide (id fantome non conserve)', Array.isArray(derniere?.product_ids) && (derniere.product_ids as string[]).length === 0)

  console.log('\n--- E. Rendu par produit : filtrage + resume reel + badge verifie ---')
  reviews = [
    { id: 'v1', author: 'Amine', rating: 5, text: 'Top', visible: true, verified: true, product_ids: ['1'], created_at: new Date().toISOString() },
    { id: 'v2', author: 'Sofia', rating: 3, text: 'Correct', visible: true, verified: false, product_ids: ['1'], created_at: new Date().toISOString() },
    { id: 'v3', author: 'Autre', rating: 5, text: 'Pour un autre produit', visible: true, verified: true, product_ids: ['5'], created_at: new Date().toISOString() },
  ]
  const page = await (await fetch(base() + '/products/cire-cheveux-premium')).text()
  verifie('les 2 avis du produit 1 apparaissent (Amine et Sofia)', page.includes('Amine') && page.includes('Sofia'))
  verifie('l avis d un AUTRE produit (Autre) n apparait PAS ici', !page.includes('>Autre<') && !(page.includes('Autre') && page.includes('Pour un autre produit')))
  verifie('moyenne reelle (5+3)/2=4,0 affichee, pas un chiffre invente', page.includes('4,0/5') || page.includes('4,0<'))
  verifie('badge verifie affiche pour l avis verifie (Amine)', page.includes('Achat vérifié'))

  console.log('\n--- F. Aucun avis pour un produit : pas de faux chiffre ---')
  reviews = []
  const pageVide = await (await fetch(base() + '/products/peigne-texture-expert')).text()
  verifie('invitation a laisser le premier avis, pas de moyenne inventee', pageVide.includes('premier') && !pageVide.includes('avis vérifiés'))

  console.log('\n--- G. Resume de l accueil, recalcule depuis les vrais avis ---')
  reviews = [
    { id: 'h1', author: 'Amine', rating: 5, text: 'Top', visible: true, verified: true, product_ids: [], created_at: new Date().toISOString() },
    { id: 'h2', author: 'Sofia', rating: 3, text: 'Correct', visible: true, verified: false, product_ids: [], created_at: new Date().toISOString() },
    { id: 'h3', author: 'Karim', rating: 5, text: 'Top aussi', visible: true, verified: true, product_ids: [], created_at: new Date().toISOString() },
  ]
  const accueil = await (await fetch(base() + '/')).text()
  verifie('moyenne reelle (5+3+5)/3=4,3 affichee (pas 4,9 en dur)', accueil.includes('4,3'))
  // "500+" existe par ailleurs sur la page (bandeau clients, sans rapport) --
  // on se limite au contenu de .h-rev-total pour ne pas se faire piocher par
  // un texte non concerne par ce correctif.
  const zoneTotal = accueil.slice(accueil.indexOf('h-rev-total'), accueil.indexOf('h-rev-total') + 80)
  verifie('le compte reel (3) est affiche dans le resume, pas "500+"', zoneTotal.includes('-->3<!--') && !zoneTotal.includes('500'))

  console.log('\n--- H. Accueil sans aucun vrai avis : repli sur les avis de secours ---')
  reviews = []
  const accueilVide = await (await fetch(base() + '/')).text()
  verifie(
    'repli sur les avis de secours (note 5,0, 6 avis)',
    accueilVide.includes('5,0') && accueilVide.includes('Basé sur') && accueilVide.includes('-->6<!--'),
  )

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
