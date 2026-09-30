'use client'
import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { getConsent, setConsent, CONSENT_EVENT } from '@/lib/cookie-consent'

/**
 * L'iframe Google Maps depose des cookies tiers (google.com) des son
 * chargement -- elle n'est donc affichee qu'avec le consentement (bandeau
 * CookieConsent, ou clic direct sur "Afficher la carte" ici, qui vaut
 * acceptation pour cette seule categorie).
 */
export function GoogleMapEmbed({ src, title, className, routeHref }: { src: string; title: string; className: string; routeHref?: string | null }) {
  const [accepte, setAccepte] = useState(false)

  useEffect(() => {
    const lire = () => setAccepte(getConsent() === 'accepted')
    lire()
    window.addEventListener(CONSENT_EVENT, lire)
    return () => window.removeEventListener(CONSENT_EVENT, lire)
  }, [])

  if (accepte) {
    return (
      <iframe
        title={title}
        src={src}
        className={className}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        aria-label={title}
      />
    )
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: 'var(--g)', border: '1px solid var(--gm)', textAlign: 'center', padding: 16,
      }}
    >
      <MapPin size={22} strokeWidth={1.5} style={{ opacity: 0.5 }} />
      <p style={{ fontSize: 12, color: 'var(--gt)', margin: 0, maxWidth: 240 }}>
        Carte masquée tant que les cookies Google Maps ne sont pas acceptés.
      </p>
      <button
        type="button"
        onClick={() => setConsent('accepted')}
        style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 16px', border: '1px solid var(--gold)', color: 'var(--gold)', background: 'none', cursor: 'pointer', fontFamily: 'var(--fb)' }}
      >
        Afficher la carte
      </button>
      {routeHref && (
        <a href={routeHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--gt)', textDecoration: 'underline' }}>
          Ouvrir dans Google Maps →
        </a>
      )}
    </div>
  )
}
