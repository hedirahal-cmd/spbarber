import type { Product } from '@/types'
import { estProduitCosmetique } from '@/lib/products'
import { DELAI_EXPEDITION_FRAGMENT, TRANSIT_TEXTE_PROSE } from '@/lib/delais'

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
        : `Votre commande est préparée ${DELAI_EXPEDITION_FRAGMENT}, puis livrée en ${TRANSIT_TEXTE_PROSE} selon votre adresse.`,
    },
    {
      q: 'La livraison est-elle offerte ?',
      a: product.price >= SEUIL_LIVRAISON_OFFERTE
        ? 'Oui, ce produit à lui seul atteint le seuil de 59 € : la livraison est offerte.'
        : 'Elle l\'est dès 59 € d\'achat. En dessous de ce montant, les frais de port sont de 5,90 €.',
    },
    {
      q: 'Puis-je retourner ce produit ?',
      a: estProduitCosmetique(product.category)
        ? 'Oui, vous disposez de 14 jours à compter de la réception pour changer d\'avis et le retourner, à condition qu\'il n\'ait pas été descellé ni utilisé (raisons d\'hygiène, article L. 221-28 du Code de la consommation).'
        : 'Oui, vous disposez de 14 jours à compter de la réception pour changer d\'avis et le retourner, dans son emballage d\'origine et non utilisé.',
    },
    {
      q: 'Quels moyens de paiement acceptez-vous ?',
      a: 'Carte bancaire (Visa, Mastercard, Amex), Apple Pay et Google Pay, via paiement sécurisé Stripe.',
    },
  ]
}
