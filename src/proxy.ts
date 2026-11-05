import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_ADMIN, verifierJeton } from '@/lib/admin-auth'
import { SITE_CONTENT_DEFAULTS } from '@/lib/site-content-data'

/**
 * Mode "bientot disponible" (2026-11-05, decision Hedi -- urgent, trailer
 * sorti sur Instagram, ouverture samedi, Stripe encore en mode test).
 *
 * Next.js 16 a renomme middleware.ts en proxy.ts (export `proxy`, pas
 * `middleware`) -- voir node_modules/next/dist/docs/.../proxy.md. Le runtime
 * par defaut est desormais Node.js (plus Edge), ce qui permet de reutiliser
 * directement verifierJeton() (node:crypto) sans aucune contrainte.
 *
 * Interrupteur : table `site_content`, cle `site_ouvert` -- reutilise le
 * meme mecanisme et le meme onglet admin ("Contenu") que les autres blocs de
 * texte du site, PAS une nouvelle table. `visible` represente ici "la
 * boutique est ouverte au public" (pas "le bandeau est affiche") pour que le
 * bouton generique Masquer/Afficher de cet onglet reste intuitif : Masquer
 * ferme la boutique, Afficher la rouvre. Defaut volontaire `visible: false`
 * (voir site-content-data.ts) : le site est ferme des ce code deploye, sans
 * ecriture en base necessaire.
 *
 * Cache ~30s en memoire du process (simple, suffisant pour ne pas interroger
 * Supabase a chaque requete) -- en cas de panne Supabase, on garde le
 * dernier etat connu si on en a un ; sinon (tout premier appel, jamais
 * reussi a lire), on se replie sur FERME plutot qu'OUVERT : pendant cette
 * semaine de lancement, mieux vaut montrer la page d'attente par erreur
 * qu'exposer le site (Stripe en mode test) par erreur.
 */

const CLE_CONTENU = 'site_ouvert'
const DUREE_CACHE_MS = 30_000

type EtatSite = { ouvert: boolean; message: string }

let etatConnu: EtatSite | null = null
let expireA = 0

async function lireEtatSite(): Promise<EtatSite> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('configuration Supabase absente')

  const res = await fetch(
    `${url}/rest/v1/site_content?key=eq.${CLE_CONTENU}&select=visible,text`,
    { headers: { apikey: cle, Authorization: `Bearer ${cle}` }, signal: AbortSignal.timeout(2500) },
  )
  if (!res.ok) throw new Error(`Supabase -> ${res.status}`)

  const lignes = (await res.json()) as { visible?: boolean; text?: string }[]
  const ligne = Array.isArray(lignes) ? lignes[0] : null
  const defaut = SITE_CONTENT_DEFAULTS[CLE_CONTENU]

  return ligne
    ? {
        ouvert: typeof ligne.visible === 'boolean' ? ligne.visible : defaut.visible,
        message: typeof ligne.text === 'string' && ligne.text.trim() ? ligne.text : defaut.text,
      }
    : { ouvert: defaut.visible, message: defaut.text }
}

async function etatSiteAvecCache(): Promise<EtatSite> {
  if (etatConnu && Date.now() < expireA) return etatConnu
  try {
    const frais = await lireEtatSite()
    etatConnu = frais
    expireA = Date.now() + DUREE_CACHE_MS
    return frais
  } catch (e) {
    console.error('[proxy] lecture site_ouvert impossible:', e instanceof Error ? e.message : String(e))
    if (etatConnu) {
      // Panne transitoire : on garde le dernier etat reellement lu, on
      // retente bientot plutot que d'attendre le plein cache de 30s.
      expireA = Date.now() + 5_000
      return etatConnu
    }
    return { ouvert: false, message: SITE_CONTENT_DEFAULTS[CLE_CONTENU].text }
  }
}

function pageAttenteHtml(message: string): string {
  const instagram = 'https://www.instagram.com/spbarber'
  const texteEchappe = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>SP Barber — Bientôt disponible</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:wght@500;600&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root { --w:#f8f6f3; --b:#0c0c0c; --g:#f0ede8; --gm:#e0dbd4; --gt:#9a9590; --gold:#b8903a; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; background: var(--w); color: var(--b);
    font-family: 'DM Sans', sans-serif;
    display: flex; align-items: center; justify-content: center;
    padding: 24px; text-align: center;
  }
  .wrap { max-width: 480px; }
  .logo {
    font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 6px;
    margin-bottom: 36px;
  }
  .logo .dot { color: var(--gold); }
  h1 {
    font-family: 'Cormorant Garamond', serif; font-weight: 600;
    font-size: clamp(28px, 6vw, 40px); margin: 0 0 16px; color: var(--b);
  }
  p.msg { font-size: 15px; line-height: 1.7; color: var(--gt); margin: 0 0 32px; }
  .insta {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--b); text-decoration: none; border: 1px solid var(--gold);
    padding: 12px 28px; border-radius: 2px; transition: background .2s;
  }
  .insta:hover { background: var(--g); }
</style>
</head>
<body>
  <div class="wrap">
    <div class="logo">SP<span class="dot">.</span>BARBER</div>
    <h1>Bientôt disponible</h1>
    <p class="msg">${texteEchappe}</p>
    <a class="insta" href="${instagram}" target="_blank" rel="noopener noreferrer">Suivez-nous sur Instagram</a>
  </div>
</body>
</html>`
}

export const config = {
  matcher: [
    '/((?!admin|api/admin|api/webhook|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}

export async function proxy(request: NextRequest) {
  const { ouvert, message } = await etatSiteAvecCache()
  if (ouvert) return NextResponse.next()

  // Session admin valide : passe normalement sur tout le site (relecture
  // directe du cookie -- estAdmin() lit via next/headers, indisponible en
  // Proxy, voir admin-auth.ts).
  const jeton = request.cookies.get(COOKIE_ADMIN)?.value
  if (verifierJeton(jeton)) return NextResponse.next()

  return new NextResponse(pageAttenteHtml(message), {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': '3600',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  })
}
