import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Client Boxtal (API v3, etiquettes Colissimo/Chronopost) -- chantier
 * 2026-10-21, demande Hedi.
 *
 * L'API officielle (developer.boxtal.com) est une appli JS illisible par nos
 * outils de recherche -- la forme exacte des requetes/reponses ci-dessous vient
 * d'un client tiers open-source bien maintenu (ErnadoO/boxtal sur GitHub), qui
 * implemente et teste reellement cette API, RECOUPEE avec ce que Hedi a lu
 * directement sur la doc officielle (guides developer.boxtal.com/fr/fr/apiv3/
 * guide/ : sandbox-api-v3, auth-api-v3, order-api-v3, document-events-api-v3,
 * list-shipping-offer-code-api-v3) :
 *   - bac a sable confirme sur https://api.boxtal.build/shipping, avec un
 *     compte de test SEPARE et ses propres cles -- les cles de production n y
 *     fonctionnent pas ;
 *   - aucune facturation en bac a sable, seuls les bordereaux sont generes,
 *     et les evenements de suivi FACTICES arrivent toutes les ~20 minutes
 *     (Colissimo et Chronopost inclus) -- le webhook se declenchera donc tout
 *     seul lors d'un vrai essai, sans action manuelle ;
 *   - authentification Basic (confirme) ou bearer token (alternative non
 *     implementee ici, Basic suffit) ;
 *   - un point d'acces liste les codes d'offre reels du compte (voir
 *     listerCodesOffre plus bas) -- a appeler une fois les cles de test
 *     posees pour remplacer les BOXTAL_OFFER_CODE_* par les vraies valeurs.
 *
 * Encore A CONFIRMER a la premiere vraie requete : l'encodage exact de la
 * signature webhook (la doc Boxtal ne le precise pas, voir
 * verifierSignatureWebhook) et le chemin exact de listerCodesOffre (deduit par
 * analogie, pas trouve verbatim).
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

async function appelBoxtal(chemin: string, methode: string, corps?: unknown): Promise<unknown> {
  const probleme = problemeConfigurationBoxtal()
  if (probleme) throw new Error(probleme)

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
    labelType: 'A4',
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

export type BoxtalOffre = { code: string; label?: string; carrierCode?: string }

/**
 * Liste les codes d'offre disponibles sur le compte -- a appeler UNE FOIS les
 * cles bac a sable posees pour trouver les vrais codes Colissimo/Chronopost
 * domicile (BOXTAL_OFFER_CODE_COLISSIMO/CHRONOPOST, voir offerCodePour),
 * confirme par Hedi via le guide officiel "list-shipping-offer-code-api-v3"
 * (illisible directement par nos outils). Chemin exact DEDUIT par analogie
 * avec les autres endpoints v3.1 confirmes (shipping-order) -- a verifier a
 * la premiere vraie requete, pas garanti.
 */
export async function listerCodesOffre(): Promise<BoxtalOffre[]> {
  const content = await appelBoxtal('/v3.1/shipping-offer-code', 'GET')
  if (!Array.isArray(content)) return []
  return content.map((o) => {
    const offre = o as Record<string, unknown>
    return {
      code: String(offre.code ?? offre.offerCode ?? ''),
      label: typeof offre.label === 'string' ? offre.label : undefined,
      carrierCode: typeof offre.carrierCode === 'string' ? offre.carrierCode : undefined,
    }
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
