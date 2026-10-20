'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getConsent, setConsent, CONSENT_EVENT } from '@/lib/cookie-consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [personnaliser, setPersonnaliser] = useState(false)
  // Un seul interrupteur reel aujourd'hui (voir lib/cookie-consent.ts : le
  // site n'a qu'UNE categorie de cookie non essentiel, la carte Google Maps).
  // "Personnaliser" rend ce choix explicite plutot que binaire implicite --
  // pas une fausse liste de categories inventees pour faire plus complet.
  const [carteActivee, setCarteActivee] = useState(false)

  useEffect(() => {
    const verifier = () => setVisible(getConsent() === null)
    verifier()
    window.addEventListener(CONSENT_EVENT, verifier)
    return () => window.removeEventListener(CONSENT_EVENT, verifier)
  }, [])

  if (!visible) return null

  function accepterTout() {
    setConsent('accepted')
  }
  function refuserTout() {
    setConsent('refused')
  }
  function enregistrerChoix() {
    setConsent(carteActivee ? 'accepted' : 'refused')
  }

  return (
    <div className="cookie-banner" role="dialog" aria-label="Consentement cookies" aria-live="polite">
      {!personnaliser ? (
        <>
          <p className="cookie-banner-txt">
            Ce site utilise uniquement des cookies strictement nécessaires (panier, session) et une carte
            Google Maps sur les pages salons, qui dépose des cookies tiers si vous l&apos;affichez. Vous
            pouvez l&apos;accepter ou la refuser — le reste du site fonctionne dans tous les cas.{' '}
            <Link href="/politique-confidentialite">En savoir plus</Link>.
          </p>
          <div className="cookie-banner-actions">
            <button type="button" className="cookie-banner-btn cookie-banner-btn--refuse" onClick={refuserTout}>
              Refuser
            </button>
            <button
              type="button"
              className="cookie-banner-btn cookie-banner-btn--personnaliser"
              onClick={() => setPersonnaliser(true)}
            >
              Personnaliser
            </button>
            <button type="button" className="cookie-banner-btn cookie-banner-btn--accept" onClick={accepterTout}>
              Accepter
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="cookie-banner-txt">
            Choisissez les cookies que vous autorisez. Les cookies strictement nécessaires (panier, session)
            sont toujours actifs : ils ne déposent rien hors de ce site et n&apos;ont pas besoin de
            consentement.
          </p>
          <div className="cookie-banner-option">
            <div className="cookie-banner-option-txt">
              <strong>Strictement nécessaires</strong>
              <span>Panier et session — toujours actifs</span>
            </div>
            <span className="cookie-banner-option-locked">Toujours actif</span>
          </div>
          <div className="cookie-banner-option">
            <div className="cookie-banner-option-txt">
              <strong>Carte Google Maps</strong>
              <span>Affichage de la carte sur les pages salons (cookies tiers Google)</span>
            </div>
            <label className="cookie-banner-toggle">
              <input
                type="checkbox"
                checked={carteActivee}
                onChange={(e) => setCarteActivee(e.target.checked)}
              />
              <span className="cookie-banner-toggle-slider" aria-hidden="true" />
            </label>
          </div>
          <div className="cookie-banner-actions">
            <button type="button" className="cookie-banner-btn cookie-banner-btn--refuse" onClick={() => setPersonnaliser(false)}>
              Retour
            </button>
            <button type="button" className="cookie-banner-btn cookie-banner-btn--accept" onClick={enregistrerChoix}>
              Enregistrer mes choix
            </button>
          </div>
        </>
      )}
    </div>
  )
}
