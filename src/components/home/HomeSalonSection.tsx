'use client'
import { MapPin, Clock, Phone, Camera } from 'lucide-react'

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

function PhotoGrid({ prefix, label }: { prefix: string; label: string }) {
  return (
    <div className="hs-photos-sec">
      <div className="hs-photos-title">LE SALON EN IMAGES</div>
      <div className="hs-photos-grid">
        {([1, 2, 3] as const).map((n) => (
          <div key={n} className="hs-photo-card">
            <img
              src={`/images/salon/${prefix}-${n}.jpg`}
              alt={`${label} — photo ${n}`}
              className="hs-photo-img"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <div className="hs-photo-ph">
              <Camera size={28} strokeWidth={1.2} />
              <span>Photo {n}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HomeSalonSection({ config = DEFAULT_SALON_CONFIG }: { config?: SalonConfig }) {
  const reviews = config.google_reviews?.length ? config.google_reviews : DEFAULT_SALON_CONFIG.google_reviews

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

          {/* ── Bloc Fougères ── */}
          <div className="hs-salon-block">
            <div className="hs-salon-eyebrow">SALON PHYSIQUE — FOUGÈRES, 35300</div>

            <div className="hs-salon-top">
              <div className="hs-salon-left">
                <h3 className="hs-salon-title">SP BARBER SHOP</h3>

                <div className="hs-salon-stars">
                  <span className="hs-salon-stars-icons">★★★★★</span>
                  <span className="hs-salon-stars-label">
                    {config.google_rating}/5 · {config.google_reviews_count} avis Google
                  </span>
                </div>

                <div className="hs-salon-meta">
                  <div className="hs-salon-meta-item">
                    <MapPin size={14} strokeWidth={1.8} />
                    <span>48 Boulevard Jean Jaurès, 35300 Fougères</span>
                  </div>
                  <div className="hs-salon-meta-item">
                    <Clock size={14} strokeWidth={1.8} />
                    <span>Lun – Sam · 9h00 – 19h00</span>
                  </div>
                  {config.phone && (
                    <div className="hs-salon-meta-item">
                      <Phone size={14} strokeWidth={1.8} />
                      <a href={`tel:${config.phone.replace(/\s/g, '')}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {config.phone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="hs-salon-actions">
                  <a
                    href="https://www.planity.com/sp-barber-shop-35300-fougeres"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hs-salon-btn-reserve"
                  >
                    RÉSERVER EN LIGNE →
                  </a>
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=48+Boulevard+Jean+Jaur%C3%A8s+35300+Foug%C3%A8res"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hs-salon-btn-route"
                  >
                    ITINÉRAIRE →
                  </a>
                </div>
              </div>

              <div className="hs-salon-right">
                <iframe
                  title="SP Barber — 48 Boulevard Jean Jaurès 35300 Fougères"
                  src="https://maps.google.com/maps?q=48+Boulevard+Jean+Jaur%C3%A8s,+35300+Foug%C3%A8res&output=embed&z=16"
                  className="hs-salon-map"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  aria-label="Carte Google Maps — SP Barber Fougères"
                />
              </div>
            </div>

            <PhotoGrid prefix="salon" label="SP Barber Fougères" />
          </div>

          {/* ── Séparateur ── */}
          <div className="hs-divider" aria-hidden="true">
            <span className="hs-divider-text">NOS SALONS</span>
          </div>

          {/* ── Bloc Ernée ── */}
          <div className="hs-salon-block">
            <div className="hs-salon-eyebrow">SALON PHYSIQUE — ERNÉE, 53500</div>

            <div className="hs-salon-top">
              <div className="hs-salon-left">
                <h3 className="hs-salon-title">SP BARBERSHOP ERNÉE</h3>

                <div className="hs-salon-meta">
                  <div className="hs-salon-meta-item">
                    <MapPin size={14} strokeWidth={1.8} />
                    <span>Ernée, 53500</span>
                  </div>
                  <div className="hs-salon-meta-item">
                    <Clock size={14} strokeWidth={1.8} />
                    <span>Horaires à venir</span>
                  </div>
                </div>

                <div className="hs-salon-actions">
                  <a
                    href="https://www.google.com/search?q=Sp+barbershop+ernee"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hs-salon-btn-route"
                  >
                    ITINÉRAIRE →
                  </a>
                </div>
              </div>

              <div className="hs-salon-right">
                <iframe
                  title="SP Barbershop Ernée — 53500"
                  src="https://maps.google.com/maps?q=SP+Barbershop+Ern%C3%A9e+53500&output=embed&z=14"
                  className="hs-salon-map"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  aria-label="Carte Google Maps — SP Barbershop Ernée"
                />
              </div>
            </div>

            <PhotoGrid prefix="ernee" label="SP Barbershop Ernée" />
          </div>

        </div>
      </section>

      {/* ── Avis Google — fond noir ── */}
      <section className="hs-google-reviews">
        <div className="hs-gr-inner">
          <div className="hs-gr-head">
            <div className="hs-gr-eyebrow">— Fougères —</div>
            <h2 className="hs-gr-title">CE QUE DISENT NOS CLIENTS GOOGLE</h2>
          </div>
          <div className="hs-gr-grid">
            {reviews.map((r, i) => (
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
    </>
  )
}
