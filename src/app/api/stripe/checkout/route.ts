import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { CartItem } from '@/types'

function getBaseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  try {
    const { items, coupon, email }: { items: CartItem[]; coupon?: string; email?: string } = await req.json()

    const subtotal = items.reduce(
      (sum, item) => sum + (item.variant?.price ?? item.product.price) * item.quantity,
      0,
    )
    const isFreeShip = subtotal >= 4900

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

    const compactItems = items.map((item) => ({
      id: item.product.id,
      name: item.variant ? `${item.product.name} — ${item.variant.name}` : item.product.name,
      qty: item.quantity,
      price: item.variant?.price ?? item.product.price,
    }))

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'if_required',
      line_items,
      metadata: { items: JSON.stringify(compactItems).slice(0, 500) },
      ...(coupon ? { discounts: [{ coupon }] } : {}),
      ...(email ? { customer_email: email } : {}),
      success_url: `${base}/commande-confirmee?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cart`,
      locale: 'fr',
      shipping_address_collection: { allowed_countries: ['FR', 'BE', 'CH', 'LU'] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: isFreeShip ? 0 : 590, currency: 'eur' },
            display_name: isFreeShip
              ? 'Colissimo Standard — Offerte !'
              : 'Colissimo Standard (2-3 jours ouvrés)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 3 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: isFreeShip ? 0 : 990, currency: 'eur' },
            display_name: isFreeShip
              ? 'Colissimo Express — Offerte !'
              : 'Colissimo Express (1-2 jours ouvrés)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 1 },
              maximum: { unit: 'business_day', value: 2 },
            },
          },
        },
      ],
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Stripe checkout]', msg)
    const se = error as { code?: string }
    if (se.code === 'resource_missing') {
      return NextResponse.json({ couponError: 'Code promo invalide ou expiré.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erreur lors de la création du paiement', detail: msg }, { status: 500 })
  }
}
