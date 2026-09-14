import { PRODUCTS } from '@/lib/products'

/**
 * Valide qu'une note est un entier entre 1 et 5, rend la valeur numeree si
 * valide, null sinon. Partagee entre la route admin (/api/admin/reviews) et
 * la future route publique du bloc B (/api/reviews) -- une seule regle,
 * jamais deux copies qui pourraient diverger.
 *
 * Rejette plutot que de clamper ou de retomber sur une valeur par defaut :
 * une note hors bornes s'enregistrait autrefois telle quelle, et
 * '★'.repeat(NaN) plante l'affichage de tout le tableau d'avis, pas
 * seulement la ligne fautive.
 */
export function noteValide(rating: unknown): number | null {
  const n = Number(rating)
  if (!Number.isInteger(n) || n < 1 || n > 5) return null
  return n
}

export interface ReviewDisplay {
  id: string
  text: string
  name: string
  initials: string
  color: string
  product: string
  date: string
  rating: number
  verified: boolean
}

const AVATAR_COLORS = ['#3a5a8a', '#8a3a5a', '#3a8a5a', '#5a3a8a', '#8a6a3a', '#3a7a8a']

function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0 }
  return h
}

/** Noms resolus depuis PRODUCTS -- jamais stockes en double, toujours a jour meme si un produit est renomme. */
export function resolveProductNames(ids: unknown): string {
  if (!Array.isArray(ids) || ids.length === 0) return ''
  return ids
    .map((id) => PRODUCTS.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n)
    .join(', ')
}

/**
 * Transforme une ligne Supabase brute en forme d'affichage, partagee entre
 * l'accueil (tous les avis) et les fiches produit (avis filtres par produit).
 * Un seul mappage, pour que les deux endroits restent coherents (etoiles
 * reelles, badge verifie reel -- pas les valeurs figees d'avant ce bloc).
 */
export function toReviewDisplay(r: Record<string, unknown>): ReviewDisplay {
  const author = (r.author as string) ?? ''
  const productIds = r.product_ids
  return {
    id: String(r.id ?? ''),
    text: `"${r.text}"`,
    name: author,
    initials: author.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2),
    color: AVATAR_COLORS[strHash(author) % AVATAR_COLORS.length],
    product: Array.isArray(productIds) && productIds.length > 0
      ? resolveProductNames(productIds)
      : (r.product_name as string) ?? '',
    date: r.created_at ? new Date(r.created_at as string).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '',
    rating: noteValide(r.rating) ?? 5,
    verified: !!r.verified,
  }
}
