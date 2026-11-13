import type { Product } from '@/types'

/**
 * FAQ generique affichee sur CHAQUE fiche produit (accordeon, voir
 * ProductFAQ.tsx) -- questions universelles (livraison, retours, paiement),
 * pas de contenu invente specifique a un produit. Reprend les memes reponses
 * que la page /faq pour rester coherent, sans dupliquer son contenu entier.
 *
 * Utilisee a la fois pour le rendu (ProductFAQ.tsx) et pour le JSON-LD FAQPage
 * (products/[slug]/page.tsx) -- une seule source, jamais deux copies qui
 * pourraient diverger.
 */
const SEUIL_LIVRAISON_OFFERTE = 5900

export function getProductFAQ(product: Product): { q: string; a: string }[] {
  const estTondeuse = product.category === 'tondeuse'

  return [
    {
      q: 'Quel est le délai de livraison ?',
      a: estTondeuse
        ? 'Cette tondeuse est envoyée directement par notre fournisseur : comptez environ 2 semaines de délai, colis séparé du reste de votre commande le cas échéant.'
        : 'Votre commande est préparée sous 2 jours ouvrés, puis livrée en 3 à 5 jours ouvrés selon votre adresse.',
    },
    {
      q: 'La livraison est-elle offerte ?',
      a: product.price >= SEUIL_LIVRAISON_OFFERTE
        ? 'Oui, ce produit à lui seul atteint le seuil de 59 € : la livraison est offerte.'
        : 'Elle l\'est dès 59 € d\'achat. En dessous de ce montant, les frais de port sont de 5,90 €.',
    },
    {
      q: 'Puis-je retourner ce produit ?',
      a: 'Oui, vous disposez de 14 jours à compter de la réception pour le retourner et être remboursé intégralement, même ouvert.',
    },
    {
      q: 'Quels moyens de paiement acceptez-vous ?',
      a: 'Carte bancaire (Visa, Mastercard, Amex), Apple Pay et Google Pay, via paiement sécurisé Stripe.',
    },
  ]
}
