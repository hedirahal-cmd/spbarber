export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import { AddToCartButton } from '@/components/AddToCartButton'
import { formatPrice } from '@/lib/utils'
import { Scissors, Droplets, User, Zap, Sparkles, Truck, Gift, RotateCcw, Wind } from 'lucide-react'
import { HomeSalonSection } from '@/components/home/HomeSalonSection'
import { DEFAULT_SALONS, type Salon } from '@/lib/salons'
import { supabase, supabaseAdmin } from '@/lib/supabase'

async function getSalons(): Promise<Salon[]> {
  try {
    const { data } = await supabase.from('salons').select('*').eq('actif', true).order('ordre')
    if (data && data.length > 0) return data as Salon[]
  } catch {}
  return DEFAULT_SALONS
}
import { schemaOrganizationLocal, schemaBreadcrumb, jsonLd } from '@/lib/schema'
import { toReviewDisplay, type ReviewDisplay } from '@/lib/reviews'
import { ReviewsList } from '@/components/ReviewsList'
import { getSiteContent } from '@/lib/site-content'
import { resolveSocialProof } from '@/lib/social-proof'

type ProdOverride = {
  id: string; name?: string | null; price?: number | null; description?: string | null; stock?: number | null
  benefit?: string | null; images?: { url: string; alt: string }[] | null
  social_proof_text?: string | null; social_proof_visible?: boolean | null
  actif?: boolean | null; is_bestseller?: boolean | null; bestseller_ordre?: number | null
  bestseller_badge?: string | null; bestseller_cat?: string | null
}

async function getReviews(): Promise<ReviewDisplay[]> {
  try {
    const { data } = await supabase.from('reviews').select('*').eq('visible', true).order('created_at', { ascending: false }).limit(6)
    if (data && data.length > 0) return data.map(toReviewDisplay)
  } catch {}
  return []
}

type TemoPro = {
  id: string; nom: string; initiales: string; couleur_avatar: string
  photo_url: string | null; salon: string | null; ville: string | null
  annees_experience: number | null; citation: string | null
  produit_favori_slug: string | null; produit_favori_nom: string | null
}

const DEFAULT_TEMOS_PROS: TemoPro[] = [
  { id: '1', nom: 'Samy P.', initiales: 'SP', couleur_avatar: '#1a3a5c', photo_url: null, salon: 'SP Barber Shop', ville: 'Fougères', annees_experience: 8, citation: 'La Cire Premium est mon indispensable. Tenue impeccable du matin au soir — je l\'utilise sur tous mes clients depuis des années.', produit_favori_slug: 'cire-cheveux-premium', produit_favori_nom: 'Cire Cheveux Premium' },
  { id: '2', nom: 'Karim M.', initiales: 'KM', couleur_avatar: '#4a1a6b', photo_url: null, salon: 'Barber King', ville: 'Fougères', annees_experience: 5, citation: 'Le Pack Barbe, c\'est exactement ce que je recommande à mes clients qui veulent entretenir leur barbe à la maison comme en salon.', produit_favori_slug: 'pack-barbe-complet', produit_favori_nom: 'Pack Barbe Complet' },
  { id: '3', nom: 'David L.', initiales: 'DL', couleur_avatar: '#1a5c3a', photo_url: null, salon: 'SP Barbershop', ville: 'Ernée', annees_experience: 4, citation: 'Le Shampooing Noir est parfait pour raviver la couleur entre deux coupes. Aucun client ne revient sans vouloir en racheter.', produit_favori_slug: 'shampooing-noir-colorant', produit_favori_nom: 'Shampooing Noir Colorant' },
]

async function getTemoignagesPros(): Promise<TemoPro[]> {
  try {
    const { data } = await supabaseAdmin
      .from('temoignages_pros')
      .select('*')
      .eq('actif', true)
      .order('ordre')
    if (data && data.length > 0) return data as TemoPro[]
  } catch {}
  return DEFAULT_TEMOS_PROS
}

async function getProductOverrides(): Promise<Record<string, ProdOverride>> {
  try {
    const { data } = await supabaseAdmin.from('product_overrides').select('id,name,price,description,stock,benefit,images,social_proof_text,social_proof_visible,actif,is_bestseller,bestseller_ordre,bestseller_badge,bestseller_cat')
    if (!data) return {}
    const map: Record<string, ProdOverride> = {}
    ;(data as ProdOverride[]).forEach(r => { map[r.id] = r })
    return map
  } catch {}
  return {}
}

function applyOverride(p: (typeof PRODUCTS)[0], ov: Record<string, ProdOverride>) {
  const o = ov[p.id]
  if (!o) return p
  return {
    ...p,
    name: o.name ?? p.name,
    price: o.price ?? p.price,
    description: o.description ?? p.description,
    stock: o.stock ?? p.stock,
    benefit: o.benefit ?? p.benefit,
    images: (o.images && o.images.length > 0) ? o.images : p.images,
    actif: o.actif !== false,
  }
}

function CategoryIcon({ category, size = 64 }: { category: string; size?: number }) {
  if (category === 'coiffant') return <Scissors size={size} strokeWidth={1.2} />
  if (category === 'soin') return <Droplets size={size} strokeWidth={1.2} />
  if (category === 'barbe') return <User size={size} strokeWidth={1.2} />
  if (category === 'accessoire') return <Zap size={size} strokeWidth={1.2} />
  return <Sparkles size={size} strokeWidth={1.2} />
}

const CATEGORY_LABELS: Record<string, string> = {
  coiffant: 'Coiffant',
  soin: 'Soin',
  barbe: 'Barbe',
  accessoire: 'Accessoire',
}

// Avis de secours affiches tant qu'il n'y a pas assez de vrais avis approuves
// (bloc B) -- garde volontairement rating/verified explicites plutot que de
// laisser ReviewsList inventer une valeur par defaut pour ce cas precis.
const REVIEWS: ReviewDisplay[] = [
  { id: 'seed-1', text: `"La cire tient toute la journée. Mes potes me demandent tous ce que j'utilise."`, name: 'Karim B.', initials: 'KB', color: '#3a5a8a', product: 'Cire Cheveux Premium', date: 'Mai 2025', rating: 5, verified: true },
  { id: 'seed-2', text: `"Le pack barbe est parfait. Qualité vraiment pro, rien à voir avec la grande surface."`, name: 'Amélie D.', initials: 'AD', color: '#8a3a5a', product: 'Pack Barbe Complet', date: 'Avr 2025', rating: 5, verified: true },
  { id: 'seed-3', text: `"La crème curl définit mes boucles sans les alourdir. Enfin un vrai produit pour cheveux texturés !"`, name: 'Marcus T.', initials: 'MT', color: '#3a8a5a', product: 'Crème Curl', date: 'Mar 2025', rating: 5, verified: true },
  { id: 'seed-4', text: `"Le shampooing noir a vraiment ravivé ma couleur. Résultat bluffant dès la première utilisation."`, name: 'Thierry M.', initials: 'TM', color: '#5a3a8a', product: 'Shampooing Noir', date: 'Mai 2025', rating: 5, verified: true },
  { id: 'seed-5', text: `"Cadeau parfait pour mon frère. La présentation est soignée et les produits sont top qualité."`, name: 'Sarah L.', initials: 'SL', color: '#8a6a3a', product: 'Pack Barbe Complet', date: 'Avr 2025', rating: 5, verified: true },
  { id: 'seed-6', text: `"J'utilise l'huile de barbe tous les matins. Ma barbe est beaucoup plus douce et brillante."`, name: 'Youssef A.', initials: 'YA', color: '#3a7a8a', product: 'Huile de Barbe', date: 'Mar 2025', rating: 5, verified: true },
]


export default async function HomePage() {
  const salons           = await getSalons()
  const temos            = await getTemoignagesPros()
  const reviewsDb        = await getReviews()
  const reviews          = reviewsDb.length > 0 ? reviewsDb : REVIEWS
  // Meme logique que le resume par produit (ProductDetail) : calcule depuis
  // les avis reellement affiches, plus de "4,9 / 500+ avis" invente. `reviews`
  // n'est jamais vide ici (repli sur REVIEWS), donc pas d'etat vide a gerer.
  const avgRating        = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  const avgRatingLabel   = avgRating.toFixed(1).replace('.', ',')
  const overrides        = await getProductOverrides()
  const siteContent      = await getSiteContent()
  const orgSchema        = schemaOrganizationLocal()
  const breadcrumbSchema = schemaBreadcrumb([{ name: 'Accueil', url: 'https://spbarber.fr' }])

  // Bestsellers choisis en admin (case a cocher par produit) -- ordre croissant,
  // les non-renseignes en dernier, plafonne a 3 pour matcher la grille figee a
  // 3 colonnes (best2-grid).
  const bestsellers = PRODUCTS
    .map((p) => ({ product: applyOverride(p, overrides), ov: overrides[p.id] }))
    .filter(({ product, ov }) => !!ov?.is_bestseller && product.actif !== false)
    .sort((a, b) => (a.ov?.bestseller_ordre ?? 999) - (b.ov?.bestseller_ordre ?? 999))
    .slice(0, 3)
  const bestsellerIds = new Set(bestsellers.map(({ product }) => product.id))
  const featured = PRODUCTS.filter((p) => !bestsellerIds.has(p.id)).slice(0, 6).map(p => applyOverride(p, overrides)).filter((p) => p.actif !== false)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      {/* ── HERO — centré vertical ── */}
      <section className="hero">

        {/* Social proof */}
        <div className="hero-proof-bar">
          <span className="hero-proof-item">
            <span className="hero-proof-star">★★★★★</span> 4,9/5
          </span>
          <span className="hero-proof-sep">·</span>
          <span className="hero-proof-item">+500 avis vérifiés</span>
          <span className="hero-proof-sep">·</span>
          <span className="hero-proof-item">Utilisé par les pros</span>
        </div>

        {/* H1 */}
        <h1 className="h-title">
          La routine de votre barbier,<em>livrée chez vous.</em>
        </h1>

        {/* Séparateur */}
        <div className="hq-sep" />

        {/* Label + titre objectifs */}
        <div className="hq-label">Trouvez votre produit en 30 secondes</div>
        <div className="hq-title">Quel est votre objectif&nbsp;?</div>

        {/* Grille 2×2 */}
        <div className="hq-grid">
          <Link href="/products/shampooing-noir-colorant" className="hq-btn">
            <span className="hq-icon"><Sparkles size={22} strokeWidth={1.6} /></span>
            <span className="hq-txt">
              <span className="hq-main">J&apos;ai des cheveux blancs</span>
              <span className="hq-sub">Shampooing colorant</span>
            </span>
          </Link>
          <Link href="/products/poudre-texturante" className="hq-btn">
            <span className="hq-icon"><Wind size={22} strokeWidth={1.6} /></span>
            <span className="hq-txt">
              <span className="hq-main">J&apos;ai des cheveux fins, sans tenue</span>
              <span className="hq-sub">Poudre texturante</span>
            </span>
          </Link>
          <Link href="/products/pack-barbe-complet" className="hq-btn">
            <span className="hq-icon"><User size={22} strokeWidth={1.6} /></span>
            <span className="hq-txt">
              <span className="hq-main">J&apos;ai une barbe sèche</span>
              <span className="hq-sub">Pack Barbe Complet</span>
            </span>
          </Link>
          <Link href="/products" className="hq-btn">
            <span className="hq-icon"><Zap size={22} strokeWidth={1.6} /></span>
            <span className="hq-txt">
              <span className="hq-main">Je veux une routine complete</span>
              <span className="hq-sub">Voir tous les produits</span>
            </span>
          </Link>
        </div>

        {/* Trust checks */}
        <div className="hero-trust-checks">
          <span className="hero-check-item"><span className="hero-check-v">✓</span> Formules utilisées par les barbiers pros</span>
          <span className="hero-check-item"><span className="hero-check-v">✓</span> Livraison offerte dès 49€</span>
          <span className="hero-check-item"><span className="hero-check-v">✓</span> Retour 30 jours</span>
        </div>

      </section>

      {/* ── NOS 2 BESTSELLERS ── */}
      <section className="best2-sec">
        <div className="best2-head sec-head">
          <div>
            <div className="sec-ey">— Les incontournables —</div>
            <h2 className="sec-title">NOS BESTSELLERS</h2>
          </div>
        </div>
        <div className="best2-grid">
          {bestsellers.map(({ product, ov }) => (
            <div className="best2-card" key={product.id}>
              <span className="best2-badge-mv">{ov?.bestseller_badge || 'Bestseller'}</span>
              <Link href={`/products/${product.slug}`} className="best2-card-inner">
                <div className="best2-img">
                  {product.images[0]?.url.startsWith('http') ? (
                    <img src={product.images[0].url} alt={product.images[0].alt || product.name} />
                  ) : (
                    <span className="best2-icon"><CategoryIcon category={product.category} size={72} /></span>
                  )}
                </div>
                <div className="best2-info">
                  <div className="best2-cat">{ov?.bestseller_cat || CATEGORY_LABELS[product.category] || product.category}</div>
                  <div className="best2-name">{product.benefit}</div>
                  <div className="best2-benef">{product.name}</div>
                  <span className="best2-price">{formatPrice(product.price)}</span>
                </div>
              </Link>
              <div className="best2-atc-wrap">
                <AddToCartButton product={product} className="best2-btn" label="Ajouter au panier" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA après bestsellers ── */}
      <div className="cta-strip cta-strip-dark" style={{ padding: '16px 24px' }}>
        <Link href="/products" className="cta-strip-btn">
          Voir toute la gamme →
        </Link>
      </div>

      {/* ── REA BAR ── */}
      <div className="rea-compact">
        <div className="rea-c-item"><Truck size={11} strokeWidth={1.8} /> Livraison offerte dès 49€</div>
        <div className="rea-c-sep">|</div>
        <div className="rea-c-item"><Gift size={11} strokeWidth={1.8} /> Cadeau dès 70€</div>
        <div className="rea-c-sep">|</div>
        <div className="rea-c-item"><RotateCcw size={11} strokeWidth={1.8} /> Retour 30j</div>
        <div className="rea-c-sep">|</div>
        <div className="rea-c-item"><Zap size={11} strokeWidth={1.8} /> Expédié 48h</div>
      </div>

      {/* ── PRODUITS — Bénéfice avant nom ── */}
      <section id="produits">
        <div className="sec-head">
          <div>
            <div className="sec-ey">— Nos bestsellers —</div>
            <h2 className="sec-title">PRODUITS</h2>
          </div>
          <Link href="/products" className="see-all">Voir tout →</Link>
        </div>
        <div className="prod-grid">
          {featured.map((product) => (
            <div key={product.id} className="prod-card">
              <Link href={`/products/${product.slug}`}>
                <div className="pc-img">
                  {product.images[0]?.url.startsWith('http') ? (
                    <img src={product.images[0].url} alt={product.images[0].alt || product.name} />
                  ) : (
                    <div className="pc-ph">
                      <span className="pc-icon"><CategoryIcon category={product.category} size={50} /></span>
                    </div>
                  )}
                  {product.stock <= 10 && product.stock > 0 && (
                    <span className="pc-tag">Dernières unités</span>
                  )}
                  {product.id === '3' && <span className="pc-tagg">Choix des barbiers</span>}
                  {product.id === '4' && <span className="pc-tag">Pro</span>}
                  {product.id === '6' && <span className="pc-tag">Résultat salon</span>}
                  <div className="pc-overlay">Voir le produit</div>
                </div>
              </Link>
              <div className="pc-info">
                <div className="pc-cat">{CATEGORY_LABELS[product.category] ?? product.category}</div>
                {product.benefit && <div className="pc-benefit">{product.benefit}</div>}
                <Link href={`/products/${product.slug}`}>
                  <div className="pc-name">{product.name}</div>
                </Link>
                <div className="pc-bottom">
                  <div className="pc-price">{formatPrice(product.price)}</div>
                  <AddToCartButton product={product} className="pc-atc" label="Ajouter" />
                </div>
                {(() => {
                  const socialProof = resolveSocialProof(product.id, overrides[product.id])
                  return socialProof && <div className="pc-social">🔥 {socialProof}</div>
                })()}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip ── */}
      <div className="cta-strip">
        <Link href="/products" className="cta-strip-btn">
          Voir toute la gamme →
        </Link>
      </div>

      {/* ── PACK BARBE ── */}
      <section id="barbe">
        <div className="sec-head">
          <div>
            <div className="sec-ey">— L&apos;essentiel réuni —</div>
            <h2 className="sec-title">PACK BARBE</h2>
          </div>
        </div>
        <div className="kit-wrap">
          <Link href="/products/pack-barbe-complet" className="kit-banner">
            <div className="kit-l">
              <div className="kit-tag">Pack Complet</div>
              <h2 className="kit-title">
                SP Barber<em>Pack Barbe</em>
              </h2>
              <p className="kit-desc">
                Huile de barbe, brosse, peigne, cire et baume — tout pour une barbe impeccable dans un seul coffret premium.
              </p>
              <span className="kit-price">49,90 €</span>
              <span className="btn-gold">Voir le Pack →</span>
            </div>
            <div className="kit-r">
              <span className="kit-r-icon"><Gift size={80} strokeWidth={1} /></span>
              <div className="kit-r-badge">
                <strong>5</strong>
                <span>produits inclus</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── BARBIERS LOCAUX — Ce qu'Amazon ne peut pas copier ── */}
      <section className="barbers-sec">
        <div className="sec-head">
          <div>
            <div className="sec-ey">— Ce qu&apos;Amazon ne peut pas vous offrir —</div>
            <h2 className="sec-title">RECOMMANDÉ PAR VOS BARBIERS LOCAUX</h2>
          </div>
        </div>
        <div className="barbers-grid">
          {temos.map((t) => (
            <div key={t.id} className="barber-card">
              <div className="barber-hd">
                <div className="barber-av" style={{ background: t.couleur_avatar }}>
                  {t.photo_url
                    ? <img src={t.photo_url} alt={t.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : t.initiales
                  }
                </div>
                <div>
                  <div className="barber-name-txt">{t.nom}</div>
                  <div className="barber-role-txt">{t.ville ?? t.salon ?? ''}</div>
                  {t.annees_experience && <div className="barber-exp-badge">{t.annees_experience} ans d&apos;expérience</div>}
                </div>
              </div>
              <div className="barber-stars-txt">★★★★★</div>
              {t.citation && <p className="barber-quote-txt">{t.citation}</p>}
              {t.produit_favori_slug && t.produit_favori_nom && (
                <Link href={`/products/${t.produit_favori_slug}`} className="barber-fav-link">
                  Produit favori : <strong>{t.produit_favori_nom}</strong> →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip 2 ── */}
      {siteContent.home_cta_banner.visible && (
        <div className="cta-strip cta-strip-dark">
          <div className="cta-strip-label">{siteContent.home_cta_banner.text}</div>
          <Link href="/products" className="cta-strip-btn cta-strip-btn-light">
            Choisir mon produit →
          </Link>
        </div>
      )}

      {/* ── SALON ── */}
      <HomeSalonSection salons={salons} />

      {/* ── AVIS ── */}
      <section className="h-reviews">
        <div className="sec-head">
          <div>
            <div className="sec-ey">— Ils nous font confiance —</div>
            <h2 className="sec-title">AVIS CLIENTS</h2>
          </div>
        </div>
        <div className="h-rev-summary">
          <div className="h-rev-avg">{avgRatingLabel}</div>
          <div>
            <div className="h-rev-stars-big">{'★'.repeat(Math.round(avgRating))}</div>
            <div className="h-rev-total">Basé sur {reviews.length} avis</div>
          </div>
        </div>
        <ReviewsList reviews={reviews} variant="home" />
      </section>

      {/* ── STICKY MOBILE ── */}
      <div className="sticky-mob">
        <Link href="/products" className="sticky-mob-btn">
          Acheter maintenant
        </Link>
      </div>
    </>
  )
}
