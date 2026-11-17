import { ImageResponse } from 'next/og'
import { ImageContenuSocial } from '@/lib/og-image-content'

/**
 * MEME image que opengraph-image.tsx (2026-11-17, demande Hedi) -- une
 * seule source (ImageContenuSocial), pour que la carte Twitter/X et les
 * aperçus Facebook/LinkedIn ne divergent plus. Sans ce fichier, Next.js
 * retombait sur `metadata.twitter.images` (layout.tsx) -- l'ancien fichier
 * statique og-default.jpg, dont la reference est desormais retiree de
 * layout.tsx (devenue inutile pour ce role, voir son commentaire).
 */
export const alt = 'SP Barber — Produits Capillaires Premium pour Hommes'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function TwitterImage() {
  return new ImageResponse(ImageContenuSocial(), { ...size })
}
