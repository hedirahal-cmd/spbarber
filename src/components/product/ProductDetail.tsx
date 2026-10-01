'use client'
import { useState, useEffect, useRef, Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Product, ProductVariant } from '@/types'
import { imagesPourVariante } from '@/lib/products'
import { PaymentLogos } from '@/components/PaymentLogos'
import { AddToCartButton } from '@/components/AddToCartButton'
import { Lock, Truck, RotateCcw, CheckCircle2, AlertTriangle, ShoppingCart, Dumbbell, Sparkles, Leaf, FlaskConical, Scissors, Droplets, User, Zap, Clock, Waves, AlignJustify, Package, Wind, Cog, Package2, ChevronLeft, ChevronRight } from 'lucide-react'
import { BeforeAfterSlider, type BeforeAfterImage } from './BeforeAfterSlider'
import type { ReviewDisplay } from '@/lib/reviews'
import { ReviewsList } from '@/components/ReviewsList'
import { ReviewForm } from '@/components/ReviewForm'
import type { TrustItem, SiteContentBlock } from '@/lib/site-content'

const TRUST_ICONS: Record<string, ReactNode> = {
  trust_securise: <Lock size={20} strokeWidth={1.5} />,
  trust_livraison: <Truck size={20} strokeWidth={1.5} />,
  trust_retour: <RotateCcw size={20} strokeWidth={1.5} />,
  trust_france: <span style={{ fontSize: 20, lineHeight: 1 }}>🇫🇷</span>,
}

function getTomorrowLabel() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function CategoryIcon({ category, size = 64 }: { category: string; size?: number }) {
  if (category === 'coiffant') return <Scissors size={size} strokeWidth={1.2} />
  if (category === 'soin') return <Droplets size={size} strokeWidth={1.2} />
  if (category === 'barbe') return <User size={size} strokeWidth={1.2} />
  if (category === 'accessoire') return <Zap size={size} strokeWidth={1.2} />
  if (category === 'tondeuse') return <Cog size={size} strokeWidth={1.2} />
  return <Sparkles size={size} strokeWidth={1.2} />
}

function ProductIcon({ productId, size = 40 }: { productId: string; size?: number }) {
  if (productId === '1') return <Scissors   size={size} strokeWidth={1.2} />
  if (productId === '2') return <Droplets   size={size} strokeWidth={1.2} />
  if (productId === '3') return <Waves      size={size} strokeWidth={1.2} />
  if (productId === '4') return <AlignJustify size={size} strokeWidth={1.2} />
  if (productId === '5') return <Zap        size={size} strokeWidth={1.2} />
  if (productId === '6') return <Package    size={size} strokeWidth={1.2} />
  if (productId === '7') return <Wind       size={size} strokeWidth={1.2} />
  return <Scissors size={size} strokeWidth={1.2} />
}

const CATEGORY_LABELS: Record<string, string> = {
  coiffant: 'Coiffant',
  soin: 'Soin',
  barbe: 'Barbe',
  accessoire: 'Accessoire',
  tondeuse: 'Tondeuse',
}

const FREE_SHIP = 5900

// "Formule soignee", "Ingredients selectionnes"... n'a aucun sens sur un
// peigne ou une tondeuse -- ce bloc de 4 benefices etait fige et identique
// sur toutes les fiches produit, cosmetique ou non (2026-09-30, decision
// Hedi). Categories cosmetiques (formulees) vs outils/accessoires.
const CATEGORIES_COSMETIQUES = new Set(['coiffant', 'soin', 'barbe'])

function beneficesPourCategorie(category: string): { icon: ReactNode; titre: string; texte: string }[] {
  if (CATEGORIES_COSMETIQUES.has(category)) {
    return [
      { icon: <Dumbbell size={18} strokeWidth={1.6} />, titre: 'Qualité professionnelle', texte: "Les mêmes produits qu'en salon." },
      { icon: <Sparkles size={18} strokeWidth={1.6} />, titre: 'Résultats visibles', texte: 'Efficacité prouvée dès la première utilisation.' },
      { icon: <Leaf size={18} strokeWidth={1.6} />, titre: 'Formule soignée', texte: 'Ingrédients sélectionnés, sans compromis.' },
      { icon: <FlaskConical size={18} strokeWidth={1.6} />, titre: 'Testé par des barbiers', texte: 'Formulé et validé par des professionnels.' },
    ]
  }
  return [
    { icon: <Dumbbell size={18} strokeWidth={1.6} />, titre: 'Qualité professionnelle', texte: 'Le même matériel utilisé en salon.' },
    { icon: <Sparkles size={18} strokeWidth={1.6} />, titre: 'Résultats visibles', texte: 'Précision et efficacité dès la première utilisation.' },
    { icon: <Cog size={18} strokeWidth={1.6} />, titre: 'Fabrication soignée', texte: 'Matériaux robustes, conçus pour durer.' },
    { icon: <CheckCircle2 size={18} strokeWidth={1.6} />, titre: 'Testé par des barbiers', texte: 'Approuvé et utilisé par des professionnels.' },
  ]
}

type TondeuseContent = { pourquoiMarque: SiteContentBlock; delaiLivraison: SiteContentBlock; livraisonSeparee: SiteContentBlock } | null

export function ProductDetail({ product, relatedProducts = [], reviews: productReviews, trustItems, tondeuseContent = null, beforeImage = null, afterImage = null }: { product: Product; relatedProducts?: Product[]; reviews: ReviewDisplay[]; trustItems: TrustItem[]; tondeuseContent?: TondeuseContent; beforeImage?: BeforeAfterImage | null; afterImage?: BeforeAfterImage | null }) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  )
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [added, setAdded] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const atcRef = useRef<HTMLButtonElement>(null)
  const touchStartX = useRef<number | null>(null)
  const addItem = useCart((s) => s.addItem)
  const openCart = useCart((s) => s.openCart)
  const cartTotal = useCart((s) => s.total())
  const cartItems = useCart((s) => s.items)

  const price = selectedVariant?.price ?? product.price
  const remaining = Math.max(0, FREE_SHIP - cartTotal)

  // Confort d'affichage, pas la garantie : la vraie limite est revalidee cote
  // serveur au checkout (pricing.ts). Dropshipping (la Tondeuse) est hors de
  // ce systeme -- le fournisseur gere son propre stock.
  const dejaAuPanier = cartItems.find(
    (i) => i.product.id === product.id && i.variant?.id === selectedVariant?.id,
  )?.quantity ?? 0
  const stockEpuise = !product.is_dropshipping && dejaAuPanier >= product.stock
  const pct = Math.min(100, (cartTotal / FREE_SHIP) * 100)
  const tomorrow = getTomorrowLabel()

  // Calcule depuis les vrais avis recus en prop -- plus de chiffre code en dur.
  // Sans avis, la ligne de resume disparait plutot que d'afficher une valeur
  // inventee ; avec des avis, le libelle ne dit plus "verifies" au global
  // puisque tous ne le sont pas forcement (le badge par avis, lui, l'est).
  const hasReviews = productReviews.length > 0
  const avgRating = hasReviews ? productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length : 0
  const avgRatingLabel = avgRating.toFixed(1).replace('.', ',')

  // Le catalogue statique pointe toujours vers un chemin local qui n'existe pas
  // encore sur disque (aucune photo n'a ete deployee en dur) -- le meme test
  // que Stripe/JSON-LD distingue donc ici une vraie photo uploadee (URL
  // Supabase Storage, absolue) du placeholder statique.
  // Coloris (variantKind 'color') : la galerie se reduit aux photos de ce
  // coloris -- repli automatique sur la galerie complete si aucune ne
  // correspond (voir imagesPourVariante).
  const displayedImages = imagesPourVariante(product.images, selectedVariant)
  const hasGallery = displayedImages[0]?.url.startsWith('http') ?? false

  useEffect(() => {
    setSelectedPhoto(0)
  }, [product.id, selectedVariant?.id])

  useEffect(() => {
    const el = atcRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function handleAddToCart() {
    if (stockEpuise) return
    addItem(product, selectedVariant)
    openCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  // Bouclent (dernier -> premier et inversement) : meme convention que la
  // plupart des galeries e-commerce, evite une fleche visuellement "morte"
  // aux extremites.
  function photoPrecedente() {
    setSelectedPhoto((i) => (i - 1 + displayedImages.length) % displayedImages.length)
  }
  function photoSuivante() {
    setSelectedPhoto((i) => (i + 1) % displayedImages.length)
  }

  // Swipe tactile : seuil de 40px pour ignorer un simple tap/scroll vertical
  // accidentel, pas de librairie -- un seul geste horizontal a interpreter.
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    if (delta > 0) photoPrecedente(); else photoSuivante()
  }

  return (
    <div className="sn-page">

      {/* ── Hero 2 colonnes ── */}
      <section className="sn-hero">

        {/* Colonne gauche — photo + slider avant/apres + pastilles */}
        <div className="sn-hero-left">
          <div className="sn-hero-photo" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {hasGallery ? (
              <img
                src={displayedImages[selectedPhoto]?.url ?? displayedImages[0].url}
                alt={displayedImages[selectedPhoto]?.alt || product.name}
              />
            ) : (
              <>
                <CategoryIcon category={product.category} size={56} />
                <span>Photo produit</span>
              </>
            )}
            {product.stock <= 10 && product.stock > 0 && <span className="fi-tag">Dernières unités</span>}
            {hasGallery && displayedImages.length > 1 && (
              <>
                <button type="button" className="fi-gallery-arrow fi-gallery-arrow-prev" onClick={photoPrecedente} aria-label="Photo précédente">
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
                <button type="button" className="fi-gallery-arrow fi-gallery-arrow-next" onClick={photoSuivante} aria-label="Photo suivante">
                  <ChevronRight size={20} strokeWidth={2} />
                </button>
              </>
            )}
          </div>
          {hasGallery && displayedImages.length > 1 && (
            <div className="fi-thumbs">
              {displayedImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={idx === selectedPhoto ? 'fi-thumb fi-thumb-active' : 'fi-thumb'}
                  onClick={() => setSelectedPhoto(idx)}
                  aria-label={`Voir la photo ${idx + 1}`}
                >
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}

          {product.beforeAfterEnabled && (
            <BeforeAfterSlider bare className="sn-hero-slider" before={beforeImage} after={afterImage} />
          )}

          {product.pills && product.pills.length > 0 && (
            <div className="sn-pills">
              {product.pills.map((p) => (
                <span key={p} className="sn-pill">{p}</span>
              ))}
            </div>
          )}

          {trustItems.length > 0 && (
            <div className="trust-row">
              {trustItems.map((item) => {
                // Le repere "Livraison" est un texte unique partage par tous
                // les produits (3-5 jours ouvres) -- faux pour les tondeuses
                // (dropshipping, ~2 semaines) : on le remplace par leur propre
                // delai reel, deja edite depuis l'onglet Contenu.
                const texte = item.key === 'trust_livraison' && tondeuseContent?.delaiLivraison.visible && tondeuseContent.delaiLivraison.text
                  ? tondeuseContent.delaiLivraison.text
                  : item.text
                return (
                  <div className="trust-i" key={item.key}>
                    {TRUST_ICONS[item.key]}
                    <span>{texte}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Colonne droite — bloc achat */}
        <div className="sn-hero-right">
          <div className="sn-bc">
            <Link href="/">Accueil</Link>
            {' › '}
            <span>{product.name}</span>
          </div>

          <div className="sn-badge-cat">{CATEGORY_LABELS[product.category] ?? product.category}</div>

          <h1 className="sn-h1">{product.name}</h1>
          {product.benefit && <div className="sn-sub">{product.benefit}</div>}

          {/* Coloris -- menu deroulant, sous le nom du produit (2026-10-01,
              demande Hedi : plus de pastilles). Change la galerie photo (voir
              displayedImages) ; prix/stock identiques pour tous les choix
              (pas un vrai "modele", cf. variantKind). */}
          {product.variantKind === 'color' && product.variants && product.variants.length > 0 && (
            <div className="sn-colors">
              <label className="sn-colors-lbl" htmlFor="sn-color-select">Coloris</label>
              <select
                id="sn-color-select"
                className="sn-color-select"
                value={selectedVariant?.id}
                onChange={(e) => setSelectedVariant(product.variants!.find((v) => v.id === e.target.value))}
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="sn-stars-row">
            {hasReviews ? (
              <>
                <span className="sn-stars">{'★'.repeat(Math.round(avgRating))}</span>
                <span className="sn-stars-lbl">{avgRatingLabel}/5 · {productReviews.length} avis</span>
                <a href="#avis" className="sn-stars-lbl">Voir les avis →</a>
              </>
            ) : (
              <a href="#avis" className="sn-stars-lbl">Soyez le premier à donner votre avis →</a>
            )}
          </div>

          <div className="sn-price-block">
            <div className="sn-price">{formatPrice(price)}</div>
            <div className="sn-price-note">Prix TTC · Livraison offerte dès 59€</div>
          </div>

          {/* Variants modele/prix -- pas pour un coloris, qui a son propre
              selecteur (pastilles) plus haut, sous le nom du produit. */}
          {product.variants && product.variants.length > 0 && product.variantKind !== 'color' && (
            <div className="fi-vars">
              <div className="fi-var-lbl">Choisir le modèle</div>
              <div className="fi-var-btns">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    className={selectedVariant?.id === v.id ? 'fi-vara' : 'fi-var'}
                    onClick={() => setSelectedVariant(v)}
                  >
                    <span>{v.name}</span>
                    <span>{formatPrice(v.price ?? product.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Check-list — avant le CTA */}
          {product.trust && product.trust.length > 0 && (
            <div className="sn-check-list">
              {product.trust.map((item, i) => (
                <div key={i} className="sn-check">
                  <CheckCircle2 size={14} strokeWidth={2} />
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Tondeuse (dropshipping manuel) : delai reel plutot que la
              promesse 48h/lendemain, qui serait fausse pour ce produit. */}
          {tondeuseContent ? (
            <>
              <div className="sn-stock">
                <CheckCircle2 size={13} strokeWidth={2} />Disponible
              </div>
              {tondeuseContent.delaiLivraison.visible && tondeuseContent.delaiLivraison.text && (
                <div className="fi-urgence">
                  <Clock size={12} strokeWidth={2} />
                  {tondeuseContent.delaiLivraison.text}
                </div>
              )}
              {tondeuseContent.livraisonSeparee.visible && tondeuseContent.livraisonSeparee.text && (
                <div className="fi-urgence">
                  <Package2 size={12} strokeWidth={2} />
                  {tondeuseContent.livraisonSeparee.text}
                </div>
              )}
            </>
          ) : (
            <>
              {product.stock > 0 ? (
                <div className="sn-stock">
                  <CheckCircle2 size={13} strokeWidth={2} />
                  En stock — Commandez avant 16h, expédié {tomorrow}
                  {product.stock <= 10 && <span className="stock-urgent">Seulement {product.stock} restants</span>}
                </div>
              ) : (
                <div className="stock-warn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} strokeWidth={2} />Stock limité</div>
              )}
            </>
          )}

          <button
            ref={atcRef}
            className={`sn-atc${added ? ' sn-atc-added' : ''}`}
            onClick={handleAddToCart}
            disabled={stockEpuise}
            style={stockEpuise && !added ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {added
              ? <>✓ Ajouté au panier !</>
              : stockEpuise
                ? 'Rupture de stock'
                : <><ShoppingCart size={16} strokeWidth={2} />Ajouter au panier</>}
          </button>

          {/* Mini progress */}
          <div className="sn-prog">
            <div className="sn-prog-msg">
              {remaining > 0
                ? <>Plus que <strong>{(remaining / 100).toFixed(2).replace('.', ',')} €</strong> pour la livraison offerte</>
                : <><strong>Livraison offerte !</strong></>
              }
            </div>
            <div className="sn-prog-track">
              <div className="sn-prog-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Logos paiement */}
          <PaymentLogos />

        </div>
      </section>

      {/* ── Description + benefices ── */}
      <section className="sn-pd-sec">
        <div className="sn-pd-right">
          <div className="sn-desc-ttl">Description</div>
          <p className="sn-desc-txt">{product.description}</p>
          {tondeuseContent?.pourquoiMarque.visible && tondeuseContent.pourquoiMarque.text && (
            <>
              <div className="sn-desc-ttl" style={{ marginTop: 20 }}>Pourquoi cette marque</div>
              <p className="sn-desc-txt">{tondeuseContent.pourquoiMarque.text}</p>
            </>
          )}

          <div className="sn-bens">
            {beneficesPourCategorie(product.category).map((b) => (
              <div className="sn-ben" key={b.titre}>
                <div className="sn-ben-icon">{b.icon}</div>
                <div>
                  <div className="sn-ben-title">{b.titre}</div>
                  <div className="sn-ben-sub">{b.texte}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comment ça fonctionne — propre a certains produits ── */}
      {product.usageSteps && product.usageSteps.length > 0 && (
        <section className="sn-how">
          <div className="sn-how-inner">
            <div className="sn-how-eyebrow">— Mode d&apos;emploi —</div>
            <h2 className="sn-how-title">COMMENT ÇA FONCTIONNE</h2>
            <div className="sn-how-steps">
              {product.usageSteps.map((step, i) => (
                <Fragment key={step.label}>
                  <div className="sn-step">
                    <div className="sn-step-num">{i + 1}</div>
                    <div className="sn-step-label">{step.label}</div>
                    <div className="sn-step-desc">{step.texte}</div>
                  </div>
                  {i < product.usageSteps!.length - 1 && (
                    <div className="sn-step-arrow" aria-hidden="true">&#8594;</div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Avis clients — filtres a ce produit */}
      <div id="avis" className="fi-revs-sec">
        {hasReviews && (
          <div className="fi-revs-head">
            <div>
              <div className="fi-score-n">{avgRatingLabel}</div>
              <div className="fi-score-s">{'★'.repeat(Math.round(avgRating))}</div>
              <div className="fi-score-c">{productReviews.length} avis</div>
            </div>
          </div>
        )}
        <ReviewsList reviews={productReviews} variant="product" emptyMessage="Aucun avis pour le moment sur ce produit — soyez le premier à en laisser un." />
        <ReviewForm productId={product.id} />
      </div>

      {/* Complétez votre routine */}
      {relatedProducts.length > 0 && (
        <div className="sac-sec">
          <div className="sac-hd">
            <div className="sac-ttl">COMPLÉTEZ VOTRE ROUTINE</div>
            <div className="sac-sub">Notre sélection pour compléter votre routine</div>
          </div>
          <div className="sac-grid">
            {relatedProducts.map((rp) => (
              <div key={rp.id} className="sac-card">
                <Link href={`/products/${rp.slug}`} className="sac-card-link">
                  <div className="sac-img">
                    <div className="sac-icon-ring">
                      <ProductIcon productId={rp.id} size={56} />
                    </div>
                  </div>
                  <div className="sac-info">
                    <div className="sac-cat">{CATEGORY_LABELS[rp.category] ?? rp.category}</div>
                    {rp.benefit && <div className="sac-benefit">{rp.benefit}</div>}
                    <div className="sac-name">{rp.name}</div>
                    <div className="sac-price">{formatPrice(rp.price)}</div>
                  </div>
                </Link>
                {!rp.is_dropshipping && (
                  <AddToCartButton product={rp} className="sac-atc" label="Ajouter au panier" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky ATC mobile — apparaît quand le bouton principal sort du viewport */}
      {stickyVisible && product.stock > 0 && (
        <div className="fi-sticky-atc">
          <div className="fi-sticky-info">
            <span className="fi-sticky-name">{product.name}</span>
            <span className="fi-sticky-price">{formatPrice(price)}</span>
          </div>
          <button
            className="fi-sticky-btn"
            onClick={handleAddToCart}
            disabled={stockEpuise}
            style={stockEpuise ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <ShoppingCart size={14} strokeWidth={2} />
            {added ? 'Ajouté !' : stockEpuise ? 'Rupture de stock' : 'Ajouter au panier'}
          </button>
        </div>
      )}
    </div>
  )
}
