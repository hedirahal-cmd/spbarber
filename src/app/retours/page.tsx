import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'Retours & Remboursements — SP Barber | Droit de Rétractation 14 Jours' },
  description:
    'Politique de retour SP Barber : droit de rétractation légal de 14 jours à compter de la réception. Produits cosmétiques descellés exclus pour raisons d\'hygiène.',
  alternates: { canonical: 'https://spbarber.fr/retours' },
}

export default function RetoursPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back"><Link href="/">← Retour à l&apos;accueil</Link></div>
        <h1 className="legal-h1">Retours & Remboursements</h1>

        <section className="legal-section">
          <h2>Droit de rétractation — 14 jours</h2>
          <p>
            Conformément aux articles L. 221-18 et suivants du Code de la consommation, vous disposez de <strong>14 jours calendaires</strong> à compter de la réception de votre commande pour nous informer de votre décision de vous rétracter, sans avoir à vous justifier, puis de <strong>14 jours</strong> à compter de votre message pour nous renvoyer le produit.
          </p>
        </section>

        <section className="legal-section">
          <h2>Comment faire un retour ?</h2>
          <ol>
            <li>
              Faites votre demande de rétractation <Link href="/retractation">directement en ligne</Link> (sans
              compte ni connexion), ou par e-mail à <strong>spbarbershopexploitation@hotmail.com</strong> avec votre numéro de commande.
            </li>
            <li>Nous vous communiquons les instructions de retour sous 24h.</li>
            <li>Renvoyez le produit dans son emballage d&apos;origine.</li>
            <li>Nous procédons au remboursement au plus tard 14 jours après avoir été informés de votre décision de rétractation (nous pouvons différer ce remboursement jusqu&apos;à réception du produit ou preuve d&apos;expédition).</li>
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
            <li>Le client informe SP Barber de sa décision de se rétracter dans les 14 jours suivant la réception, puis renvoie le produit au plus tard 14 jours après avoir communiqué cette décision.</li>
            <li>Vous pouvez manipuler le produit pour en vérifier la nature et les caractéristiques, comme vous le feriez en boutique — seule une dépréciation due à des manipulations allant au-delà de cette vérification reste à votre charge.</li>
            <li>Merci de le renvoyer dans son emballage d&apos;origine (boîte, notice, accessoires inclus).</li>
            <li>Exception d&apos;hygiène : les produits cosmétiques descellés ou ouverts ne peuvent pas être retournés (article L. 221-28 du Code de la consommation).</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Remboursement</h2>
          <p>
            Le remboursement intégral (prix du produit + frais de livraison initiaux) est effectué sur le moyen de paiement utilisé lors de la commande. Il intervient au plus tard <strong>14 jours</strong> à compter de la date à laquelle SP Barber est informé de votre décision de rétractation — nous pouvons différer ce remboursement jusqu&apos;à la réception du produit ou jusqu&apos;à ce que vous fournissiez une preuve d&apos;expédition.
          </p>
        </section>

        <div className="legal-contact">
          <strong>Initier un retour :</strong> spbarbershopexploitation@hotmail.com — mentionnez votre numéro de commande
        </div>
      </div>
    </div>
  )
}
