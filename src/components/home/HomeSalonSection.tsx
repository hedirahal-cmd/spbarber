'use client'
import { Fragment } from 'react'
import Link from 'next/link'
import { MapPin, Clock, Phone } from 'lucide-react'
import { type Salon, DEFAULT_SALONS, buildEmbedUrl } from '@/lib/salons'
import { SalonCarousel } from '@/components/salon/SalonCarousel'
import { SalonAvisGrid } from '@/components/salon/SalonAvisGrid'

export type { Salon }
export { DEFAULT_SALONS }

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
          <Link href={`/salon/${salon.slug}`} className="hs-salon-title-link">
            <h3 className="hs-salon-title">{salon.nom}</h3>
          </Link>

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
            <Link href={`/salon/${salon.slug}`} className="hs-salon-btn-route">
              EN SAVOIR PLUS →
            </Link>
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

function joinVilles(villes: string[]): string {
  const noms = villes.filter(Boolean)
  if (noms.length === 0) return ''
  if (noms.length === 1) return noms[0]
  return noms.slice(0, -1).join(', ') + ' et ' + noms[noms.length - 1]
}

export function HomeSalonSection({
  salons = DEFAULT_SALONS,
}: {
  salons?: Salon[]
}) {
  const activeSalons = salons.filter(s => s.actif)
  const n = activeSalons.length
  const villesLabel = joinVilles(activeSalons.map(s => s.ville ?? '').filter(Boolean))

  return (
    <>
      {/* En-tête de section — id="salons" pour le scroll nav */}
      <section id="salons" className="hs-salon hs-salon-intro">
        <div className="hs-salon-inner">
          <div className="hs-salons-hd">
            <div className="hs-salons-eyebrow">{n} SALON{n > 1 ? 'S' : ''} SP BARBER</div>
            <h2 className="hs-salons-title">NOS SALONS</h2>
            {villesLabel && <p className="hs-salons-sub">Retrouvez-nous à {villesLabel}</p>}
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
