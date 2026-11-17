import { ImageResponse } from 'next/og'
import { ImageContenuSocial } from '@/lib/og-image-content'

export const alt = 'SP Barber — Produits Capillaires Premium pour Hommes'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  return new ImageResponse(ImageContenuSocial(), { ...size })
}
