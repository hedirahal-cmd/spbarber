import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { CartItem } from '@/types'

function getBaseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

const POIDS_PRODUIT: Record<string, number> = {
  'cire-cheveux-premium': 150,
  'shampooing-noir-colorant': 300,
  'creme-curl-control': 200,
  'peigne-texture-expert': 100,
  'pack-barbe-complet': 600,
  'tondeuse-fade-pro': 800,
}

function getColissimoPrice(poidsTotal: number): number {
  if (poidsTotal <= 250) return 490
  if (poidsTotal <= 500) return 590
  if (poidsTotal <= 750) return 690
  if (poidsTotal <= 1000) return 790
  if (poidsTotal <= 2000) return 890
  return 990
}

export async function POST(req: NextRequest) {
  try {
    const { items, coupon, email, session_id }: { items: CartItem[]; coupon?: string; email?: string; session_id?: string } = await req.json()

    const subtotal = items.reduce(
      (sum, item) => sum + (item.variant?.price ?? item.product.price) * item.quantity,
      0,
    )
    const isFreeShip = subtotal >= 4900

    const poidsTotal = items.reduce((sum, item) => {
      const poids = POIDS_PRODUIT[item.product.slug] ?? 200
      return sum + poids * item.quantity
    }, 0)

    const prixStandard = isFreeShip ? 0 : getColissimoPrice(poidsTotal)
    const prixRetrait = isFreeShip ? 0 : Math.max(0, prixStandard - 100)

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
      metadata: {
        items: JSON.stringify(compactItems).slice(0, 500),
        ...(session_id ? { session_id } : {}),
      },
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
            fixed_amount: { amount: prixStandard, currency: 'eur' },
            display_name: isFreeShip
              ? 'Colissimo Domicile — Offerte !'
              : `Colissimo Domicile (2-3 jours ouvrés)`,
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 3 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: prixRetrait, currency: 'eur' },
            display_name: isFreeShip
              ? 'Colissimo Point Retrait — Offert !'
              : `Colissimo Point Retrait (2-4 jours ouvrés)`,
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 4 },
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
