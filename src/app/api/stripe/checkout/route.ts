import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { CartItem } from '@/types'

// Sur Vercel, VERCEL_PROJECT_PRODUCTION_URL est auto-injecté (sans https://)
// Localement, NEXT_PUBLIC_SITE_URL = http://localhost:3000
function getBaseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  try {
    const { items, coupon }: { items: CartItem[]; coupon?: string } = await req.json()

    const line_items = items.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.variant ? `${item.product.name} — ${item.variant.name}` : item.product.name,
          images: item.product.images.filter((img) => img.startsWith('http')),
        },
        unit_amount: item.variant?.price ?? item.product.price,
      },
      quantity: item.quantity,
    }))

    const base = getBaseUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'if_required',
      payment_method_types: ['card'],
      line_items,
      ...(coupon ? { discounts: [{ coupon }] } : {}),
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/`,
      locale: 'fr',
      shipping_address_collection: { allowed_countries: ['FR', 'BE', 'CH', 'LU'] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'eur' },
            display_name: 'Livraison gratuite',
            delivery_estimate: { minimum: { unit: 'business_day', value: 3 }, maximum: { unit: 'business_day', value: 5 } },
          },
        },
      ],
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Stripe checkout] Erreur:', msg)
    const se = error as { code?: string }
    if (se.code === 'resource_missing') {
      return NextResponse.json({ couponError: 'Code promo invalide ou expiré.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erreur lors de la création du paiement', detail: msg }, { status: 500 })
  }
}
