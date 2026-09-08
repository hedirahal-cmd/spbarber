// DEMARRAGE DU SERVEUR POUR LES BANCS — une seule implementation.
//
// Trois bancs demarrent un `next dev` pour s eprouver contre le vrai serveur.
// Ils portaient chacun leur copie de la boucle d attente, et cette boucle mentait :
// elle sondait le port pendant 120 secondes puis CONTINUAIT quoi qu il arrive.
// La premiere vraie requete explosait alors en `ECONNREFUSED` brut, sans dire si
// le serveur etait mort ou simplement en train de compiler.
//
// C est ce qui s est produit apres un deplacement du depot : le cache .next avait
// disparu, la premiere compilation a froid dependait la fenetre, et TROIS bancs
// ont rapporte un echec sur du code sain. Meme famille que la sortie 127 corrigee
// au bloc 1 : un filet qui crie sur du sain finit par ne plus etre lu.
//
// Ce module distingue donc les deux causes, et le dit.

import { spawn } from 'node:child_process'
import http from 'node:http'

/** Budget d attente par defaut. Genereux : une compilation a froid depasse 120 s. */
const BUDGET_SECONDES_DEFAUT = 300

/** Le port est-il libre ? Un serveur residuel repondrait a la place du notre. */
export async function portLibre(port: number): Promise<boolean> {
  return new Promise((resoudre) => {
    const sonde = http.createServer()
    sonde.once('error', () => resoudre(false))
    sonde.once('listening', () => sonde.close(() => resoudre(true)))
    sonde.listen(port, '127.0.0.1')
  })
}

export type Demarrage =
  | { ok: true; arreter: () => void }
  | { ok: false; motif: string; arreter: () => void }

/**
 * Demarre un `next dev` sur le port donne et attend qu il reponde.
 *
 * Rend un motif EXPLICITE en cas d echec, jamais une exception reseau brute :
 *   - le port etait deja occupe ;
 *   - le processus s est arrete (et avec quel code) ;
 *   - le budget est epuise alors que le processus tourne toujours — c est le cas
 *     de la compilation a froid, et le motif le dit pour qu on ne cherche pas
 *     un bug la ou il n y en a pas.
 */
export async function demarrerServeur(options: {
  port: number
  env: NodeJS.ProcessEnv
  budgetSecondes?: number
}): Promise<Demarrage> {
  const { port, env } = options
  const budget = options.budgetSecondes ?? BUDGET_SECONDES_DEFAUT
  const rien = () => {}

  if (!(await portLibre(port))) {
    return {
      ok: false,
      arreter: rien,
      motif:
        `le port ${port} est deja occupe. Un serveur residuel repondrait a la place ` +
        `du notre et le banc mesurerait autre chose que ce qu il croit. Libere-le puis relance.`,
    }
  }

  console.log('  demarrage de next dev sur le port ' + port + ' ...')

  // Binaire Next lance directement, sans npx ni shell : le pid obtenu est celui
  // du serveur, et non celui d un intermediaire qu on tuerait en laissant le
  // serveur vivant derriere.
  const serveur = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'dev', '-p', String(port)],
    { env, stdio: 'ignore' },
  )

  let mort: { code: number | null; signal: NodeJS.Signals | null } | null = null
  serveur.on('exit', (code, signal) => {
    mort = { code, signal }
  })
  let erreurSpawn: string | null = null
  serveur.on('error', (e) => {
    erreurSpawn = e.message
  })

  let arrete = false
  const arreter = () => {
    if (arrete) return
    arrete = true
    if (process.platform === 'win32' && serveur.pid) {
      spawn('taskkill', ['/pid', String(serveur.pid), '/T', '/F'], { stdio: 'ignore' }).unref()
    } else {
      serveur.kill('SIGTERM')
    }
    // Le handle de l enfant ne doit plus retenir la boucle d evenements : les
    // bancs ne forcent plus la sortie (cf. la sortie 127 corrigee au bloc 1),
    // ils laissent la boucle se vider.
    serveur.unref()
  }
  process.on('exit', arreter)

  const debut = Date.now()
  let dernierSignalement = 0

  for (;;) {
    const ecoule = Math.round((Date.now() - debut) / 1000)

    if (erreurSpawn) {
      return { ok: false, arreter, motif: `le serveur n a pas pu etre lance : ${erreurSpawn}` }
    }
    if (mort) {
      const m = mort as { code: number | null; signal: NodeJS.Signals | null }
      return {
        ok: false,
        arreter,
        motif:
          `le serveur s est ARRETE apres ${ecoule} s ` +
          `(code ${m.code}, signal ${m.signal}). Ce n est pas une lenteur de compilation : ` +
          `le processus n existe plus. Relance-le a la main pour voir son erreur.`,
      }
    }

    try {
      const reponse = await fetch('http://127.0.0.1:' + port + '/')
      if (reponse.ok) return { ok: true, arreter }
    } catch {
      // connexion refusee : le serveur compile encore, ou vient de mourir --
      // c est le tour de boucle suivant qui tranchera, via `mort`.
    }

    if (ecoule >= budget) {
      return {
        ok: false,
        arreter,
        motif:
          `le serveur n a toujours pas repondu apres ${budget} s, alors que le processus ` +
          `TOURNE ENCORE. C est une compilation qui n en finit pas, pas une panne : ` +
          `cache .next absent (depot fraichement clone ou deplace), ou machine chargee. ` +
          `Amorce le cache par un « npm run dev » manuel, puis relance le banc.`,
      }
    }

    // Un signalement toutes les 30 s, pour qu une attente longue ne ressemble
    // pas a un blocage silencieux.
    if (ecoule - dernierSignalement >= 30) {
      dernierSignalement = ecoule
      console.log(`  ... compilation en cours depuis ${ecoule} s (budget ${budget} s)`)
    }

    await new Promise((r) => setTimeout(r, 1000))
  }
}
