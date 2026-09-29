import type { ReviewDisplay } from '@/lib/reviews'

/**
 * Grille d'avis partagee entre l'accueil (tous les avis, fond noir, classes
 * h-rev-*) et les fiches produit (avis filtres par produit, classes fi-rev-*
 * -- un style deja present dans globals.css mais jusqu'ici jamais connecte a
 * aucun composant). Etoiles et badge "Achat verifie" reflechissent desormais
 * les vraies donnees (rating, verified), plus des valeurs figees.
 */
export function ReviewsList({
  reviews,
  variant,
  emptyMessage,
}: {
  reviews: ReviewDisplay[]
  variant: 'home' | 'product'
  emptyMessage?: string
}) {
  if (reviews.length === 0) {
    // variant "home" vit sur un fond sombre (.h-reviews) -- le texte par
    // defaut (couleur du body, sombre) y serait quasi invisible ; ce chemin
    // n'a jamais ete visuellement verifie avant que le repli sur de faux avis
    // soit retire (reviews.length n'etait alors jamais vide sur l'accueil).
    return emptyMessage
      ? <p style={{ fontSize: 13, opacity: 0.6, margin: 0, color: variant === 'home' ? 'rgba(248,246,243,.9)' : undefined }}>{emptyMessage}</p>
      : null
  }

  if (variant === 'product') {
    return (
      <div className="fi-rev-grid">
        {reviews.map((r) => (
          <div key={r.id} className="fi-rev">
            <div className="fi-rev-stars">{'★'.repeat(r.rating)}</div>
            <p>{r.text}</p>
            <div className="fi-rev-auth">
              <div className="fi-rev-av">{r.initials}</div>
              <div>
                <b>{r.name}</b>
                <small>{r.product}{r.product && r.date ? ' · ' : ''}{r.date}</small>
                {r.verified && <div className="fi-rev-check">✓ Achat vérifié</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-rev-grid">
      {reviews.map((r) => (
        <div key={r.id} className="h-rev-card">
          <div className="h-rev-stars">{'★'.repeat(r.rating)}</div>
          <p className="h-rev-text">{r.text}</p>
          <div className="h-rev-auth">
            <div className="h-rev-av" style={{ background: r.color }}>{r.initials}</div>
            <div>
              <div className="h-rev-name">{r.name}</div>
              <div className="h-rev-meta">{r.product}{r.product && ' · '}{r.date}</div>
              {r.verified && <div className="h-rev-check">✓ Achat vérifié</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
