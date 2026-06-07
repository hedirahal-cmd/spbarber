import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import { AddToCartButton } from '@/components/AddToCartButton'
import { formatPrice } from '@/lib/utils'
import { Scissors, Droplets, User, Zap, Sparkles, Truck, Gift, RotateCcw } from 'lucide-react'
import { HomeSalonSection, DEFAULT_SALON_CONFIG, type SalonConfig } from '@/components/home/HomeSalonSection'
import { DEFAULT_SALONS, type Salon } from '@/lib/salons'
import { supabase } from '@/lib/supabase'

async function getSalonConfig(): Promise<SalonConfig> {
  try {
    const { data } = await supabase.from('salon_config').select('*').eq('id', 1).single()
    if (data) return data as SalonConfig
  } catch {}
  return DEFAULT_SALON_CONFIG
}

async function getSalons(): Promise<Salon[]> {
  try {
    const { data } = await supabase.from('salons').select('*').eq('actif', true).order('slug')
    if (data && data.length > 0) return data as Salon[]
  } catch {}
  return DEFAULT_SALONS
}
import { schemaOrganizationLocal, schemaBreadcrumb } from '@/lib/schema'

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

const SOCIAL_PROOF: Record<string, number> = {
  '1': 34, '2': 51, '3': 12, '4': 18, '5': 89, '6': 7,
}

const REVIEWS = [
  { text: `"La cire tient toute la journée. Mes potes me demandent tous ce que j'utilise."`, name: 'Karim B.', initials: 'KB', color: '#3a5a8a', product: 'Cire Cheveux Premium', date: 'Mai 2025' },
  { text: `"Le pack barbe est parfait. Qualité vraiment pro, rien à voir avec la grande surface."`, name: 'Amélie D.', initials: 'AD', color: '#8a3a5a', product: 'Pack Barbe Complet', date: 'Avr 2025' },
  { text: `"La crème curl définit mes boucles sans les alourdir. Enfin un vrai produit pour cheveux texturés !"`, name: 'Marcus T.', initials: 'MT', color: '#3a8a5a', product: 'Crème Curl', date: 'Mar 2025' },
  { text: `"Le shampooing noir a vraiment ravivé ma couleur. Résultat bluffant dès la première utilisation."`, name: 'Thierry M.', initials: 'TM', color: '#5a3a8a', product: 'Shampooing Noir', date: 'Mai 2025' },
  { text: `"Cadeau parfait pour mon frère. La présentation est soignée et les produits sont top qualité."`, name: 'Sarah L.', initials: 'SL', color: '#8a6a3a', product: 'Pack Barbe Complet', date: 'Avr 2025' },
  { text: `"J'utilise l'huile de barbe tous les matins. Ma barbe est beaucoup plus douce et brillante."`, name: 'Youssef A.', initials: 'YA', color: '#3a7a8a', product: 'Huile de Barbe', date: 'Mar 2025' },
]

const BARBIERS = [
  {
    name: 'Samy P.',
    initials: 'SP',
    color: '#1a3a5a',
    shop: 'Barber Shop Élite',
    city: 'Fougères',
    exp: '8 ans',
    quote: `"La Cire Premium est mon indispensable. Tenue impeccable du matin au soir — je l'utilise sur tous mes clients depuis des années."`,
    favProduct: 'Cire Cheveux Premium',
    favSlug: 'cire-cheveux-premium',
  },
  {
    name: 'Karim M.',
    initials: 'KM',
    color: '#3a1a5a',
    shop: 'Barber King',
    city: 'Rennes',
    exp: '12 ans',
    quote: `"Le Pack Barbe, c'est exactement ce que je recommande à mes clients qui veulent entretenir leur barbe à la maison comme en salon."`,
    favProduct: 'Pack Barbe Complet',
    favSlug: 'pack-barbe-complet',
  },
  {
    name: 'David L.',
    initials: 'DL',
    color: '#1a5a3a',
    shop: 'Le Gentleman Barber',
    city: 'Paris',
    exp: '6 ans',
    quote: `"Le Shampooing Noir est parfait pour raviver la couleur entre deux coupes. Aucun client ne revient sans vouloir en racheter."`,
    favProduct: 'Shampooing Noir Colorant',
    favSlug: 'shampooing-noir-colorant',
  },
]

export default async function HomePage() {
  const packBarbe = PRODUCTS.find((p) => p.id === '5')!
  const shampNoir = PRODUCTS.find((p) => p.id === '2')!
  const cireCheveux = PRODUCTS.find((p) => p.id === '1')!
  const featured = PRODUCTS.filter((p) => p.id !== '5' && p.id !== '2' && p.id !== '1').slice(0, 6)

  const salonConfig      = await getSalonConfig()
  const salons           = await getSalons()
  const orgSchema        = schemaOrganizationLocal()
  const breadcrumbSchema = schemaBreadcrumb([{ name: 'Accueil', url: 'https://spbarber.fr' }])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
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
          <Link href="/products/cire-cheveux-premium" className="hq-btn">
            <span className="hq-icon"><Scissors size={22} strokeWidth={1.6} /></span>
            <span className="hq-txt">
              <span className="hq-main">J&apos;ai du mal à me coiffer</span>
              <span className="hq-sub">Cire fixante</span>
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
          {/* Pack Barbe — Meilleure vente */}
          <div className="best2-card">
            <span className="best2-badge-mv">Meilleure vente</span>
            <Link href={`/products/${packBarbe.slug}`} className="best2-card-inner">
              <div className="best2-img">
                <span className="best2-icon"><CategoryIcon category={packBarbe.category} size={72} /></span>
              </div>
              <div className="best2-info">
                <div className="best2-cat">Pack complet · Barbe</div>
                <div className="best2-name">{packBarbe.benefit}</div>
                <div className="best2-benef">{packBarbe.name}</div>
                <span className="best2-price">{formatPrice(packBarbe.price)}</span>
              </div>
            </Link>
            <div className="best2-atc-wrap">
              <AddToCartButton product={packBarbe} className="best2-btn" label="Ajouter au panier" />
            </div>
          </div>

          {/* Cire Cheveux — Bestseller coiffage */}
          <div className="best2-card">
            <span className="best2-badge-bs">Bestseller</span>
            <Link href={`/products/${cireCheveux.slug}`} className="best2-card-inner">
              <div className="best2-img">
                <span className="best2-icon"><CategoryIcon category={cireCheveux.category} size={72} /></span>
              </div>
              <div className="best2-info">
                <div className="best2-cat">Coiffant · Tenue forte</div>
                <div className="best2-name">{cireCheveux.benefit}</div>
                <div className="best2-benef">{cireCheveux.name}</div>
                <span className="best2-price">{formatPrice(cireCheveux.price)}</span>
              </div>
            </Link>
            <div className="best2-atc-wrap">
              <AddToCartButton product={cireCheveux} className="best2-btn" label="Ajouter au panier" />
            </div>
          </div>

          {/* Shampooing Noir — Forte marge */}
          <div className="best2-card">
            <span className="best2-badge-mv">Coup de coeur</span>
            <Link href={`/products/${shampNoir.slug}`} className="best2-card-inner">
              <div className="best2-img">
                <span className="best2-icon"><CategoryIcon category={shampNoir.category} size={72} /></span>
              </div>
              <div className="best2-info">
                <div className="best2-cat">Soin colorant</div>
                <div className="best2-name">{shampNoir.benefit}</div>
                <div className="best2-benef">{shampNoir.name}</div>
                <span className="best2-price">{formatPrice(shampNoir.price)}</span>
              </div>
            </Link>
            <div className="best2-atc-wrap">
              <AddToCartButton product={shampNoir} className="best2-btn" label="Ajouter au panier" />
            </div>
          </div>
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
                  <div className="pc-ph">
                    <span className="pc-icon"><CategoryIcon category={product.category} size={50} /></span>
                  </div>
                  {product.stock <= 10 && product.stock > 0 && (
                    <span className="pc-tag">Dernières unités</span>
                  )}
                  {product.id === '1' && <span className="pc-tagg">Bestseller</span>}
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
                {SOCIAL_PROOF[product.id] && (
                  <div className="pc-social">🔥 {SOCIAL_PROOF[product.id]} achetés cette semaine</div>
                )}
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
          {BARBIERS.map((b, i) => (
            <div key={i} className="barber-card">
              <div className="barber-hd">
                <div className="barber-av" style={{ background: b.color }}>{b.initials}</div>
                <div>
                  <div className="barber-name-txt">{b.name}</div>
                  <div className="barber-role-txt">{b.shop} · {b.city}</div>
                  <div className="barber-exp-badge">{b.exp} d&apos;expérience</div>
                </div>
              </div>
              <div className="barber-stars-txt">★★★★★</div>
              <p className="barber-quote-txt">{b.quote}</p>
              <Link href={`/products/${b.favSlug}`} className="barber-fav-link">
                Produit favori : <strong>{b.favProduct}</strong> →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip 2 ── */}
      <div className="cta-strip cta-strip-dark">
        <div className="cta-strip-label">Rejoignez 500+ clients satisfaits</div>
        <Link href="/products" className="cta-strip-btn cta-strip-btn-light">
          Choisir mon produit →
        </Link>
      </div>

      {/* ── SALON ── */}
      <HomeSalonSection config={salonConfig} salons={salons} />

      {/* ── AVIS ── */}
      <section className="h-reviews">
        <div className="sec-head">
          <div>
            <div className="sec-ey">— Ils nous font confiance —</div>
            <h2 className="sec-title">AVIS CLIENTS</h2>
          </div>
        </div>
        <div className="h-rev-summary">
          <div className="h-rev-avg">4,9</div>
          <div>
            <div className="h-rev-stars-big">★★★★★</div>
            <div className="h-rev-total">Basé sur 500+ avis vérifiés</div>
          </div>
        </div>
        <div className="h-rev-grid">
          {REVIEWS.map((r, i) => (
            <div key={i} className="h-rev-card">
              <div className="h-rev-stars">★★★★★</div>
              <p className="h-rev-text">{r.text}</p>
              <div className="h-rev-auth">
                <div className="h-rev-av" style={{ background: r.color }}>{r.initials}</div>
                <div>
                  <div className="h-rev-name">{r.name}</div>
                  <div className="h-rev-meta">{r.product} · {r.date}</div>
                  <div className="h-rev-check">✓ Achat vérifié</div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
