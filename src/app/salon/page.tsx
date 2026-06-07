import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Clock, Phone, Scissors, Star, ArrowRight } from 'lucide-react'
import { SalonPhotoGrid } from '@/components/salon/SalonPhotoGrid'
import { supabase } from '@/lib/supabase'
import { DEFAULT_SALONS, type Salon } from '@/lib/salons'

async function getSalons(): Promise<Salon[]> {
  try {
    const { data } = await supabase.from('salons').select('*').order('slug')
    if (data && data.length > 0) return data as Salon[]
  } catch {}
  return DEFAULT_SALONS
}

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

export default async function SalonPage() {
  const salons = await getSalons()
  const fougeres = salons.find(s => s.slug === 'fougeres') ?? DEFAULT_SALONS[0]
  const ernee = salons.find(s => s.slug === 'ernee') ?? DEFAULT_SALONS[1]

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
                  <span className="salon-hour-val">{fougeres.horaires || '9h00 – 19h00'}</span>
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
                Réservez en ligne 24h/24 ou passez directement au salon.
              </p>
              <a
                href="https://www.planity.com/sp-barber-shop-35300-fougeres"
                target="_blank"
                rel="noopener noreferrer"
                className="salon-info-link"
              >
                Réserver sur Planity →
              </a>
            </div>

          </div>
        </section>

        {/* ── GOOGLE MAPS EMBED ── */}
        <section className="salon-map-sec">
          <iframe
            title="SP Barber — 48 Boulevard Jean Jaurès 35300 Fougères"
            src="https://maps.google.com/maps?q=48+Boulevard+Jean+Jaur%C3%A8s,+35300+Foug%C3%A8res&output=embed&z=16"
            className="salon-map"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            aria-label="Carte Google Maps — SP Barber Fougères"
          />
        </section>

        {/* ── BOUTONS D'ACTION ── */}
        <div className="salon-map-actions">
          <a
            href="https://www.planity.com/sp-barber-shop-35300-fougeres"
            target="_blank"
            rel="noopener noreferrer"
            className="salon-btn-reserve"
          >
            Réserver en ligne →
          </a>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=48+Boulevard+Jean+Jaur%C3%A8s,+35300+Foug%C3%A8res"
            target="_blank"
            rel="noopener noreferrer"
            className="salon-btn-route"
          >
            Itinéraire →
          </a>
        </div>

        {/* ── PHOTOS DU SALON ── */}
        <section className="salon-photos-sec">
          <div className="salon-photos-inner">
            <div className="salon-sec-ey">— L&apos;ambiance en images —</div>
            <h2 className="salon-sec-title">LE SALON</h2>
            <SalonPhotoGrid />
          </div>
        </section>

        {/* ── DEUXIÈME SALON — ERNÉE ── */}
        <section className="salon-ernee-sec">
          <div className="salon-ernee-inner">
            <div className="salon-sec-ey">— Deuxième adresse —</div>
            <h2 className="salon-sec-title">SP BARBERSHOP ERNÉE</h2>
            <p className="salon-sec-sub">
              Retrouvez-nous également à Ernée (Mayenne, 53500) pour les mêmes prestations barbier premium.
            </p>

            <div className="salon-ernee-top">
              <div className="salon-ernee-info">
                <div className="salon-info-card">
                  <div className="salon-info-icon"><MapPin size={24} strokeWidth={1.5} /></div>
                  <h3 className="salon-info-ttl">Adresse</h3>
                  <p className="salon-info-txt">
                    {ernee.adresse && <>{ernee.adresse}<br /></>}
                    {ernee.code_postal} {ernee.ville}, France
                  </p>
                  {ernee.lien_google_maps && (
                    <a href={ernee.lien_google_maps} target="_blank" rel="noopener noreferrer" className="salon-info-link">
                      Voir sur Google Maps →
                    </a>
                  )}
                </div>
                {(ernee.telephone || ernee.horaires) && (
                  <div className="salon-info-card">
                    <div className="salon-info-icon"><Clock size={24} strokeWidth={1.5} /></div>
                    <h3 className="salon-info-ttl">Horaires</h3>
                    <div className="salon-hours">
                      <div className="salon-hour-row">
                        <span>Horaires</span>
                        <span className="salon-hour-val">{ernee.horaires || 'À venir'}</span>
                      </div>
                    </div>
                    {ernee.telephone && (
                      <a href={`tel:${ernee.telephone.replace(/\s/g, '')}`} className="salon-info-link" style={{ marginTop: 8, display: 'inline-block' }}>
                        <Phone size={13} strokeWidth={1.8} style={{ display: 'inline', marginRight: 4 }} />
                        {ernee.telephone}
                      </a>
                    )}
                  </div>
                )}
                {(!ernee.telephone && !ernee.horaires) && (
                  <div className="salon-info-card">
                    <div className="salon-info-icon"><Clock size={24} strokeWidth={1.5} /></div>
                    <h3 className="salon-info-ttl">Horaires</h3>
                    <div className="salon-hours">
                      <div className="salon-hour-row"><span>Horaires</span><span className="salon-hour-val">À venir</span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="salon-ernee-map">
                <iframe
                  title="SP Barbershop Ernée — 53500 Mayenne"
                  src="https://maps.google.com/maps?q=SP+Barbershop+Ern%C3%A9e+53500&output=embed&z=14"
                  className="salon-map"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  aria-label="Carte Google Maps — SP Barbershop Ernée"
                />
              </div>
            </div>

            {(ernee.lien_planity || ernee.lien_google_maps) && (
              <div className="salon-map-actions">
                {ernee.lien_planity && (
                  <a href={ernee.lien_planity} target="_blank" rel="noopener noreferrer" className="salon-btn-reserve">
                    Réserver en ligne →
                  </a>
                )}
                {ernee.lien_google_maps && (
                  <a href={ernee.lien_google_maps} target="_blank" rel="noopener noreferrer" className="salon-btn-route">
                    Itinéraire →
                  </a>
                )}
              </div>
            )}
          </div>
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
