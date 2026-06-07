'use client'
import { MapPin, Clock, Phone } from 'lucide-react'
import { type Salon, DEFAULT_SALONS } from '@/lib/salons'
import { SalonCarousel } from '@/components/salon/SalonCarousel'

export type { Salon }
export { DEFAULT_SALONS }

export interface GoogleReview {
  text: string
  name: string
  initials: string
  color: string
  date: string
}

export interface SalonConfig {
  phone: string
  google_rating: string
  google_reviews_count: number
  google_reviews_url: string
  google_reviews: GoogleReview[]
}

export const DEFAULT_SALON_CONFIG: SalonConfig = {
  phone: '',
  google_rating: '4,9',
  google_reviews_count: 47,
  google_reviews_url: 'https://www.google.com/maps/search/SP+Barber+Foug%C3%A8res',
  google_reviews: [
    { text: "Meilleur barbier de Fougères. Je reviens depuis 3 ans, toujours impeccable. L'équipe est pro et l'ambiance est top.", name: 'Thomas G.', initials: 'TG', color: '#1a3a5a', date: 'Il y a 2 semaines' },
    { text: "Ambiance au top, équipe vraiment professionnelle. Mon dégradé est parfait à chaque visite. Je recommande à 100%.", name: 'Mohamed A.', initials: 'MA', color: '#3a1a5a', date: 'Il y a 1 mois' },
    { text: "Réservation facile sur Planity, aucune attente, résultat impeccable. Le meilleur salon de la région.", name: 'Pierre L.', initials: 'PL', color: '#1a5a3a', date: 'Il y a 3 semaines' },
  ],
}

function buildEmbedUrl(salon: Salon): string {
  const parts = salon.adresse
    ? [salon.adresse, salon.code_postal, salon.ville]
    : [salon.nom, salon.ville, salon.code_postal]
  const q = parts.filter(Boolean).join(' ')
  const z = salon.adresse ? 16 : 14
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed&z=${z}`
}

function SalonBlock({ salon }: { salon: Salon }) {
  const embedSrc = buildEmbedUrl(salon)
  const villeLabel = [salon.ville, salon.code_postal].filter(Boolean).join(', ')
  const hasRating = !!(salon.note_google && salon.nombre_avis)

  return (
    <div className="hs-salon-block">
      <div className="hs-salon-eyebrow">
        SALON PHYSIQUE — {salon.ville?.toUpperCase()}{salon.code_postal ? `, ${salon.code_postal}` : ''}
      </div>

      <div className="hs-salon-top">
        <div className="hs-salon-left">
          <h3 className="hs-salon-title">{salon.nom}</h3>

          {hasRating && (
            <div className="hs-salon-stars">
              <span className="hs-salon-stars-icons">★★★★★</span>
              <span className="hs-salon-stars-label">
                {salon.note_google}/5 · {salon.nombre_avis} avis Google
              </span>
            </div>
          )}

          <div className="hs-salon-meta">
            {(salon.adresse || salon.ville) && (
              <div className="hs-salon-meta-item">
                <MapPin size={14} strokeWidth={1.8} />
                <span>{[salon.adresse, salon.code_postal, salon.ville].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {salon.horaires && (
              <div className="hs-salon-meta-item">
                <Clock size={14} strokeWidth={1.8} />
                <span>{salon.horaires}</span>
              </div>
            )}
            {salon.telephone && (
              <div className="hs-salon-meta-item">
                <Phone size={14} strokeWidth={1.8} />
                <a href={`tel:${salon.telephone.replace(/\s/g, '')}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {salon.telephone}
                </a>
              </div>
            )}
          </div>

          <div className="hs-salon-actions">
            {salon.lien_planity && (
              <a href={salon.lien_planity} target="_blank" rel="noopener noreferrer" className="hs-salon-btn-reserve">
                RÉSERVER EN LIGNE →
              </a>
            )}
            {salon.lien_google_maps && (
              <a href={salon.lien_google_maps} target="_blank" rel="noopener noreferrer" className="hs-salon-btn-route">
                ITINÉRAIRE →
              </a>
            )}
          </div>
        </div>

        <div className="hs-salon-right">
          <iframe
            title={`${salon.nom} — ${villeLabel}`}
            src={embedSrc}
            className="hs-salon-map"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            aria-label={`Carte Google Maps — ${salon.nom}`}
          />
        </div>
      </div>

      <div className="hs-photos-sec">
        <div className="hs-photos-title">LE SALON EN IMAGES</div>
        <SalonCarousel photos={salon.photos ?? []} label={salon.nom ?? ''} />
      </div>
    </div>
  )
}

const AVATAR_COLORS_AV = ['#1a3a5a', '#3a1a5a', '#1a5a3a', '#5a3a1a', '#3a5a1a', '#1a3a3a']
function strHashAv(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0 } return h }
function colorFromAuteur(s: string): string { return AVATAR_COLORS_AV[strHashAv(s) % AVATAR_COLORS_AV.length] }
function initialsFromAuteur(s: string): string { return s.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '??' }

export function HomeSalonSection({
  config = DEFAULT_SALON_CONFIG,
  salons = DEFAULT_SALONS,
}: {
  config?: SalonConfig
  salons?: Salon[]
}) {
  const activeSalons = salons.filter(s => s.actif)
  const fougeres = salons.find(s => s.slug === 'fougeres')
  const avisDb = fougeres?.avis_google ?? []
  const hasAvisDb = avisDb.length > 0

  const reviewsToShow: GoogleReview[] = hasAvisDb
    ? avisDb.map(a => ({
        text: a.texte,
        name: a.auteur,
        initials: initialsFromAuteur(a.auteur),
        color: colorFromAuteur(a.auteur),
        date: a.date,
      }))
    : (config.google_reviews?.length ? config.google_reviews : DEFAULT_SALON_CONFIG.google_reviews)

  const showAvisSection = hasAvisDb || (config.google_reviews?.length > 0)

  return (
    <>
      {/* ── Section principale — fond crème ── */}
      <section id="salon" className="hs-salon">
        <div className="hs-salon-inner">

          {/* En-tête de section */}
          <div className="hs-salons-hd">
            <div className="hs-salons-eyebrow">2 SALONS EN BRETAGNE &amp; MAYENNE</div>
            <h2 className="hs-salons-title">NOS SALONS</h2>
            <p className="hs-salons-sub">Retrouvez-nous à Fougères et Ernée</p>
          </div>

          {activeSalons.map((salon, i) => (
            <div key={salon.slug}>
              {i > 0 && (
                <div className="hs-divider" aria-hidden="true">
                  <span className="hs-divider-text">NOS SALONS</span>
                </div>
              )}
              <SalonBlock salon={salon} />
            </div>
          ))}

        </div>
      </section>

      {/* ── Avis Google — fond noir ── masqué si aucun avis */}
      {showAvisSection && (
        <section className="hs-google-reviews">
          <div className="hs-gr-inner">
            <div className="hs-gr-head">
              <div className="hs-gr-eyebrow">— Fougères —</div>
              <h2 className="hs-gr-title">CE QUE DISENT NOS CLIENTS GOOGLE</h2>
            </div>
            <div className="hs-gr-grid">
              {reviewsToShow.map((r, i) => (
                <div key={i} className="hs-gr-card">
                  <div className="hs-gr-card-top">
                    <div className="hs-gr-av" style={{ background: r.color }}>{r.initials}</div>
                    <div>
                      <div className="hs-gr-name">{r.name}</div>
                      <div className="hs-gr-stars">★★★★★</div>
                    </div>
                    <div className="hs-gr-google-logo">G</div>
                  </div>
                  <p className="hs-gr-text">{r.text}</p>
                  <div className="hs-gr-date">{r.date} · Google Maps</div>
                </div>
              ))}
            </div>
            <a
              href={config.google_reviews_url || DEFAULT_SALON_CONFIG.google_reviews_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hs-gr-link"
            >
              Voir tous les avis sur Google →
            </a>
          </div>
        </section>
      )}
    </>
  )
}
