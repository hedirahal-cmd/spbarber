'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getConsent, setConsent, CONSENT_EVENT } from '@/lib/cookie-consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const verifier = () => setVisible(getConsent() === null)
    verifier()
    window.addEventListener(CONSENT_EVENT, verifier)
    return () => window.removeEventListener(CONSENT_EVENT, verifier)
  }, [])

  if (!visible) return null

  return (
    <div className="cookie-banner" role="dialog" aria-label="Consentement cookies" aria-live="polite">
      <p className="cookie-banner-txt">
        Ce site utilise uniquement des cookies strictement nécessaires (panier, session) et une carte
        Google Maps sur les pages salons, qui dépose des cookies tiers si vous l&apos;affichez. Vous
        pouvez l&apos;accepter ou la refuser — le reste du site fonctionne dans tous les cas.{' '}
        <Link href="/politique-confidentialite">En savoir plus</Link>.
      </p>
      <div className="cookie-banner-actions">
        <button type="button" className="cookie-banner-btn cookie-banner-btn--refuse" onClick={() => setConsent('refused')}>
          Refuser
        </button>
        <button type="button" className="cookie-banner-btn cookie-banner-btn--accept" onClick={() => setConsent('accepted')}>
          Accepter
        </button>
      </div>
    </div>
  )
}
