import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Nos Barbers — SP Barber | Barbiers Fougères & Ernée',
  description: 'Rencontrez l\'équipe SP Barber : barbiers professionnels à Fougères et Ernée. Spécialistes coupes homme, dégradés fade et soins barbe.',
  alternates: { canonical: 'https://spbarber.fr/barbers' },
}

const BARBERS = [
  {
    prenom: 'Samy',
    initiale: 'P.',
    salon: 'Fougères',
    experience: 8,
    specialite: 'Dégradé Fade & Skin Fade',
    description: 'Samy est le fondateur de SP Barber. Passionné de coiffure masculine depuis plus de 8 ans, il a affiné sa technique entre Paris et Bretagne avant d\'ouvrir le salon de Fougères.',
    produit: 'Cire Cheveux Premium',
    produitSlug: 'cire-cheveux-premium',
    color: '#1a3a5a',
  },
  {
    prenom: 'Karim',
    initiale: 'M.',
    salon: 'Fougères',
    experience: 5,
    specialite: 'Coupe Classique & Barbe',
    description: 'Karim est le spécialiste de la barbe chez SP Barber Fougères. Maîtrisant le rasage traditionnel et la mise en forme barbe, il chouchoutera votre style du visage.',
    produit: 'Pack Barbe Complet',
    produitSlug: 'pack-barbe-complet',
    color: '#3a1a5a',
  },
  {
    prenom: 'David',
    initiale: 'L.',
    salon: 'Ernée',
    experience: 4,
    specialite: 'Dégradé & Coloration',
    description: 'David est à la tête du salon SP Barbershop d\'Ernée. Expert en dégradés et colorations homme, il apporte l\'expertise SP Barber en Mayenne.',
    produit: 'Shampooing Noir Colorant',
    produitSlug: 'shampooing-noir-colorant',
    color: '#1a5a3a',
  },
]

export default function BarbersPage() {
  return (
    <div className="barbers-page">

      {/* ── HERO ── */}
      <section className="barbers-hero">
        <div className="barbers-hero-inner">
          <div className="barbers-hero-ey">L&apos;ÉQUIPE SP BARBER</div>
          <h1 className="barbers-hero-title">NOS BARBERS</h1>
          <p className="barbers-hero-sub">
            Des artisans passionnés, formés aux techniques les plus précises.<br />
            Chaque coupe est signée d&apos;une main de maître.
          </p>
        </div>
      </section>

      {/* ── GRILLE BARBERS ── */}
      <section className="barbers-grid-sec">
        <div className="barbers-grid-inner">
          <div className="barbers-grid">
            {BARBERS.map((b) => (
              <article key={b.prenom} className="barber-card">

                {/* Photo placeholder */}
                <div className="barber-photo" style={{ background: b.color }}>
                  <div className="barber-initials">
                    {b.prenom[0]}{b.initiale}
                  </div>
                </div>

                <div className="barber-body">
                  <div className="barber-salon-badge">{b.salon}</div>
                  <h2 className="barber-name">{b.prenom} {b.initiale}</h2>
                  <div className="barber-specialite">{b.specialite}</div>
                  <p className="barber-desc">{b.description}</p>

                  <div className="barber-stats">
                    <div className="barber-stat">
                      <span className="barber-stat-val">{b.experience}</span>
                      <span className="barber-stat-lbl">ans d&apos;exp.</span>
                    </div>
                    <div className="barber-stat-sep" />
                    <div className="barber-stat">
                      <span className="barber-stat-val">★ 5</span>
                      <span className="barber-stat-lbl">note Google</span>
                    </div>
                  </div>

                  <div className="barber-produit">
                    <span className="barber-produit-lbl">Produit favori :</span>
                    <Link href={`/products/${b.produitSlug}`} className="barber-produit-link">
                      {b.produit} →
                    </Link>
                  </div>
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
