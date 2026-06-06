import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact SP Barber — Barbier Fougères 35300 | Réponse sous 24h',
  description:
    'Contactez SP Barber : contact@spbarber.fr ou visitez notre salon barbier à Fougères (35300). Réponse sous 24h ouvrées, lundi au samedi.',
  alternates: { canonical: 'https://spbarber.fr/contact' },
  openGraph: {
    title: 'Contact SP Barber — Fougères',
    description: 'E-mail ou salon physique. Réponse sous 24h ouvrées.',
    url: 'https://spbarber.fr/contact',
  },
}

export default function ContactPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back"><Link href="/">← Retour à l&apos;accueil</Link></div>
        <h1 className="legal-h1">Contact</h1>

        <section className="legal-section">
          <h2>Service Client</h2>
          <p>
            Pour toute question relative à votre commande, un produit ou un retour, contactez-nous par e-mail :
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#b8903a' }}>
            contact@spbarber.fr
          </p>
          <p>Nous répondons sous 24h ouvrées, du lundi au samedi.</p>
        </section>

        <section className="legal-section">
          <h2>Salon SP Barber — Fougères</h2>
          <p>
            Retrouvez-nous également en boutique physique :
          </p>
          <p>
            <strong>SP Barber</strong><br />
            48 Boulevard Jean Jaurès<br />
            35300 Fougères, France
          </p>
          <p>
            <strong>Horaires :</strong> Lundi – Samedi, 9h – 19h
          </p>
        </section>

        <section className="legal-section">
          <h2>Questions fréquentes</h2>
          <p>
            Avant de nous contacter, consultez notre <Link href="/faq">FAQ</Link> — vous y trouverez peut-être la réponse en quelques secondes.
          </p>
          <ul>
            <li><Link href="/livraison">Informations livraison</Link></li>
            <li><Link href="/retours">Politique de retour</Link></li>
            <li><Link href="/cgv">Conditions générales de vente</Link></li>
          </ul>
        </section>

        <div className="legal-contact">
          <strong>E-mail :</strong> contact@spbarber.fr &nbsp;·&nbsp; <strong>Adresse :</strong> 48 Bd Jean Jaurès, 35300 Fougères
        </div>
      </div>
    </div>
  )
}
