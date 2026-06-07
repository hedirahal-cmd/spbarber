import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Clock, Scissors, User, Droplets } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Conseils Coiffure Homme — SP Barber | Guides et Astuces Barbier',
  description:
    'Conseils coiffure homme, astuces barbe et guides produits par les barbiers SP Barber de Fougères. Apprenez à coiffer comme un pro à la maison.',
  alternates: { canonical: 'https://spbarber.fr/conseils' },
  openGraph: {
    title: 'Conseils Coiffure Homme — SP Barber',
    description: 'Guides et astuces barbier : coupe, barbe, routine capillaire masculine.',
    url: 'https://spbarber.fr/conseils',
    type: 'website',
  },
}

const ARTICLES = [
  {
    slug: 'comment-reussir-son-degrade-a-la-maison',
    title: 'Comment réussir son dégradé à la maison',
    excerpt:
      'Le dégradé fade est LA coupe masculine du moment. Nos barbiers de Fougères vous expliquent pas à pas comment obtenir un résultat pro chez vous, avec les bons outils.',
    category: 'Coupe & Style',
    readTime: '5 min',
    icon: <Scissors size={20} strokeWidth={1.5} />,
    keywords: ['dégradé homme', 'fade haircut', 'coupe maison'],
  },
  {
    slug: 'meilleurs-produits-barbe-impeccable-2025',
    title: 'Les meilleurs produits pour une barbe impeccable en 2025',
    excerpt:
      'Huile, baume, cire ou gel — quel produit choisir pour entretenir sa barbe ? Notre guide complet sélectionné par nos barbiers pros pour chaque type de barbe.',
    category: 'Soin Barbe',
    readTime: '6 min',
    icon: <User size={20} strokeWidth={1.5} />,
    keywords: ['soin barbe homme', 'produit barbe 2025', 'huile barbe'],
  },
  {
    slug: 'routine-capillaire-homme-5-etapes-essentielles',
    title: 'Routine capillaire homme : les 5 étapes essentielles',
    excerpt:
      'Shampooing, après-shampooing, séchage, coiffage… Une routine capillaire bien construite fait toute la différence. Le guide complet de nos barbiers en 5 étapes clés.',
    category: 'Routine & Entretien',
    readTime: '7 min',
    icon: <Droplets size={20} strokeWidth={1.5} />,
    keywords: ['routine cheveux homme', 'soin capillaire masculin', 'coiffage homme'],
  },
]

export default function ConseilsPage() {
  return (
    <div className="blog-page">
      {/* Header */}
      <div className="blog-header">
        <div className="blog-header-ey">— Conseils de nos barbiers —</div>
        <h1 className="blog-header-title">GUIDES & CONSEILS</h1>
        <p className="blog-header-sub">
          Astuces coiffure, guides produits et routines capillaires par les barbiers SP Barber de Fougères.
          Apprenez à coiffer comme un professionnel, directement chez vous.
        </p>
      </div>

      {/* Articles */}
      <div className="blog-grid">
        {ARTICLES.map((article) => (
          <article key={article.slug} className="blog-card">
            <div className="blog-card-top">
              <div className="blog-card-icon">{article.icon}</div>
              <span className="blog-card-cat">{article.category}</span>
            </div>
            <h2 className="blog-card-title">{article.title}</h2>
            <p className="blog-card-excerpt">{article.excerpt}</p>
            <div className="blog-card-footer">
              <div className="blog-card-meta">
                <Clock size={12} strokeWidth={2} />
                <span>{article.readTime} de lecture</span>
              </div>
              <Link href={`/conseils/${article.slug}`} className="blog-card-link">
                Lire l&apos;article <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
            <div className="blog-card-kw">
              {article.keywords.map((kw) => (
                <span key={kw} className="blog-kw-tag">{kw}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {/* CTA boutique */}
      <div className="blog-cta-strip">
        <p className="blog-cta-txt">
          Les produits recommandés dans nos articles, livrés en 48h
        </p>
        <Link href="/products" className="blog-cta-btn">
          Voir la boutique <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  )
}
