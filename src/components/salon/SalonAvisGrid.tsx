'use client'
import { useState } from 'react'
import { type AvisGoogle } from '@/lib/salons'

const AVATAR_COLORS = ['#1a3a5a', '#3a1a5a', '#1a5a3a', '#5a3a1a', '#3a5a1a', '#1a3a3a']
function strHash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0 } return h }
function colorFrom(s: string): string { return AVATAR_COLORS[strHash(s) % AVATAR_COLORS.length] }
function initialsFrom(s: string): string { return s.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '??' }

const INITIAL_SHOW = 6

export function SalonAvisGrid({
  avis,
  salonNom,
  googleMapsUrl,
}: {
  avis: AvisGoogle[]
  salonNom: string
  googleMapsUrl?: string
}) {
  const [showAll, setShowAll] = useState(false)

  if (!avis || avis.length === 0) return null

  const displayed = showAll ? avis : avis.slice(0, INITIAL_SHOW)
  const hasMore = avis.length > INITIAL_SHOW

  return (
    <section className="sag-section">
      <div className="sag-inner">
        <div className="sag-head">
          <div className="sag-eyebrow">— {salonNom} —</div>
          <h2 className="sag-title">CE QUE DISENT NOS CLIENTS</h2>
        </div>

        <div className="sag-grid">
          {displayed.map((a, i) => {
            const initials = initialsFrom(a.auteur)
            const color = colorFrom(a.auteur)
            const stars = '★'.repeat(Math.max(1, Math.min(5, a.etoiles)))
            return (
              <div key={i} className="sag-card">
                <div className="sag-card-top">
                  <div className="sag-av" style={{ background: color }}>{initials}</div>
                  <div className="sag-card-meta">
                    <div className="sag-name">{a.auteur}</div>
                    <div className="sag-stars">{stars}</div>
                  </div>
                  <div className="sag-g-logo" aria-hidden="true">G</div>
                </div>
                <p className="sag-text">{a.texte}</p>
                <div className="sag-footer">
                  <span className="sag-date">{a.date} · Google Maps</span>
                  <span className="sag-badge">✓ Avis Google vérifié</span>
                </div>
              </div>
            )
          })}
        </div>

        {hasMore && !showAll && (
          <div className="sag-more-wrap">
            <button className="sag-more-btn" onClick={() => setShowAll(true)}>
              Voir plus d&apos;avis ({avis.length - INITIAL_SHOW} de plus)
            </button>
          </div>
        )}

        {googleMapsUrl && (
          <div className="sag-more-wrap">
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="sag-all-link">
              Voir tous les avis sur Google →
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
