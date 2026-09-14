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
