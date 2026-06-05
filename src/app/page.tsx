import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import { AddToCartButton } from '@/components/AddToCartButton'
import { formatPrice } from '@/lib/utils'

const CATEGORY_ICONS: Record<string, string> = {
  coiffant: '🪮',
  soin: '🧴',
  barbe: '🧔',
  accessoire: '⚡',
}

const CATEGORY_LABELS: Record<string, string> = {
  coiffant: 'Coiffant',
  soin: 'Soin',
  barbe: 'Barbe',
  accessoire: 'Accessoire',
}

export default function HomePage() {
  const packBarbe = PRODUCTS.find((p) => p.id === '5')!
  const shampNoir = PRODUCTS.find((p) => p.id === '2')!
  const featured = PRODUCTS.filter((p) => p.id !== '5' && p.id !== '2').slice(0, 6)

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
            Produits professionnels<em>pour cheveux & barbe.</em>
          </h1>

          <p className="h-sub">
            Les soins utilisés par les meilleurs barbiers pour un résultat impeccable à la maison.
          </p>

          <div className="h-ctas">
            <Link href="/products" className="btn-hero-primary">
              Acheter maintenant
              <span className="btn-hero-arrow">→</span>
            </Link>
          </div>

          <div className="hero-trust-checks">
            <span className="hero-check-item"><span className="hero-check-v">✓</span> Livraison rapide</span>
            <span className="hero-check-item"><span className="hero-check-v">✓</span> Paiement sécurisé</span>
            <span className="hero-check-item"><span className="hero-check-v">✓</span> Sélectionnés par des pros</span>
          </div>
        </div>
      </section>

      {/* ── NOS 2 BESTSELLERS ── */}
      <section className="best2-sec">
        <div className="best2-head sec-head">
          <div>
            <div className="sec-ey">— Les incontournables —</div>
            <h2 className="sec-title">NOS 2 BESTSELLERS</h2>
          </div>
        </div>
        <div className="best2-grid">
          {/* Pack Barbe — Meilleure vente */}
          <Link href={`/products/${packBarbe.slug}`} className="best2-card">
            <span className="best2-badge-mv">Meilleure vente</span>
            <div className="best2-img">
              <span className="best2-icon">{CATEGORY_ICONS[packBarbe.category] ?? '🎁'}</span>
            </div>
            <div className="best2-info">
              <div className="best2-cat">Pack complet</div>
              <div className="best2-name">{packBarbe.name}</div>
              <div className="best2-benef">{packBarbe.benefit}</div>
              <span className="best2-price">{formatPrice(packBarbe.price)}</span>
              <span className="best2-btn">Voir le pack →</span>
            </div>
          </Link>

          {/* Shampooing Noir — Forte marge */}
          <Link href={`/products/${shampNoir.slug}`} className="best2-card">
            <span className="best2-badge-fm">Forte marge</span>
            <div className="best2-img">
              <span className="best2-icon">{CATEGORY_ICONS[shampNoir.category] ?? '🧴'}</span>
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
        <div className="rea-c-item">🚚 Livraison offerte dès 49€</div>
        <div className="rea-c-sep">|</div>
        <div className="rea-c-item">🎁 Cadeau dès 70€</div>
        <div className="rea-c-sep">|</div>
        <div className="rea-c-item">↩️ Retour 30j</div>
        <div className="rea-c-sep">|</div>
        <div className="rea-c-item">⚡ Expédié 48h</div>
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
            <div className="prob-icon">💆‍♂️</div>
            <div className="prob-title">Cheveux difficiles à coiffer</div>
            <div className="prob-cta">Voir les solutions →</div>
          </Link>
          <Link href="/products/pack-barbe-complet" className="prob-card">
            <div className="prob-icon">🧔</div>
            <div className="prob-title">Barbe sèche ou qui gratte</div>
            <div className="prob-cta">Voir les solutions →</div>
          </Link>
          <Link href="/products/shampooing-noir-colorant" className="prob-card">
            <div className="prob-icon">✨</div>
            <div className="prob-title">Cheveux blancs à masquer</div>
            <div className="prob-cta">Voir les solutions →</div>
          </Link>
          <Link href="/products" className="prob-card">
            <div className="prob-icon">⚡</div>
            <div className="prob-title">Routine capillaire complète</div>
            <div className="prob-cta">Voir les packs →</div>
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
                    <span className="pc-icon">{CATEGORY_ICONS[product.category] ?? '✨'}</span>
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
              <span className="kit-r-icon">🎁</span>
              <div className="kit-r-badge">
                <strong>5</strong>
                <span>produits inclus</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="stats">
        <div className="stat">
          <div className="stat-n">500+</div>
          <div className="stat-l">Avis vérifiés</div>
        </div>
        <div className="stat">
          <div className="stat-n">100%</div>
          <div className="stat-l">Qualité Pro</div>
        </div>
        <div className="stat">
          <div className="stat-n">48h</div>
          <div className="stat-l">Livraison</div>
        </div>
        <div className="stat">
          <div className="stat-n">France</div>
          <div className="stat-l">Livraison</div>
        </div>
      </div>

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
              <div className="barber-av">✂️</div>
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
              <div className="barber-av">🪒</div>
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
              <div className="barber-av">💈</div>
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
            <div className="salon-compact-icon">✂️</div>
          </div>
          <div>
            <div className="sec-ey">Salon Physique — Fougères</div>
            <h2 className="salon-compact-title">SP BARBER SHOP</h2>
            <p className="salon-compact-addr">
              48 Boulevard Jean Jaurès · 35300 Fougères<br />
              Lun–Sam 9h–19h
            </p>
            <a href="#" className="salon-compact-link">En savoir plus →</a>
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
        <div className="h-rev-grid">
          <div className="h-rev-card">
            <div className="h-rev-stars">★★★★★</div>
            <p className="h-rev-text">
              &quot;La cire tient toute la journée. Mes potes me demandent tous ce que j&apos;utilise.&quot;
            </p>
            <div className="h-rev-auth">
              <div className="h-rev-av">👨🏾</div>
              <div>
                <div className="h-rev-name">Karim B.</div>
                <div className="h-rev-check">✓ Achat vérifié</div>
              </div>
            </div>
          </div>
          <div className="h-rev-card">
            <div className="h-rev-stars">★★★★★</div>
            <p className="h-rev-text">
              &quot;Le pack barbe est parfait. Qualité vraiment pro, rien à voir avec la grande surface.&quot;
            </p>
            <div className="h-rev-auth">
              <div className="h-rev-av">👩</div>
              <div>
                <div className="h-rev-name">Amélie D.</div>
                <div className="h-rev-check">✓ Achat vérifié</div>
              </div>
            </div>
          </div>
          <div className="h-rev-card">
            <div className="h-rev-stars">★★★★★</div>
            <p className="h-rev-text">
              &quot;La crème curl définit mes boucles sans les alourdir. Enfin un vrai produit pour cheveux texturés !&quot;
            </p>
            <div className="h-rev-auth">
              <div className="h-rev-av">👨🏿</div>
              <div>
                <div className="h-rev-name">Marcus T.</div>
                <div className="h-rev-check">✓ Achat vérifié</div>
              </div>
            </div>
          </div>
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
