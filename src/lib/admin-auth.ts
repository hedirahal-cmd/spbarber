import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

/**
 * Authentification de l'administration — implementation UNIQUE.
 *
 * L'ancienne version posait le cookie `spbarber_admin=authenticated`, une chaine
 * litterale sans secret : n'importe qui pouvait la fabriquer et ouvrir tout le
 * back-office. La garde etait recopiee dans onze fichiers sous deux orthographes,
 * et deux GET avaient ete oublies.
 *
 * Ce module remplace les deux problemes a la fois : un jeton signe, et une seule
 * fonction de verification que toutes les routes importent.
 *
 * Le jeton vaut `<expiration>.<alea>.<signature>`, la signature etant un
 * HMAC-SHA256 sur `<expiration>.<alea>`. Il est signe avec ADMIN_SESSION_SECRET
 * et NON avec ADMIN_PASSWORD : le jeton circule jusqu'au navigateur, et le signer
 * avec le mot de passe permettrait de casser celui-ci hors ligne.
 */

export const COOKIE_ADMIN = 'spbarber_admin'

/** Duree de vie d'une session d'administration. */
const DUREE_SECONDES = 60 * 60 * 8

/** Longueur minimale exigee du secret, en caracteres. */
const LONGUEUR_MIN_SECRET = 32

/**
 * Rend le secret de signature, ou null s'il est absent ou trop court.
 * Sans secret utilisable on ECHOUE FERME : l'administration devient
 * inaccessible plutot que d'accepter n'importe quel jeton.
 */
function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s || s.length < LONGUEUR_MIN_SECRET) return null
  return s
}

function signer(charge: string, cle: string): string {
  return createHmac('sha256', cle).update(charge).digest('base64url')
}

/** Comparaison a temps constant, insensible a la longueur. */
function memeValeur(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * Fabrique un jeton de session. Rend null si le secret manque — l'appelant
 * doit alors refuser la connexion plutot que de poser un cookie non signe.
 */
export function creerJeton(): string | null {
  const cle = secret()
  if (!cle) return null
  const expiration = Math.floor(Date.now() / 1000) + DUREE_SECONDES
  const alea = randomBytes(12).toString('base64url')
  const charge = `${expiration}.${alea}`
  return `${charge}.${signer(charge, cle)}`
}

/** Verifie la signature et l'expiration d'un jeton. */
export function verifierJeton(jeton: string | undefined | null): boolean {
  const cle = secret()
  if (!cle || !jeton) return false

  const morceaux = jeton.split('.')
  if (morceaux.length !== 3) return false

  const [expiration, alea, signature] = morceaux
  if (!memeValeur(signature, signer(`${expiration}.${alea}`, cle))) return false

  const limite = Number(expiration)
  if (!Number.isFinite(limite)) return false
  return limite > Math.floor(Date.now() / 1000)
}

/**
 * LA garde de l'administration. Toute route sous /api/admin doit l'appeler,
 * sur CHAQUE verbe -- y compris les GET.
 */
export async function estAdmin(): Promise<boolean> {
  if (!secret()) {
    console.error(
      '[admin-auth] ADMIN_SESSION_SECRET absente ou trop courte (' +
        LONGUEUR_MIN_SECRET +
        ' caracteres minimum) : toute authentification est refusee.',
    )
    return false
  }
  const magasin = await cookies()
  return verifierJeton(magasin.get(COOKIE_ADMIN)?.value)
}

/**
 * Options du cookie de session.
 * `secure` est conditionne a l'environnement : impose en production, relache en
 * developpement pour que http://localhost continue de fonctionner.
 */
export function optionsCookie(dureeSecondes: number = DUREE_SECONDES) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: dureeSecondes,
    path: '/',
  }
}

/** Comparaison du mot de passe, a temps constant. */
export function motDePasseValide(fourni: unknown): boolean {
  const attendu = process.env.ADMIN_PASSWORD
  if (!attendu || typeof fourni !== 'string') return false
  return memeValeur(fourni, attendu)
}
