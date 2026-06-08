import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DEFAULT_BARBERS, type Barber } from '@/lib/barbers'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Notre Équipe — SP Barber | Barbiers Fougères & Ernée',
  description: 'Rencontrez l\'équipe SP Barber : barbiers professionnels à Fougères et Ernée. Spécialistes coupes homme, dégradés fade et soins barbe.',
  alternates: { canonical: 'https://spbarber.fr/barbers' },
}

async function getBarbers(): Promise<Barber[]> {
  try {
    const { data } = await supabase
      .from('barbers')
      .select('id,slug,nom,initiales,couleur_avatar,salon_slug,ville,specialite,description,annees_experience,produit_favori_slug,produit_favori_nom,actif,ordre')
      .eq('actif', true)
      .order('ordre')
    if (data && data.length > 0) return data as Barber[]
  } catch {}
  return DEFAULT_BARBERS
}

const SALON_NAMES: Record<string, string> = {
  fougeres: 'SP Barber Shop',
  ernee: 'SP Barbershop',
}

export default async function BarbersPage() {
  const barbers = await getBarbers()

  return (
    <div className="barbers-page">

      {/* ── HERO ── */}
      <section className="barbers-hero">
        <div className="barbers-hero-inner">
          <div className="barbers-hero-ey">L&apos;ÉQUIPE SP BARBER</div>
          <h1 className="barbers-hero-title">NOTRE ÉQUIPE</h1>
          <p className="barbers-hero-sub">
            Des passionnés qui mettent leur expertise à votre service.<br />
            Chaque coupe est signée d&apos;une main de maître.
          </p>
        </div>
      </section>

      {/* ── GRILLE BARBERS ── */}
      <section className="barbers-grid-sec">
        <div className="barbers-grid-inner">
          <div className="barbers-grid">
            {barbers.map((b) => (
              <article key={b.slug} className="barber-card">

                {/* Photo placeholder */}
                <div className="barber-photo" style={{ background: b.couleur_avatar }}>
                  <div className="barber-initials">{b.initiales}</div>
                </div>

                <div className="barber-body">
                  <div className="barber-salon-badge">{b.ville ?? (b.salon_slug ? (SALON_NAMES[b.salon_slug] ?? b.salon_slug) : '')}</div>
                  <h2 className="barber-name">{b.nom}</h2>
                  {b.specialite && <div className="barber-specialite">{b.specialite}</div>}
                  {b.description && <p className="barber-desc">{b.description}</p>}

                  {b.annees_experience && (
                    <div className="barber-exp-line">{b.annees_experience} ans d&apos;expérience</div>
                  )}

                  {b.produit_favori_slug && b.produit_favori_nom && (
                    <div className="barber-produit">
                      <span className="barber-produit-lbl">Produit favori :</span>
                      <Link href={`/products/${b.produit_favori_slug}`} className="barber-produit-link">
                        {b.produit_favori_nom} →
                      </Link>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="barbers-cta-sec">
        <div className="barbers-cta-inner">
          <div className="barbers-cta-ey">PRÊT À VOUS FAIRE COIFFER ?</div>
          <h2 className="barbers-cta-title">RÉSERVEZ VOTRE SÉANCE</h2>
          <p className="barbers-cta-sub">
            Choisissez votre salon et réservez en ligne, directement sur Planity.
          </p>
          <div className="barbers-cta-btns">
            <a
              href="https://www.planity.com/sp-barber-shop-35300-fougeres"
              target="_blank"
              rel="noopener noreferrer"
              className="barbers-cta-btn-primary"
            >
              Réserver à Fougères →
            </a>
            <Link href="/products" className="barbers-cta-btn-secondary">
              Voir nos produits
            </Link>
          </div>
        </div>
      </section>

      <div className="barbers-back">
        <Link href="/">← Retour à l&apos;accueil</Link>
      </div>
    </div>
  )
}
