import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Livraison — SP Barber',
  description: 'Informations livraison SP Barber : délais, frais, suivi et zones desservies.',
}

export default function LivraisonPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back"><Link href="/">← Retour à l&apos;accueil</Link></div>
        <h1 className="legal-h1">Livraison</h1>

        <section className="legal-section">
          <h2>Livraison offerte dès 49 €</h2>
          <p>
            La livraison est <strong>offerte pour toute commande égale ou supérieure à 49 €</strong>. En dessous de ce seuil, les frais de port s&apos;élèvent à 4,90 €.
          </p>
        </section>

        <section className="legal-section">
          <h2>Délais</h2>
          <ul>
            <li><strong>Traitement :</strong> commande traitée sous 24h ouvrées après confirmation du paiement.</li>
            <li><strong>Expédition :</strong> envoi sous 24 à 48h ouvrées.</li>
            <li><strong>Livraison :</strong> 3 à 5 jours ouvrés selon le transporteur et la destination.</li>
          </ul>
          <p>Un e-mail de confirmation d&apos;expédition avec numéro de suivi vous est envoyé dès la prise en charge par le transporteur.</p>
        </section>

        <section className="legal-section">
          <h2>Zones desservies</h2>
          <ul>
            <li>France métropolitaine</li>
            <li>Belgique</li>
            <li>Suisse</li>
            <li>Luxembourg</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Transporteurs</h2>
          <p>Vos commandes sont expédiées via Colissimo ou Chronopost selon le poids et la destination. Un numéro de suivi vous est communiqué par e-mail.</p>
        </section>

        <section className="legal-section">
          <h2>Colis endommagé ou perdu</h2>
          <p>
            En cas de colis endommagé à la réception, notez les dommages en présence du livreur et contactez-nous sous 48h à <strong>contact@spbarber.fr</strong>.
          </p>
          <p>
            En cas de non-livraison après 15 jours ouvrés, contactez-nous : nous ouvrirons une enquête auprès du transporteur et vous proposerons un réenvoi ou un remboursement complet.
          </p>
        </section>

        <div className="legal-contact">
          <strong>Une question sur votre livraison ?</strong> Contactez-nous : contact@spbarber.fr
        </div>
      </div>
    </div>
  )
}
