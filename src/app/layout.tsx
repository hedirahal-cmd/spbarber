import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://spbarber.fr'),
  title: {
    default: 'SP Barber — Produits Capillaires Premium pour Hommes',
    template: '%s | SP Barber',
  },
  description: 'SP Barber, la référence des produits capillaires premium pour hommes. Cire, shampooing, crème, tondeuse. Livraison rapide en France.',
  keywords: ['barber', 'produits capillaires', 'homme', 'cire cheveux', 'tondeuse', 'soin cheveux'],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://spbarber.fr',
    siteName: 'SP Barber',
    title: 'SP Barber — Produits Capillaires Premium pour Hommes',
    description: 'La référence des produits capillaires premium pour hommes.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://spbarber.fr' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
