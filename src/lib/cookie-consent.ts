/**
 * Consentement cookies RGPD -- un seul choix binaire, car le site n'a qu'une
 * seule categorie de cookie non essentiel : la carte Google Maps embarquee
 * (iframe) sur les pages salon. Rien d'autre n'est concerne : pas de mesure
 * d'audience, le panier/la session utilisent du localStorage necessaire au
 * fonctionnement du site (exempte de consentement), et Stripe redirige vers
 * une page hebergee sur stripe.com (ses cookies sont sur son propre domaine,
 * hors de portee de ce code).
 */
export const CONSENT_KEY = 'sp_cookie_consent'
export const CONSENT_EVENT = 'sp-cookie-consent-changed'

export type Consentement = 'accepted' | 'refused' | null

export function getConsent(): Consentement {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(CONSENT_KEY)
  return v === 'accepted' || v === 'refused' ? v : null
}

export function setConsent(value: 'accepted' | 'refused') {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CONSENT_KEY, value)
  window.dispatchEvent(new Event(CONSENT_EVENT))
}

export function resetConsent() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CONSENT_KEY)
  window.dispatchEvent(new Event(CONSENT_EVENT))
}
