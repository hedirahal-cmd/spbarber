import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const headerStore = await headers()
  const sig = headerStore.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    let parsedItems: unknown[] = []
    try {
      parsedItems = JSON.parse(session.metadata?.items ?? '[]')
    } catch {}

    const shippingInfo = session.collected_information?.shipping_details ?? null
    const shipping = shippingInfo
      ? { name: shippingInfo.name, address: shippingInfo.address }
      : (session.customer_details?.address ?? null)

    await supabaseAdmin.from('orders').insert({
      email: session.customer_details?.email ?? '',
      items: parsedItems,
      total: session.amount_total ?? 0,
      status: 'paid',
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null,
      shipping_address: shipping,
      created_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({ received: true })
}
