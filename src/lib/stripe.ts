import Stripe from 'stripe'

// Priorité : STRIPE_SECRET_KEY_TEST (si configuré sur Vercel) → STRIPE_SECRET_KEY → erreur claire
const secretKey =
  process.env.STRIPE_SECRET_KEY_TEST ??
  process.env.STRIPE_SECRET_KEY ??
  ''

if (!secretKey) {
  console.error('[Stripe] ERREUR : aucune clé secrète Stripe trouvée. Ajoutez STRIPE_SECRET_KEY ou STRIPE_SECRET_KEY_TEST dans vos variables d\'environnement.')
}

export const stripe = new Stripe(secretKey, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
})
