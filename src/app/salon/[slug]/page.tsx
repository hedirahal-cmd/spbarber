export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Clock, Phone, Scissors, Star, ArrowRight } from 'lucide-react'
import { SalonCarousel } from '@/components/salon/SalonCarousel'
import { SalonAvisGrid } from '@/components/salon/SalonAvisGrid'
import { GoogleMapEmbed } from '@/components/GoogleMapEmbed'
import { DELAI_EXPEDITION_FRAGMENT, TRANSIT_TEXTE_COMPACT } from '@/lib/delais'
import { supabase } from '@/lib/supabase'
import { type Salon, DEFAULT_SALONS, buildEmbedUrl, deVille } from '@/lib/salons'
import { schemaSalon, jsonLd } from '@/lib/schema'

const BASE = 'https://spbarber.fr'

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * Un seul point de lecture reutilise par generateMetadata et le composant de
 * page ci-dessous -- contrairement a products/[slug]/page.tsx (deux requetes
 * separees, un ecart preexistant hors perimetre), ce fichier est nouveau et n'a
 * pas cette contrainte a reproduire.
 */
async function getSalon(slug: string): Promise<Salon | null> {
  try {
    const { data } = await supabase.from('salons').select('*').eq('slug', slug).maybeSingle()
    if (data) return data as Salon
  } catch {}
  // Secours pour les deux salons historiques si la base est injoignable --
  // memes valeurs par defaut que partout ailleurs sur le site.
  return DEFAULT_SALONS.find((s) => s.slug === slug) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const salon = await getSalon(slug)
  if (!salon || !salon.actif) return {}

  const villeLabel = salon.ville ?? ''
  // "SP Barber {Ville}" explicite en debut de <title> (objectif SEO, demande
  // Hedi 2026-11-18) -- {absolute} pour eviter le doublon "SP Barber" qu
  // ajouterait sinon le title.template du layout racine ('%s | SP Barber').
  // Si seo_title est renseigne en base, comportement inchange (passe par le
  // template) : a Hedi d'y inclure "SP Barber" lui-meme s'il le souhaite.
  const titreRepli = `SP Barber ${villeLabel} — Salon Barbier${salon.code_postal ? ` (${salon.code_postal})` : ''}`
  const title: Metadata['title'] = salon.seo_title || { absolute: titreRepli }
  const titrePourOg = salon.seo_title || titreRepli
  const description = salon.seo_description ||
    `SP Barber ${villeLabel}${salon.code_postal ? ` (${salon.code_postal})` : ''} : salon de coiffure homme et barbier professionnel.${salon.adresse ? ` ${salon.adresse}.` : ''}${salon.horaires ? ` Ouvert ${salon.horaires}.` : ''} Retrouvez aussi nos produits en ligne.`
  const url = `${BASE}/salon/${salon.slug}`
  const image = salon.photos?.[0]?.startsWith('http') ? salon.photos[0] : `${BASE}/og-default.jpg`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: titrePourOg,
      description,
      url,
      images: [{ url: image, width: 1200, height: 630, alt: `${salon.nom ?? 'SP Barber'} — ${villeLabel}` }],
    },
  }
}

const SERVICES = [
  { name: 'Coupe Homme Classique', price: 'dès 20€', desc: 'Coupe traditionnelle ciseau ou tondeuse, finitions rasoir.' },
  { name: 'Dégradé Fade', price: 'dès 25€', desc: 'Skin fade, low fade, mid fade — précision pro garantie.' },
  { name: 'Taille de Barbe', price: 'dès 15€', desc: 'Mise en forme, taille et entretien de votre barbe.' },
  { name: 'Coupe + Barbe', price: 'dès 35€', desc: 'Pack complet coupe et barbe, le meilleur rapport qualité/prix.' },
  { name: 'Rasage Traditionnel', price: 'dès 20€', desc: 'Rasage au coupe-choux avec serviettes chaudes et baumes nourrissants.' },
  { name: 'Coloration Homme', price: 'sur devis', desc: 'Coloration naturelle, camouflage cheveux blancs, traitement colorant.' },
]

export default async function SalonDetailPage({ params }: Props) {
  const { slug } = await params
  const salon = await getSalon(slug)
  if (!salon || !salon.actif) notFound()

  const villeLabel = [salon.ville, salon.code_postal].filter(Boolean).join(', ')
  const hasRating = !!(salon.note_google && salon.nombre_avis)
  const embedSrc = buildEmbedUrl(salon)
  const localSchema = schemaSalon(salon)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(localSchema) }} />

      <div className="salon-page">

        {/* ── HERO LOCAL ── */}
        <section className="salon-hero">
          <div className="salon-hero-inner">
            <div className="salon-hero-ey">Barbier {salon.ville} {salon.code_postal ? `— ${salon.code_postal}` : ''}</div>
            {/* "SP BARBER {VILLE}" explicite (objectif SEO, demande Hedi
                2026-11-18) -- salon.nom ("SP Barber Shop", "SP Barbershop
                Ernée"...) reste affiche juste en-dessous, rien n'est perdu. */}
            <h1 className="salon-hero-title">{`SP BARBER ${(salon.ville ?? '').toUpperCase()}`.trim()}</h1>
            {salon.nom && <p className="salon-hero-nom">{salon.nom}</p>}
            <p className="salon-hero-sub">
              {salon.description || `Votre salon de coiffure barbier professionnel au cœur ${deVille(salon.ville)}. Coupes homme, dégradés fade, soins barbe.`}
            </p>
            <div className="salon-hero-badges">
              {hasRating && (
                <div className="salon-badge">
                  <Star size={14} strokeWidth={2} />
                  <span>{salon.note_google}/5 · {salon.nombre_avis} avis Google</span>
                </div>
              )}
              {villeLabel && (
                <div className="salon-badge">
                  <MapPin size={14} strokeWidth={2} />
                  <span>{villeLabel}</span>
                </div>
              )}
              {salon.horaires && (
                <div className="salon-badge">
                  <Clock size={14} strokeWidth={2} />
                  <span>{salon.horaires}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── INFOS PRATIQUES ── */}
        <section className="salon-infos">
          <div className="salon-infos-inner">

            {(salon.adresse || salon.ville) && (
              <div className="salon-info-card">
                <div className="salon-info-icon"><MapPin size={24} strokeWidth={1.5} /></div>
                <h2 className="salon-info-ttl">Adresse</h2>
                <p className="salon-info-txt">
                  {salon.adresse && <>{salon.adresse}<br /></>}
                  {salon.code_postal} {salon.ville}, France
                </p>
                {salon.lien_google_maps && (
                  <a href={salon.lien_google_maps} target="_blank" rel="noopener noreferrer" className="salon-info-link">
                    Voir sur Google Maps →
                  </a>
                )}
              </div>
            )}

            <div className="salon-info-card">
              <div className="salon-info-icon"><Clock size={24} strokeWidth={1.5} /></div>
              <h2 className="salon-info-ttl">Horaires</h2>
              <div className="salon-hours">
                <div className="salon-hour-row">
                  <span>Ouverture</span>
                  <span className="salon-hour-val">{salon.horaires || 'À venir'}</span>
                </div>
              </div>
              {salon.telephone && (
                <a href={`tel:${salon.telephone.replace(/\s/g, '')}`} className="salon-info-link" style={{ marginTop: 8, display: 'inline-block' }}>
                  <Phone size={13} strokeWidth={1.8} style={{ display: 'inline', marginRight: 4 }} />
                  {salon.telephone}
                </a>
              )}
            </div>

            {salon.lien_planity && (
              <div className="salon-info-card">
                <div className="salon-info-icon"><Scissors size={24} strokeWidth={1.5} /></div>
                <h2 className="salon-info-ttl">Réservation</h2>
                <p className="salon-info-txt">
                  Réservez en ligne 24h/24 ou passez directement au salon.
                </p>
                <a href={salon.lien_planity} target="_blank" rel="noopener noreferrer" className="salon-info-link">
                  Réserver sur Planity →
                </a>
              </div>
            )}

          </div>
        </section>

        {/* ── GOOGLE MAPS EMBED ── */}
        <section className="salon-map-sec">
          <GoogleMapEmbed
            title={`${salon.nom} — ${villeLabel}`}
            src={embedSrc}
            className="salon-map"
            routeHref={salon.lien_google_maps}
          />
        </section>

        {/* ── BOUTONS D'ACTION ── */}
        {(salon.lien_planity || salon.lien_google_maps) && (
          <div className="salon-map-actions">
            {salon.lien_planity && (
              <a href={salon.lien_planity} target="_blank" rel="noopener noreferrer" className="salon-btn-reserve">
                Réserver en ligne →
              </a>
            )}
            {salon.lien_google_maps && (
              <a href={salon.lien_google_maps} target="_blank" rel="noopener noreferrer" className="salon-btn-route">
                Itinéraire →
              </a>
            )}
          </div>
        )}

        {/* ── PHOTOS DU SALON ── */}
        <section className="salon-photos-sec">
          <div className="salon-photos-inner">
            <div className="salon-sec-ey">— L&apos;ambiance en images —</div>
            <h2 className="salon-sec-title">LE SALON</h2>
            <SalonCarousel photos={salon.photos ?? []} label={salon.nom ?? 'SP Barber'} />
          </div>
        </section>

        {/* ── AVIS ── */}
        {(salon.avis_google ?? []).length > 0 && (
          <SalonAvisGrid
            avis={salon.avis_google ?? []}
            salonNom={salon.nom ?? villeLabel}
            googleMapsUrl={salon.lien_avis_google ?? salon.lien_google_maps ?? undefined}
          />
        )}

        {/* ── PRESTATIONS — communes a tous les salons ── */}
        <section className="salon-services">
          <div className="salon-services-inner">
            <div className="salon-sec-ey">— Ce que nous proposons —</div>
            <h2 className="salon-sec-title">NOS PRESTATIONS</h2>
            <p className="salon-sec-sub">
              Coiffeur homme et barbier professionnel à {salon.ville ?? 'proximité'} — des prestations soignées pour chaque type de coupe et de barbe.
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
              Les mêmes produits que nos barbiers utilisent en salon, expédiés {DELAI_EXPEDITION_FRAGMENT} partout en France (livraison {TRANSIT_TEXTE_COMPACT}, offerte dès 59€ — sauf tondeuses, livraison sous ~2 semaines).
            </p>
            <Link href="/products" className="salon-shop-cta">
              Voir tous les produits <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        </section>

        {/* ── SEO LOCAL — texte long tail, genere depuis les donnees reelles ── */}
        <section className="salon-local-seo">
          <div className="salon-local-inner">
            <h2>Barbier à {salon.ville ?? 'votre ville'} — Votre Salon SP Barber</h2>
            <p>
              {salon.adresse && <>Situé au <strong>{salon.adresse}</strong>{salon.ville ? ` à ${salon.ville}` : ''}{salon.code_postal ? ` (${salon.code_postal})` : ''}, </>}
              <strong>SP Barber</strong> est le salon de coiffure homme et barbier professionnel
              {salon.ville ? ` de référence à ${salon.ville}` : ''}.
              {salon.horaires ? ` Notre équipe de barbiers qualifiés vous accueille ${salon.horaires} ` : ' '}
              pour des coupes homme soignées, des dégradés fade précis et des soins barbe professionnels.
            </p>
            {salon.description && <p>{salon.description}</p>}
            <p>
              Nos <strong>produits barbier</strong> sont également disponibles dans notre
              boutique en ligne pour entretenir votre style entre deux coupes.
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
