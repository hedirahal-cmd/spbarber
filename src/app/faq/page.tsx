import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ — SP Barber',
  description: 'Questions fréquentes sur les produits, la livraison et les commandes SP Barber.',
}

const FAQS = [
  {
    cat: 'Commandes & Paiement',
    items: [
      {
        q: 'Comment passer une commande ?',
        a: 'Ajoutez les produits souhaités au panier, puis cliquez sur "Valider ma commande". Vous serez redirigé vers notre page de paiement sécurisée Stripe. Aucun compte n\'est nécessaire.',
      },
      {
        q: 'Quels moyens de paiement acceptez-vous ?',
        a: 'Carte bancaire (Visa, Mastercard, Amex), PayPal, Apple Pay et Google Pay. Tous les paiements sont sécurisés via Stripe (certifié PCI DSS).',
      },
      {
        q: 'Puis-je modifier ou annuler ma commande ?',
        a: 'Contactez-nous dans les 2 heures suivant votre commande à contact@spbarber.fr. Passé ce délai, la commande est déjà en préparation et ne peut plus être modifiée.',
      },
      {
        q: 'Est-ce que je dois créer un compte pour commander ?',
        a: 'Non. Vous pouvez passer commande en tant qu\'invité sans créer de compte.',
      },
    ],
  },
  {
    cat: 'Livraison',
    items: [
      {
        q: 'Quel est le délai de livraison ?',
        a: 'Vos commandes sont expédiées sous 24-48h ouvrées. La livraison prend ensuite 3 à 5 jours ouvrés selon votre adresse.',
      },
      {
        q: 'La livraison est-elle gratuite ?',
        a: 'Oui, la livraison est offerte pour toute commande de 49 € ou plus. En dessous, les frais de port sont de 4,90 €.',
      },
      {
        q: 'Livrez-vous en dehors de France ?',
        a: 'Nous livrons en France métropolitaine, Belgique, Suisse et Luxembourg.',
      },
      {
        q: 'Comment suivre ma commande ?',
        a: 'Un e-mail de confirmation avec numéro de suivi vous est envoyé dès l\'expédition. Vous pouvez suivre votre colis directement sur le site du transporteur.',
      },
    ],
  },
  {
    cat: 'Produits',
    items: [
      {
        q: 'Les produits SP Barber conviennent-ils à tous les types de cheveux ?',
        a: 'Oui. La cire convient aux cheveux courts à mi-longs. La crème Curl est formulée pour les cheveux bouclés. Le shampooing noir s\'adapte aux cheveux blancs ou gris. Consultez la description de chaque produit pour plus de détails.',
      },
      {
        q: 'Quelle est la composition des produits ?',
        a: 'Tous nos produits sont formulés avec des ingrédients sélectionnés par des barbiers professionnels. La liste complète des ingrédients est disponible sur la fiche de chaque produit.',
      },
      {
        q: 'Puis-je utiliser la cire chaque jour ?',
        a: 'Oui, notre Cire Cheveux Premium est conçue pour une utilisation quotidienne. Elle ne laisse pas de résidus et se rince facilement au shampooing.',
      },
    ],
  },
  {
    cat: 'Retours & SAV',
    items: [
      {
        q: 'Puis-je retourner un produit si je ne suis pas satisfait ?',
        a: 'Oui, vous disposez de 30 jours pour retourner n\'importe quel produit et être remboursé intégralement, même si le produit a été ouvert.',
      },
      {
        q: 'J\'ai reçu un produit endommagé. Que faire ?',
        a: 'Contactez-nous sous 48h à contact@spbarber.fr avec une photo du produit endommagé. Nous vous renvoyons un nouveau produit sans frais.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back"><Link href="/">← Retour à l&apos;accueil</Link></div>
        <h1 className="legal-h1">FAQ</h1>
        <p className="legal-updated">Questions fréquentes</p>

        {FAQS.map((section) => (
          <section key={section.cat} className="legal-section">
            <h2>{section.cat}</h2>
            {section.items.map((item) => (
              <div key={item.q} style={{ marginBottom: 20 }}>
                <p style={{ fontWeight: 600, color: '#0c0c0c', marginBottom: 4 }}>
                  {item.q}
                </p>
                <p style={{ marginBottom: 0 }}>{item.a}</p>
              </div>
            ))}
          </section>
        ))}

        <div className="legal-contact">
          <strong>Vous ne trouvez pas votre réponse ?</strong> Écrivez-nous : contact@spbarber.fr
        </div>
      </div>
    </div>
  )
}
