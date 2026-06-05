import Stripe from 'stripe'

// STRIPE_MODE=test → utilise STRIPE_SECRET_KEY_TEST (clé sk_test_...)
// STRIPE_MODE absent/live → utilise STRIPE_SECRET_KEY (clé sk_live_...)
const secretKey =
  process.env.STRIPE_MODE === 'test'
    ? (process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY!)
    : process.env.STRIPE_SECRET_KEY!

export const stripe = new Stripe(secretKey, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
})
