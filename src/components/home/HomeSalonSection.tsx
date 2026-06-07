'use client'
import { Fragment } from 'react'
import { MapPin, Clock, Phone } from 'lucide-react'
import { type Salon, DEFAULT_SALONS } from '@/lib/salons'
import { SalonCarousel } from '@/components/salon/SalonCarousel'
import { SalonAvisGrid } from '@/components/salon/SalonAvisGrid'

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
  google_reviews: [],
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

export function HomeSalonSection({
  salons = DEFAULT_SALONS,
}: {
  config?: SalonConfig
  salons?: Salon[]
}) {
  const activeSalons = salons.filter(s => s.actif)

  return (
    <>
      {/* En-tête de section — id="salons" pour le scroll nav */}
      <section id="salons" className="hs-salon hs-salon-intro">
        <div className="hs-salon-inner">
          <div className="hs-salons-hd">
            <div className="hs-salons-eyebrow">2 SALONS EN BRETAGNE &amp; MAYENNE</div>
            <h2 className="hs-salons-title">NOS SALONS</h2>
            <p className="hs-salons-sub">Retrouvez-nous à Fougères et Ernée</p>
          </div>
        </div>
      </section>

      {activeSalons.map((salon, i) => (
        <Fragment key={salon.slug}>
          {/* Séparateur entre salons */}
          {i > 0 && (
            <div className="hs-salon hs-salon-div">
              <div className="hs-salon-inner">
                <div className="hs-divider" aria-hidden="true">
                  <span className="hs-divider-text">NOS SALONS</span>
                </div>
              </div>
            </div>
          )}

          {/* Bloc salon — fond crème, conteneur max-width */}
          <section className="hs-salon">
            <div className="hs-salon-inner">
              <SalonBlock salon={salon} />
            </div>
          </section>

          {/* Avis — fond noir, PLEINE LARGEUR (hors conteneur max-width) */}
          {(salon.avis_google ?? []).length > 0 && (
            <SalonAvisGrid
              avis={salon.avis_google ?? []}
              salonNom={salon.nom ?? salon.ville ?? ''}
              googleMapsUrl={salon.lien_google_maps ?? undefined}
            />
          )}
        </Fragment>
      ))}
    </>
  )
}
