import type { Metadata } from 'next'
import { Bebas_Neue, DM_Sans, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/CartDrawer'
import { SessionInit } from '@/components/SessionInit'

/* ── Fonts via next/font (pas de requête externe, display=swap automatique) ── */
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fd',
  preload: true,
})

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fb',
  preload: true,
})

const cormorantGaramond = Cormorant_Garamond({
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fs',
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://spbarber.fr'),
  title: {
    default: 'SP Barber — Produits Capillaires Premium pour Hommes | Livraison 48h',
    template: '%s | SP Barber',
  },
  description:
    'SP Barber — les formules professionnelles des barbiers, livrées chez vous en 48h. Cire cheveux, shampooing colorant, pack barbe, tondeuse. Livraison offerte dès 49€.',
  keywords: [
    'produits capillaires homme',
    'cire cheveux homme',
    'shampooing colorant noir homme',
    'pack barbe complet',
    'tondeuse dégradé',
    'barbier Fougères',
    'produits coiffure homme',
    'soin cheveux homme',
  ],
  alternates: {
    canonical: 'https://spbarber.fr',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://spbarber.fr',
    siteName: 'SP Barber',
    title: 'SP Barber — Produits Capillaires Premium pour Hommes',
    description:
      'Les formules professionnelles des barbiers, livrées chez vous en 48h. Livraison offerte dès 49€.',
    images: [
      {
        url: 'https://spbarber.fr/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'SP Barber — Produits capillaires premium pour hommes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SP Barber — Produits Capillaires Premium pour Hommes',
    description: 'Les formules pro des barbiers, livrées en 48h. Livraison offerte dès 49€.',
    images: ['https://spbarber.fr/og-default.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${bebasNeue.variable} ${dmSans.variable} ${cormorantGaramond.variable}`}
    >
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <CartDrawer />
        <SessionInit />
      </body>
    </html>
  )
}
