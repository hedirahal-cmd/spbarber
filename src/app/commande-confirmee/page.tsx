import { redirect } from 'next/navigation'
import Link from 'next/link'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Commande confirmée — SP Barber Shop',
  robots: 'noindex',
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function AddressBlock({ addr }: { addr: Stripe.Address | null | undefined }) {
  if (!addr) return null
  return (
    <p className="confm-addr">
      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
      {addr.postal_code} {addr.city}{addr.country ? `, ${addr.country}` : ''}
    </p>
  )
}

export default async function CommandeConfirmeePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  if (!session_id) redirect('/products')

  let session: Stripe.Checkout.Session | null = null
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items'],
    })
  } catch {
    redirect('/products')
  }

  if (!session || session.payment_status !== 'paid') {
    redirect('/products')
  }

  const orderRef = session_id.slice(-8).toUpperCase()
  const lineItems = (session.line_items as Stripe.ApiList<Stripe.LineItem> | undefined)?.data ?? []

  const shippingInfo = session.collected_information?.shipping_details
  const shippingName = shippingInfo?.name ?? session.customer_details?.name ?? null
  const shippingAddr = shippingInfo?.address ?? session.customer_details?.address ?? null

  return (
    <main className="confm-page">
      <div className="confm-inner">
        {/* Icône succès */}
        <div className="confm-check">
          <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="26" cy="26" r="25" stroke="var(--gold)" strokeWidth="2" />
            <path d="M14 27l8 8 16-16" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="confm-eyebrow">Merci pour votre achat</div>
        <h1 className="confm-title">COMMANDE<br />CONFIRMÉE !</h1>
        <p className="confm-sub">
          Un e-mail de confirmation a été envoyé à{' '}
          <strong>{session.customer_details?.email ?? 'votre adresse'}</strong>.
        </p>

        <div className="confm-ref">N° {orderRef}</div>

        {/* Récapitulatif articles */}
        {lineItems.length > 0 && (
          <div className="confm-items">
            <div className="confm-items-hd">Votre commande</div>
            {lineItems.map((item, i) => (
              <div key={i} className="confm-item">
                <span className="confm-item-name">
                  {item.description}
                  {item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ''}
                </span>
                <span className="confm-item-price">
                  {item.amount_total != null ? formatPrice(item.amount_total) : ''}
                </span>
              </div>
            ))}
            {session.amount_total != null && (
              <div className="confm-total">
                <span>Total payé</span>
                <span>{formatPrice(session.amount_total)}</span>
              </div>
            )}
          </div>
        )}

        {/* Adresse livraison */}
        {(shippingName || shippingAddr) && (
          <div className="confm-ship">
            <div className="confm-ship-hd">Livraison à</div>
            {shippingName && <p className="confm-ship-name">{shippingName}</p>}
            <AddressBlock addr={shippingAddr} />
          </div>
        )}

        {/* Délai */}
        <div className="confm-delay">
          <span className="confm-delay-icon">📦</span>
          Expédition sous <strong>24–48h</strong> — vous recevrez un e-mail de suivi.
        </div>

        {/* CTA */}
        <div className="confm-ctas">
          <Link href="/products" className="confm-btn-primary">
            Continuer mes achats
          </Link>
          <Link href="/" className="confm-btn-ghost">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
