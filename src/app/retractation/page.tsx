import type { Metadata } from 'next'
import Link from 'next/link'
import { RetractationForm } from '@/components/RetractationForm'

export const metadata: Metadata = {
  title: { absolute: 'Droit de rétractation — SP Barber' },
  description: 'Faites votre demande de rétractation en ligne, sans compte ni connexion nécessaire.',
  alternates: { canonical: 'https://spbarber.fr/retractation' },
}

export default function RetractationPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back"><Link href="/">← Retour à l&apos;accueil</Link></div>
        <h1 className="legal-h1">Droit de rétractation</h1>

        <section className="legal-section">
          <p>
            Conformément au Code de la consommation, vous disposez d&apos;un délai de <strong>14 jours</strong> à compter de la réception de votre commande pour exercer votre droit de rétractation, sans avoir à justifier de motif. SP Barber va au-delà de ce minimum légal avec sa garantie <Link href="/retours">30 jours satisfait ou remboursé</Link>.
          </p>
          <p>
            Pour exercer ce droit, remplissez le formulaire ci-dessous — aucun compte ni connexion n&apos;est nécessaire. Vous recevrez une confirmation par e-mail dès l&apos;envoi.
          </p>
        </section>

        <section className="legal-section">
          <RetractationForm />
        </section>
      </div>
    </div>
  )
}
