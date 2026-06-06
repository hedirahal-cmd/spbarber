import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/CartDrawer'

export const metadata: Metadata = {
  metadataBase: new URL('https://spbarber.fr'),
  title: {
    default: 'SP Barber — Le Style Commence Ici',
    template: '%s | SP Barber',
  },
  description: 'SP Barber, la référence des produits capillaires premium pour hommes. Cire, shampooing, crème, tondeuse. Livraison rapide en France.',
  keywords: ['barber', 'produits capillaires', 'homme', 'cire cheveux', 'tondeuse', 'soin cheveux'],
  alternates: { canonical: 'https://spbarber.fr' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://spbarber.fr',
    siteName: 'SP Barber',
    title: 'SP Barber — Le Style Commence Ici',
    description: 'La référence des produits capillaires premium pour hommes.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  )
}
