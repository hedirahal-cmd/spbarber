import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Clock, Phone, Scissors, Star, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Salon Barbier Fougères — SP Barber | 48 Bd Jean Jaurès 35300',
  description:
    'SP Barber Shop à Fougères (35300) : salon de coiffure homme et barbier professionnel. 48 Boulevard Jean Jaurès. Ouvert lun-sam 9h-19h. Retrouvez aussi nos produits en ligne.',
  alternates: { canonical: 'https://spbarber.fr/salon' },
  keywords: [
    'barbier Fougères',
    'salon coiffure homme Fougères',
    'barber shop 35300',
    'coiffeur homme Fougères',
    'salon barbier Bretagne',
    'SP Barber Fougères',
    'coupe homme Fougères',
    'dégradé Fougères',
  ],
  openGraph: {
    title: 'SP Barber Shop Fougères — Salon Barbier Professionnel',
    description:
      'Votre barbier à Fougères (35300). 48 Boulevard Jean Jaurès. Lu-Sa 9h-19h. Coupes, dégradés, soins barbe.',
    url: 'https://spbarber.fr/salon',
    images: [{ url: 'https://spbarber.fr/og-default.jpg', width: 1200, height: 630, alt: 'SP Barber Shop Fougères' }],
  },
}

const LOCAL_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'HairSalon', 'BarberShop'],
  name: 'SP Barber',
  description:
    'Salon de coiffure barbier professionnel à Fougères. Spécialiste des coupes homme, dégradés fade et soins barbe. Produits capillaires premium disponibles en salon et en ligne.',
  url: 'https://spbarber.fr/salon',
  telephone: '',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '48 Boulevard Jean Jaurès',
    addressLocality: 'Fougères',
    postalCode: '35300',
    addressCountry: 'FR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 48.3522,
    longitude: -1.2038,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '19:00',
    },
  ],
  priceRange: '€€',
  hasMap: 'https://maps.google.com/?q=48+Boulevard+Jean+Jaurès,+35300+Fougères',
  image: 'https://spbarber.fr/og-default.jpg',
  sameAs: [],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '87',
    bestRating: '5',
  },
}

const SERVICES = [
  { name: 'Coupe Homme Classique', price: 'dès 20€', desc: 'Coupe traditionnelle ciseau ou tondeuse, finitions rasoir.' },
  { name: 'Dégradé Fade', price: 'dès 25€', desc: 'Skin fade, low fade, mid fade — précision pro garantie.' },
  { name: 'Taille de Barbe', price: 'dès 15€', desc: 'Mise en forme, taille et entretien de votre barbe.' },
  { name: 'Coupe + Barbe', price: 'dès 35€', desc: 'Pack complet coupe et barbe, le meilleur rapport qualité/prix.' },
  { name: 'Rasage Traditionnel', price: 'dès 20€', desc: 'Rasage au coupe-choux avec serviettes chaudes et baumes nourrissants.' },
  { name: 'Coloration Homme', price: 'sur devis', desc: 'Coloration naturelle, camouflage cheveux blancs, traitement colorant.' },
]

export default function SalonPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_SCHEMA) }}
      />

      <div className="salon-page">

        {/* ── HERO LOCAL ── */}
        <section className="salon-hero">
          <div className="salon-hero-inner">
            <div className="salon-hero-ey">Barbier Fougères — Bretagne</div>
            <h1 className="salon-hero-title">SP BARBER SHOP</h1>
            <p className="salon-hero-sub">
              Votre salon de coiffure barbier professionnel au coeur de Fougères.<br />
              Coupes homme, dégradés fade, soins barbe — depuis 2018.
            </p>
            <div className="salon-hero-badges">
              <div className="salon-badge">
                <Star size={14} strokeWidth={2} />
                <span>4,9/5 · 87 avis Google</span>
              </div>
              <div className="salon-badge">
                <MapPin size={14} strokeWidth={2} />
                <span>Fougères, 35300</span>
              </div>
              <div className="salon-badge">
                <Clock size={14} strokeWidth={2} />
                <span>Lun – Sam 9h – 19h</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── INFOS PRATIQUES ── */}
        <section className="salon-infos">
          <div className="salon-infos-inner">

            <div className="salon-info-card">
              <div className="salon-info-icon"><MapPin size={24} strokeWidth={1.5} /></div>
              <h2 className="salon-info-ttl">Adresse</h2>
              <p className="salon-info-txt">
                48 Boulevard Jean Jaurès<br />
                35300 Fougères, France
              </p>
              <a
                href="https://maps.google.com/?q=48+Boulevard+Jean+Jaurès,+35300+Fougères"
                target="_blank"
                rel="noopener noreferrer"
                className="salon-info-link"
              >
                Voir sur Google Maps →
              </a>
            </div>

            <div className="salon-info-card">
              <div className="salon-info-icon"><Clock size={24} strokeWidth={1.5} /></div>
              <h2 className="salon-info-ttl">Horaires</h2>
              <div className="salon-hours">
                <div className="salon-hour-row">
                  <span>Lundi – Samedi</span>
                  <span className="salon-hour-val">9h00 – 19h00</span>
                </div>
                <div className="salon-hour-row salon-hour-closed">
                  <span>Dimanche</span>
                  <span>Fermé</span>
                </div>
              </div>
            </div>

            <div className="salon-info-card">
              <div className="salon-info-icon"><Scissors size={24} strokeWidth={1.5} /></div>
              <h2 className="salon-info-ttl">Réservation</h2>
              <p className="salon-info-txt">
                Venez directement au salon ou contactez-nous par e-mail pour un rendez-vous.
              </p>
              <a href="mailto:contact@spbarber.fr" className="salon-info-link">
                contact@spbarber.fr →
              </a>
            </div>

          </div>
        </section>

        {/* ── GOOGLE MAPS EMBED ── */}
        <section className="salon-map-sec">
          <iframe
            title="SP Barber — 48 Boulevard Jean Jaurès 35300 Fougères"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2672.0!2d-1.2038!3d48.3522!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s48+Bd+Jean+Jaurès%2C+35300+Fougères!5e0!3m2!1sfr!2sfr!4v1"
            className="salon-map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            aria-label="Carte Google Maps — SP Barber Fougères"
          />
        </section>

        {/* ── PRESTATIONS ── */}
        <section className="salon-services">
          <div className="salon-services-inner">
            <div className="salon-sec-ey">— Ce que nous proposons —</div>
            <h2 className="salon-sec-title">NOS PRESTATIONS</h2>
            <p className="salon-sec-sub">
              Coiffeur homme et barbier professionnel à Fougères — des prestations soignées pour chaque type de coupe et de barbe.
            </p>
            <div className="salon-services-grid">
              {SERVICES.map((s) => (
                <div key={s.name} className="salon-service-card">
                  <div className="salon-service-top">
                    <div className="salon-service-name">{s.name}</div>
                    <div className="salon-service-price">{s.price}</div>
                  </div>
                  <p className="salon-service-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUITS SALON → BOUTIQUE ── */}
        <section className="salon-products-sec">
          <div className="salon-products-inner">
            <div className="salon-sec-ey">— Emportez le salon chez vous —</div>
            <h2 className="salon-sec-title">NOS PRODUITS EN LIGNE</h2>
            <p className="salon-sec-sub">
              Les mêmes produits que nos barbiers Fougères utilisent en salon, disponibles en livraison 48h partout en France.
            </p>
            <Link href="/products" className="salon-shop-cta">
              Voir tous les produits <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        </section>

        {/* ── SEO LOCAL — texte long tail ── */}
        <section className="salon-local-seo">
          <div className="salon-local-inner">
            <h2>Barbier à Fougères — Votre Salon SP Barber</h2>
            <p>
              Situé au 48 Boulevard Jean Jaurès à Fougères (Ille-et-Vilaine, 35300),{' '}
              <strong>SP Barber</strong> est le salon de coiffure homme et barbier professionnel
              de référence en Bretagne. Notre équipe de barbiers qualifiés vous accueille du{' '}
              <strong>lundi au samedi de 9h à 19h</strong> pour des coupes homme soignées,
              des dégradés fade précis et des soins barbe professionnels.
            </p>
            <p>
              Spécialiste de la <strong>coupe homme Fougères</strong> et du{' '}
              <strong>dégradé fade</strong>, nous utilisons des techniques et des produits
              professionnels pour garantir un résultat impeccable à chaque visite. Nos{' '}
              <strong>produits barbier Bretagne</strong> sont également disponibles dans notre
              boutique en ligne pour entretenir votre style entre deux coupes.
            </p>
            <p>
              Que vous cherchiez un <strong>coiffeur homme Fougères</strong>, un{' '}
              <strong>barber shop 35300</strong>, ou les meilleurs produits capillaires homme
              livrés directement chez vous, SP Barber est votre référence en Ille-et-Vilaine.
            </p>
          </div>
        </section>

        <div className="salon-back">
          <Link href="/">← Retour à l&apos;accueil</Link>
          <span>·</span>
          <Link href="/products">Voir la boutique</Link>
        </div>
      </div>
    </>
  )
}
