import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import { AddToCartButton } from '@/components/AddToCartButton'
import { formatPrice } from '@/lib/utils'
import { Scissors, Droplets, User, Zap, Sparkles, Truck, Gift, RotateCcw } from 'lucide-react'

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

export default function HomePage() {
  const packBarbe = PRODUCTS.find((p) => p.id === '5')!
  const shampNoir = PRODUCTS.find((p) => p.id === '2')!
  const cireCheveux = PRODUCTS.find((p) => p.id === '1')!
  const featured = PRODUCTS.filter((p) => p.id !== '5' && p.id !== '2' && p.id !== '1').slice(0, 6)

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-l">
          <div className="hero-proof-bar">
            <span className="hero-proof-item">
              <span className="hero-proof-star">★★★★★</span> 4,9/5
            </span>
            <span className="hero-proof-sep">·</span>
            <span className="hero-proof-item">+500 avis vérifiés</span>
            <span className="hero-proof-sep">·</span>
            <span className="hero-proof-item">Utilisé par les pros</span>
          </div>

          <h1 className="h-title">
            La routine de votre barbier,<em>livrée chez vous.</em>
          </h1>

          <p className="h-sub">
            Cire, shampooing colorant, soins barbe — les formules utilisées en salon, disponibles en direct. Livraison en 48h.
          </p>

          <div className="h-ctas">
            <Link href="/products" className="btn-hero-primary">
              Découvrir les produits
              <span className="btn-hero-arrow">→</span>
            </Link>
          </div>

          <div className="hero-trust-checks">
            <span className="hero-check-item"><span className="hero-check-v">✓</span> Formules utilisées par les barbiers pros</span>
            <span className="hero-check-item"><span className="hero-check-v">✓</span> Livraison offerte dès 49€</span>
            <span className="hero-check-item"><span className="hero-check-v">✓</span> Retour 30 jours</span>
          </div>
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
          <Link href={`/products/${packBarbe.slug}`} className="best2-card">
            <span className="best2-badge-mv">Meilleure vente</span>
            <div className="best2-img">
              <span className="best2-icon"><CategoryIcon category={packBarbe.category} size={72} /></span>
            </div>
            <div className="best2-info">
              <div className="best2-cat">Pack complet · Barbe</div>
              <div className="best2-name">{packBarbe.name}</div>
              <div className="best2-benef">{packBarbe.benefit}</div>
              <span className="best2-price">{formatPrice(packBarbe.price)}</span>
              <span className="best2-btn">Voir le pack →</span>
            </div>
          </Link>

          {/* Cire Cheveux — Bestseller coiffage */}
          <Link href={`/products/${cireCheveux.slug}`} className="best2-card">
            <span className="best2-badge-bs">Bestseller</span>
            <div className="best2-img">
              <span className="best2-icon"><CategoryIcon category={cireCheveux.category} size={72} /></span>
            </div>
            <div className="best2-info">
              <div className="best2-cat">Coiffant · Tenue forte</div>
              <div className="best2-name">{cireCheveux.name}</div>
              <div className="best2-benef">{cireCheveux.benefit}</div>
              <span className="best2-price">{formatPrice(cireCheveux.price)}</span>
              <span className="best2-btn">Découvrir →</span>
            </div>
          </Link>

          {/* Shampooing Noir — Forte marge */}
          <Link href={`/products/${shampNoir.slug}`} className="best2-card">
            <span className="best2-badge-fm">Forte marge</span>
            <div className="best2-img">
              <span className="best2-icon"><CategoryIcon category={shampNoir.category} size={72} /></span>
            </div>
            <div className="best2-info">
              <div className="best2-cat">Soin colorant</div>
              <div className="best2-name">{shampNoir.name}</div>
              <div className="best2-benef">{shampNoir.benefit}</div>
              <span className="best2-price">{formatPrice(shampNoir.price)}</span>
              <span className="best2-btn">Découvrir →</span>
            </div>
          </Link>
        </div>
      </section>

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

      {/* ── BESOIN ── */}
      <section id="besoin">
        <div className="sec-head">
          <div>
            <div className="sec-ey">— Trouvez votre solution —</div>
            <h2 className="sec-title">QUEL EST VOTRE BESOIN ?</h2>
          </div>
        </div>
        <div className="prob-grid">
          <Link href="/products/cire-cheveux-premium" className="prob-card">
            <div className="prob-icon"><Scissors size={28} strokeWidth={1.4} /></div>
            <div className="prob-title">Cheveux difficiles à coiffer</div>
            <div className="prob-cta">Je veux mieux coiffer mes cheveux →</div>
          </Link>
          <Link href="/products/pack-barbe-complet" className="prob-card">
            <div className="prob-icon"><User size={28} strokeWidth={1.4} /></div>
            <div className="prob-title">Barbe sèche ou qui gratte</div>
            <div className="prob-cta">Je veux adoucir ma barbe →</div>
          </Link>
          <Link href="/products/shampooing-noir-colorant" className="prob-card">
            <div className="prob-icon"><Sparkles size={28} strokeWidth={1.4} /></div>
            <div className="prob-title">Cheveux blancs à masquer</div>
            <div className="prob-cta">Je veux masquer mes cheveux blancs →</div>
          </Link>
          <Link href="/products" className="prob-card">
            <div className="prob-icon"><Zap size={28} strokeWidth={1.4} /></div>
            <div className="prob-title">Routine capillaire complète</div>
            <div className="prob-cta">Je veux une routine complète →</div>
          </Link>
        </div>
      </section>

      {/* ── PRODUITS ── */}
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
                  <AddToCartButton product={product} className="pc-atc" label="Ajouter au panier" />
                </div>
                {SOCIAL_PROOF[product.id] && (
                  <div className="pc-social">🔥 {SOCIAL_PROOF[product.id]} achetés cette semaine</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

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

      {/* ── BARBIERS ── */}
      <section className="barbers-sec">
        <div className="sec-head">
          <div>
            <div className="sec-ey">— Recommandé par les experts —</div>
            <h2 className="sec-title">CHOIX DES BARBIERS</h2>
          </div>
        </div>
        <div className="barbers-grid">
          <div className="barber-card">
            <div className="barber-hd">
              <div className="barber-av"><Scissors size={18} strokeWidth={1.8} color="white" /></div>
              <div>
                <div className="barber-name-txt">Samy P.</div>
                <div className="barber-role-txt">Barbier · Fougères · 8 ans</div>
              </div>
            </div>
            <div className="barber-stars-txt">★★★★★</div>
            <p className="barber-quote-txt">
              &ldquo;La Cire Premium est mon indispensable. Tenue impeccable du matin au soir — je l&apos;utilise sur tous mes clients depuis des années.&rdquo;
            </p>
            <div className="barber-fav-txt">Produit favori : <strong>Cire Cheveux Premium</strong></div>
          </div>

          <div className="barber-card">
            <div className="barber-hd">
              <div className="barber-av"><Scissors size={18} strokeWidth={1.8} color="white" /></div>
              <div>
                <div className="barber-name-txt">Karim M.</div>
                <div className="barber-role-txt">Barbier · Rennes · 12 ans</div>
              </div>
            </div>
            <div className="barber-stars-txt">★★★★★</div>
            <p className="barber-quote-txt">
              &ldquo;Le Pack Barbe, c&apos;est exactement ce que je recommande à mes clients qui veulent entretenir leur barbe à la maison comme en salon.&rdquo;
            </p>
            <div className="barber-fav-txt">Produit favori : <strong>Pack Barbe Complet</strong></div>
          </div>

          <div className="barber-card">
            <div className="barber-hd">
              <div className="barber-av"><Scissors size={18} strokeWidth={1.8} color="white" /></div>
              <div>
                <div className="barber-name-txt">David L.</div>
                <div className="barber-role-txt">Barbier · Paris · 6 ans</div>
              </div>
            </div>
            <div className="barber-stars-txt">★★★★★</div>
            <p className="barber-quote-txt">
              &ldquo;Le Shampooing Noir est parfait pour raviver la couleur entre deux coupes. Aucun client ne revient sans vouloir en racheter.&rdquo;
            </p>
            <div className="barber-fav-txt">Produit favori : <strong>Shampooing Noir Colorant</strong></div>
          </div>
        </div>
      </section>

      {/* ── SALON ── */}
      <section id="salon" className="salon-compact">
        <div className="salon-compact-inner">
          <div style={{ flexShrink: 0 }}>
            <div className="salon-compact-icon"><Scissors size={36} strokeWidth={1.2} /></div>
          </div>
          <div>
            <div className="sec-ey">Salon Physique — Fougères</div>
            <h2 className="salon-compact-title">SP BARBER SHOP</h2>
            <p className="salon-compact-addr">
              48 Boulevard Jean Jaurès · 35300 Fougères<br />
              Lun–Sam 9h–19h
            </p>
            <Link href="/contact" className="salon-compact-link">En savoir plus →</Link>
          </div>
        </div>
      </section>

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
