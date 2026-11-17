import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Client Boxtal (API v3, etiquettes Colissimo/Chronopost) -- chantier
 * 2026-10-21, demande Hedi.
 *
 * 2026-11-18 : premier essai REEL en production refuse (400 BAD_REQUEST,
 * sans detail de champ). Hedi a fourni le fichier OpenAPI officiel complet
 * de l'API v3 -- ce fichier, pas le client tiers etudie au depart (ErnadoO/
 * boxtal sur GitHub, garde comme reference historique mais desormais
 * secondaire), fait foi partout ou les deux divergent :
 *   - labelType corrige : 'A4' n'existe pas dans l'enum officiel
 *     (CreateShippingOrderRequest.labelType), seul PDF_A4/PDF_10x15 sont
 *     valides -- voir creerCommandeExpedition ;
 *   - listerCodesOffre RETIREE : son chemin "/v3.1/shipping-offer-code"
 *     etait deduit par analogie et n'existe pas dans la liste reelle des
 *     endpoints -- aucune liste de codes d'offre n'est exposee par cette
 *     API. GET /v3.1/content-category, lui, EST un vrai endpoint confirme
 *     -- voir listerCategoriesContenu, reservee a /api/admin/boxtal/
 *     content-categories (lecture seule, jamais d'etiquette creee) ;
 *   - base URL/chemins (https://api.boxtal.com/shipping + /v3.1/...) et
 *     authentification Basic : CONFIRMES conformes a la specification
 *     officielle, rien a corriger.
 *   - suspect encore ouvert au moment d'ecrire ceci, PAS corrige sans
 *     preuve : content.id "content:v1:30100" (jamais verifie pour le vrai
 *     compte de Hedi -- c'est precisement ce que /content-categories sert
 *     a confirmer, sans lui demander ses cles).
 *
 * Reste confirme par la doc officielle (bac a sable https://api.boxtal.build
 * /shipping avec compte de test separe, aucune facturation en bac a sable,
 * evenements de suivi factices ~20 min) meme si Hedi n'a pas de compte de
 * test a ce jour -- toujours vrai pour l'avenir, simplement pas utilisable
 * tout de suite.
 *
 * Encore A CONFIRMER : l'encodage exact de la signature webhook (la doc
 * fournie ne precise que le principe HMAC-SHA256, pas hexa vs base64 -- voir
 * verifierSignatureWebhook).
 *
 * GARDE-FOU meme principe que Stripe (src/lib/stripe.ts) : deux paires de cles
 * nommees separement (bac a sable / production), et un passage en production
 * qui exige un geste explicite -- un copier-coller de cle ne suffit pas a lui
 * seul a facturer un vrai envoi.
 */

export type ModeBoxtal = 'sandbox' | 'production'

const PRODUCTION_AUTORISEE = process.env.BOXTAL_AUTORISER_PRODUCTION === 'oui'
export const MODE_BOXTAL: ModeBoxtal = PRODUCTION_AUTORISEE ? 'production' : 'sandbox'

const ACCESS_KEY = (
  MODE_BOXTAL === 'production'
    ? process.env.BOXTAL_PRODUCTION_ACCESS_KEY
    : process.env.BOXTAL_SANDBOX_ACCESS_KEY
) ?? ''
const SECRET_KEY = (
  MODE_BOXTAL === 'production'
    ? process.env.BOXTAL_PRODUCTION_SECRET_KEY
    : process.env.BOXTAL_SANDBOX_SECRET_KEY
) ?? ''

// Overridable UNIQUEMENT pour les bancs de verification (faux serveur local) --
// jamais documente a Hedi, les deux vraies URL sont fixes.
const BASE_URL =
  process.env.BOXTAL_API_BASE_URL?.trim() ||
  (MODE_BOXTAL === 'production' ? 'https://api.boxtal.com/shipping' : 'https://api.boxtal.build/shipping')

/** Rend la raison pour laquelle Boxtal ne doit pas etre utilise, ou null si tout va bien. */
export function problemeConfigurationBoxtal(): string | null {
  if (!ACCESS_KEY.trim() || !SECRET_KEY.trim()) {
    const prefixe = MODE_BOXTAL === 'production' ? 'BOXTAL_PRODUCTION_' : 'BOXTAL_SANDBOX_'
    return `${prefixe}ACCESS_KEY/SECRET_KEY absente(s) : aucune etiquette Boxtal possible (mode ${MODE_BOXTAL}).`
  }
  return null
}

const PROBLEME = problemeConfigurationBoxtal()
if (PROBLEME) {
  console.error('[Boxtal] ' + PROBLEME)
} else {
  console.log('[Boxtal] mode actif : ' + MODE_BOXTAL)
}

/** Expediteur fixe (2026-10-21, decision Hedi) : toujours Fougeres, jamais de choix de salon. */
export const BOXTAL_EXPEDITEUR_EMAIL = 'spbarbershopexploitation@hotmail.com'
export const BOXTAL_EXPEDITEUR_NOM = { prenom: 'SP Barber Shop', nom: 'Fougères' }

/**
 * Codes d'offre Colissimo/Chronopost (livraison a domicile), en dur par defaut
 * (2026-11-11, decision Hedi -- rien a poser dans Vercel de ce cote) :
 *   - POFR-ColissimoAccess : confirme par un devis reel passe directement a
 *     l'API (Colissimo Domicile sans signature).
 *   - CHRP-Chrono18 : recommandation faite a Hedi (Chronopost 18h, le niveau
 *     "domicile standard" le plus proche de Colissimo parmi les offres
 *     Chrono13/Chrono18/ChronoRelais etc.), jamais confirme par un devis reel
 *     comme Colissimo -- a verifier au tout premier essai Chronopost.
 * BOXTAL_OFFER_CODE_COLISSIMO/CHRONOPOST restent prioritaires si Hedi les
 * pose dans Vercel (ex. pour changer d'offre sans redeployer), sinon ces
 * valeurs par defaut s'appliquent.
 */
const OFFER_CODES_PAR_DEFAUT: Record<'colissimo' | 'chronopost', string> = {
  colissimo: 'POFR-ColissimoAccess',
  chronopost: 'CHRP-Chrono18',
}
const OFFER_CODES: Record<'colissimo' | 'chronopost', string | undefined> = {
  colissimo: process.env.BOXTAL_OFFER_CODE_COLISSIMO || OFFER_CODES_PAR_DEFAUT.colissimo,
  chronopost: process.env.BOXTAL_OFFER_CODE_CHRONOPOST || OFFER_CODES_PAR_DEFAUT.chronopost,
}

export function offerCodePour(transporteur: 'colissimo' | 'chronopost'): string | null {
  return OFFER_CODES[transporteur] ?? null
}

export type BoxtalAdresse = {
  prenom: string
  nom: string
  email: string
  telephone: string
  rue: string
  codePostal: string
  ville: string
  paysIso?: string
  numero?: string
  societe?: string
  residentiel?: boolean
  complement?: string
}

function adresseVersJson(a: BoxtalAdresse): Record<string, unknown> {
  const contact: Record<string, string> = { firstName: a.prenom, lastName: a.nom, email: a.email, phone: a.telephone }
  if (a.societe) contact.company = a.societe
  const location: Record<string, string> = {
    street: a.rue,
    postalCode: a.codePostal,
    city: a.ville,
    countryIsoCode: a.paysIso ?? 'FR',
  }
  if (a.numero) location.number = a.numero
  const out: Record<string, unknown> = { type: a.residentiel === false ? 'BUSINESS' : 'RESIDENTIAL', contact, location }
  if (a.complement) out.additionalInformation = a.complement
  return out
}

export type BoxtalColis = {
  poidsKg: number
  longueurCm: number
  largeurCm: number
  hauteurCm: number
  valeurEur: number
  description: string
}

function colisVersJson(c: BoxtalColis): Record<string, unknown> {
  return {
    type: 'PARCEL',
    weight: c.poidsKg,
    length: Math.round(c.longueurCm),
    width: Math.round(c.largeurCm),
    height: Math.round(c.hauteurCm),
    value: { value: Math.round(c.valeurEur * 100) / 100, currency: 'EUR' },
    // id par defaut du client tiers = cosmetiques/bien-etre -- correspond au
    // catalogue SP Barber (soins, coiffants, accessoires).
    content: { id: 'content:v1:30100', description: c.description },
  }
}

export class BoxtalApiError extends Error {
  constructor(message: string, readonly statut: number) {
    super(message)
    this.name = 'BoxtalApiError'
  }
}

/**
 * Cles portant une donnee personnelle (nom, email, telephone, adresse) dans
 * le corps envoye a Boxtal -- jamais les cles structurelles (poids,
 * dimensions, codes, type, pays...) qui sont precisement ce qu'il faut voir
 * pour diagnostiquer un 400 (2026-11-18, demande Hedi suite au premier essai
 * reel refuse). La LONGUEUR de la valeur masquee reste visible : un champ
 * vide ou anormalement court/long est souvent la cause reelle d'un refus de
 * validation, sans jamais exposer son contenu dans les logs Vercel.
 */
const CLES_PERSONNELLES = new Set(['firstName', 'lastName', 'email', 'phone', 'street'])

function masquerPourLog(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(masquerPourLog)
  if (valeur && typeof valeur === 'object') {
    const sortie: Record<string, unknown> = {}
    for (const [cle, v] of Object.entries(valeur as Record<string, unknown>)) {
      sortie[cle] = CLES_PERSONNELLES.has(cle) && typeof v === 'string' ? `[masqué, ${v.length} car.]` : masquerPourLog(v)
    }
    return sortie
  }
  return valeur
}

async function appelBoxtal(chemin: string, methode: string, corps?: unknown): Promise<unknown> {
  const probleme = problemeConfigurationBoxtal()
  if (probleme) throw new Error(probleme)

  // Jamais les en-tetes (Authorization porte les cles secretes) -- seulement
  // le corps, et seulement sa version masquee. Journalise a CHAQUE appel
  // (pas seulement sur erreur) pour garder un historique utile si un succes
  // d'aujourd'hui devient le refus de demain (ex. code d'offre qui cesse
  // d'etre valide).
  if (corps !== undefined) {
    console.log('[Boxtal] requête', methode, chemin, ':', JSON.stringify(masquerPourLog(corps)))
  }

  const reponse = await fetch(BASE_URL + chemin, {
    method: methode,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${ACCESS_KEY}:${SECRET_KEY}`).toString('base64'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...(corps !== undefined ? { body: JSON.stringify(corps) } : {}),
  })

  const texte = await reponse.text()
  let data: Record<string, unknown> = {}
  try {
    data = texte ? JSON.parse(texte) : {}
  } catch {
    // Reponse non-JSON (ex. 502 d'un proxy) : data reste {}, le statut HTTP
    // ci-dessous porte quand meme l'erreur.
  }

  if (reponse.status >= 400) {
    // Corps COMPLET de la reponse d'erreur journalise ici (jamais de donnee
    // personnelle nôtre dans une reponse Boxtal -- au pire, Boxtal pourrait
    // echoer des champs qu'on lui a envoyes, non masques ici volontairement :
    // c'est la reponse du PRESTATAIRE, distincte de notre propre requete
    // juste au-dessus, deja masquee, elle).
    console.error('[Boxtal] erreur', reponse.status, methode, chemin, '-- corps de la réponse :', texte.slice(0, 2000))
    throw new BoxtalApiError(`Boxtal ${methode} ${chemin} -> ${reponse.status} : ${texte.slice(0, 500)}`, reponse.status)
  }

  return data.content ?? {}
}

/** Cree la commande d'expedition -- un seul colis, voir CARTON_STANDARD plus haut pour les paniers multi-produits. */
export async function creerCommandeExpedition(params: {
  offerCode: string
  from: BoxtalAdresse
  to: BoxtalAdresse
  colis: BoxtalColis
  externalId: string
}): Promise<{ id: string; status: string }> {
  const corps = {
    shippingOfferCode: params.offerCode,
    // 'A4' (sans prefixe) est REFUSE -- la specification OpenAPI officielle
    // de Boxtal (CreateShippingOrderRequest.labelType) n'accepte que l'enum
    // PDF_A4/PDF_10x15. Corrige le 2026-11-18 suite au premier essai reel,
    // refuse en 400 BAD_REQUEST (voir l'audit -- confirme en comparant au
    // fichier OpenAPI officiel fourni par Hedi, pas une simple hypothese).
    labelType: 'PDF_A4',
    insured: false,
    shipment: {
      fromAddress: adresseVersJson(params.from),
      toAddress: adresseVersJson(params.to),
      packages: [colisVersJson(params.colis)],
      externalId: params.externalId,
    },
  }
  const content = (await appelBoxtal('/v3.1/shipping-order', 'POST', corps)) as Record<string, unknown>
  return { id: String(content.id ?? ''), status: String(content.status ?? '') }
}

export type BoxtalDocument = { type: string; format: string; url: string }

/** L'etiquette n'est pas forcement prete tout de suite -- peut rendre une liste vide, voir le webhook DOCUMENT_CREATED. */
export async function recupererDocuments(shippingOrderId: string): Promise<BoxtalDocument[]> {
  const content = await appelBoxtal(`/v3.1/shipping-order/${encodeURIComponent(shippingOrderId)}/shipping-document`, 'GET')
  if (!Array.isArray(content)) return []
  return content.map((d) => {
    const doc = d as Record<string, unknown>
    return { type: String(doc.type ?? ''), format: String(doc.format ?? ''), url: String(doc.url ?? '') }
  })
}

export type BoxtalSuivi = { trackingNumber: string; trackingUrl: string; status: string; message: string }

export async function recupererSuivi(shippingOrderId: string): Promise<BoxtalSuivi[]> {
  const content = await appelBoxtal(`/v3.1/shipping-order/${encodeURIComponent(shippingOrderId)}/tracking`, 'GET')
  if (!Array.isArray(content)) return []
  return content.map((t) => {
    const tr = t as Record<string, unknown>
    return {
      trackingNumber: String(tr.trackingNumber ?? ''),
      trackingUrl: String(tr.packageTrackingUrl ?? ''),
      status: String(tr.status ?? ''),
      message: String(tr.message ?? ''),
    }
  })
}

/** Possible uniquement avant remise au transporteur (verrouille cote admin, voir admin/page.tsx). */
export async function annulerCommandeExpedition(shippingOrderId: string): Promise<void> {
  await appelBoxtal(`/v3.1/shipping-order/${encodeURIComponent(shippingOrderId)}`, 'DELETE')
}

export type BoxtalCategorieContenu = { id: string; label: string }

/**
 * Liste les VRAIES categories de contenu du compte (GET /v3.1/content-
 * category) -- endpoint CONFIRME par la specification OpenAPI officielle
 * fournie par Hedi (2026-11-18), contrairement a l'ancienne listerCodesOffre
 * (retiree le meme jour : son chemin "/v3.1/shipping-offer-code" etait
 * deduit par analogie et n'existe PAS dans la liste reelle des endpoints de
 * cette API -- aucune liste de codes d'offre n'y est exposee).
 *
 * Reservee a un usage en lecture seule depuis l'admin (voir
 * /api/admin/boxtal/content-categories) : ne cree et n'annule jamais
 * d'etiquette, jamais appelee automatiquement ailleurs dans ce fichier.
 */
export async function listerCategoriesContenu(): Promise<BoxtalCategorieContenu[]> {
  const content = await appelBoxtal('/v3.1/content-category?language=fr', 'GET')
  if (!Array.isArray(content)) return []
  return content.map((c) => {
    const cat = c as Record<string, unknown>
    return { id: String(cat.id ?? ''), label: String(cat.label ?? '') }
  })
}

function comparaisonConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * Verifie la signature d'un webhook Boxtal (en-tete x-bxt-signature, HMAC-SHA256
 * du corps BRUT avec BOXTAL_WEBHOOK_SECRET). L'encodage exact (hexa ou base64)
 * n'est precise nulle part dans la documentation accessible -- le client tiers
 * etudie accepte defensivement les deux, cette fonction fait de meme plutot que
 * de paraitre a tort cassee a la premiere vraie livraison.
 */
export function verifierSignatureWebhook(corpsBrut: string, signature: string | null | undefined): boolean {
  const secretWebhook = process.env.BOXTAL_WEBHOOK_SECRET
  if (!secretWebhook || !signature) return false

  const sig = signature.trim().replace(/^sha256=/i, '')
  const digest = createHmac('sha256', secretWebhook).update(corpsBrut).digest()
  const hex = digest.toString('hex')
  const base64 = digest.toString('base64')

  return comparaisonConstante(sig.toLowerCase(), hex.toLowerCase()) || comparaisonConstante(sig, base64)
}

export type BoxtalWebhookEvent = {
  id: string
  type: 'DOCUMENT_CREATED' | 'TRACKING_CHANGED' | null
  shippingOrderId: string
  shipmentExternalId: string | null
  documents: BoxtalDocument[]
  trackings: BoxtalSuivi[]
}

/** Decode le corps d'un webhook deja verifie (voir verifierSignatureWebhook) -- jamais appele sur un corps non authentifie. */
export function analyserWebhook(corpsBrut: string): BoxtalWebhookEvent {
  const data = JSON.parse(corpsBrut) as Record<string, unknown>
  const payload = (data.payload ?? {}) as Record<string, unknown>
  const typeConnu = data.type === 'DOCUMENT_CREATED' || data.type === 'TRACKING_CHANGED'

  const documents = Array.isArray(payload.documents)
    ? (payload.documents as unknown[]).map((d) => {
        const doc = d as Record<string, unknown>
        return { type: String(doc.type ?? ''), format: String(doc.format ?? ''), url: String(doc.url ?? '') }
      })
    : []

  const trackings = Array.isArray(payload.trackings)
    ? (payload.trackings as unknown[]).map((t) => {
        const tr = t as Record<string, unknown>
        return {
          trackingNumber: String(tr.trackingNumber ?? ''),
          trackingUrl: String(tr.packageTrackingUrl ?? ''),
          status: String(tr.status ?? ''),
          message: String(tr.message ?? ''),
        }
      })
    : []

  return {
    id: String(data.id ?? ''),
    type: typeConnu ? (data.type as 'DOCUMENT_CREATED' | 'TRACKING_CHANGED') : null,
    shippingOrderId: String(data.shippingOrderId ?? ''),
    shipmentExternalId: typeof data.shipmentExternalId === 'string' ? data.shipmentExternalId : null,
    documents,
    trackings,
  }
}
