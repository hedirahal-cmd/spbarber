import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Retours & Remboursements — SP Barber',
  description: 'Politique de retour SP Barber : 30 jours satisfait ou remboursé.',
}

export default function RetoursPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back"><Link href="/">← Retour à l&apos;accueil</Link></div>
        <h1 className="legal-h1">Retours & Remboursements</h1>

        <section className="legal-section">
          <h2>Garantie 30 jours satisfait ou remboursé</h2>
          <p>
            SP Barber vous offre <strong>30 jours pour changer d&apos;avis</strong>. Si vous n&apos;êtes pas entièrement satisfait de votre achat, retournez-le et nous vous remboursons intégralement, sans questions.
          </p>
        </section>

        <section className="legal-section">
          <h2>Comment faire un retour ?</h2>
          <ol>
            <li>Envoyez un e-mail à <strong>contact@spbarber.fr</strong> avec votre numéro de commande.</li>
            <li>Nous vous communiquons les instructions de retour sous 24h.</li>
            <li>Renvoyez le produit dans son emballage d&apos;origine.</li>
            <li>Dès réception, nous procédons au remboursement sous 5 à 10 jours ouvrés.</li>
          </ol>
        </section>

        <section className="legal-section">
          <h2>Frais de retour</h2>
          <p>
            Les frais de retour sont à votre charge, sauf en cas de produit défectueux ou d&apos;erreur de notre part, auquel cas nous prenons en charge l&apos;intégralité des frais.
          </p>
        </section>

        <section className="legal-section">
          <h2>Conditions de retour</h2>
          <ul>
            <li>Produit retourné dans les 30 jours suivant la réception.</li>
            <li>Produit dans son emballage d&apos;origine (boîte, notice, accessoires inclus).</li>
            <li>Pour les produits déjà ouverts ou utilisés, la garantie satisfait ou remboursé s&apos;applique quand même — c&apos;est notre engagement qualité.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Remboursement</h2>
          <p>
            Le remboursement est effectué sur le moyen de paiement utilisé lors de la commande (carte bancaire, PayPal, etc.) dans un délai de <strong>5 à 10 jours ouvrés</strong> après réception du retour.
          </p>
        </section>

        <div className="legal-contact">
          <strong>Initier un retour :</strong> contact@spbarber.fr — mentionnez votre numéro de commande
        </div>
      </div>
    </div>
  )
}
