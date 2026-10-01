import { loadStripe, type Stripe } from '@stripe/stripe-js'

/**
 * Chargement unique du SDK Stripe cote navigateur -- a l usage du paiement
 * express (Apple Pay / Google Pay) sur la fiche produit. Le Checkout classique
 * (panier/`/api/stripe/checkout`) n en a pas besoin : il redirige vers une page
 * hebergee par Stripe et ne charge jamais ce module.
 *
 * Cle PUBLIQUE (NEXT_PUBLIC_...), jamais secrete -- homologue cote navigateur
 * de STRIPE_SECRET_KEY (src/lib/stripe.ts), a poser separement dans l environnement.
 */
let stripePromise: Promise<Stripe | null> | null = null

export function getStripeClient(): Promise<Stripe | null> {
  if (!stripePromise) {
    const cle = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    stripePromise = cle ? loadStripe(cle) : Promise.resolve(null)
  }
  return stripePromise
}
