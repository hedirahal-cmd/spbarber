'use client'
import { MapPin, Clock, Phone, Camera } from 'lucide-react'

// Remplacer par de vrais avis Google copiés-collés depuis la fiche GMB
const GOOGLE_REVIEWS = [
  {
    text: `"Meilleur barbier de Fougères. Je reviens depuis 3 ans, toujours impeccable. L'équipe est pro et l'ambiance est top."`,
    name: 'Thomas G.',
    initials: 'TG',
    color: '#1a3a5a',
    date: 'Il y a 2 semaines',
  },
  {
    text: `"Ambiance au top, équipe vraiment professionnelle. Mon dégradé est parfait à chaque visite. Je recommande à 100%."`,
    name: 'Mohamed A.',
    initials: 'MA',
    color: '#3a1a5a',
    date: 'Il y a 1 mois',
  },
  {
    text: `"Réservation facile sur Planity, aucune attente, résultat impeccable. Le meilleur salon de la région."`,
    name: 'Pierre L.',
    initials: 'PL',
    color: '#1a5a3a',
    date: 'Il y a 3 semaines',
  },
]

export function HomeSalonSection() {
  return (
    <>
      {/* ── Section principale — fond crème ── */}
      <section id="salon" className="hs-salon">
        <div className="hs-salon-inner">

          {/* Ligne du haut — 2 colonnes */}
          <div className="hs-salon-top">

            {/* Colonne gauche — infos */}
            <div className="hs-salon-left">
              <div className="hs-salon-eyebrow">SALON PHYSIQUE — FOUGÈRES</div>
              <h2 className="hs-salon-title">SP BARBER SHOP</h2>

              <div className="hs-salon-stars">
                <span className="hs-salon-stars-icons">★★★★★</span>
                <span className="hs-salon-stars-label">4,9/5 · 47 avis Google</span>
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
                <div className="hs-salon-meta-item">
                  <Phone size={14} strokeWidth={1.8} />
                  <span>À compléter</span>
                </div>
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

            {/* Colonne droite — Google Maps */}
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

          {/* Ligne du bas — Photos du salon */}
          <div className="hs-photos-sec">
            <div className="hs-photos-title">LE SALON EN IMAGES</div>
            <div className="hs-photos-grid">
              {(['salon-1.jpg', 'salon-2.jpg', 'salon-3.jpg'] as const).map((file, i) => (
                <div key={file} className="hs-photo-card">
                  <img
                    src={`/images/salon/${file}`}
                    alt={`SP Barber Fougères — photo ${i + 1}`}
                    className="hs-photo-img"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="hs-photo-ph">
                    <Camera size={28} strokeWidth={1.2} />
                    <span>Photo {i + 1}</span>
                  </div>
                </div>
              ))}
            </div>
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
            {GOOGLE_REVIEWS.map((r, i) => (
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
            href="https://www.google.com/maps/search/SP+Barber+Foug%C3%A8res"
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
