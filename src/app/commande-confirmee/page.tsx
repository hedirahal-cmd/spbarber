import { redirect } from 'next/navigation'
import Link from 'next/link'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'
import type { Metadata } from 'next'
import { ClearCartOnMount } from '@/components/ClearCartOnMount'
import { PRODUCTS } from '@/lib/products'
import { applyOverride, type ProductOverride } from '@/lib/product-overrides'
import { supabaseAdmin } from '@/lib/supabase'

export const metadata: Metadata = {
  title: { absolute: 'Commande confirmée — SP Barber Shop' },
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

type LigneAffichee = { nom: string; quantite: number; montant: number }

export default async function CommandeConfirmeePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; payment_intent?: string }>
}) {
  const { session_id, payment_intent } = await searchParams

  if (!session_id && !payment_intent) redirect('/products')

  // Achat express (Apple Pay / Google Pay, voir ExpressCheckoutButton) : un
  // seul produit, independant du panier -- ne PAS le vider ici, contrairement
  // au Checkout classique ci-dessous qui vient d'acheter tout son contenu.
  let viderPanier = true
  let orderRef: string
  let email: string | null
  let lignes: LigneAffichee[]
  let montantTotal: number
  let shippingName: string | null
  let shippingAddr: Stripe.Address | null

  if (session_id) {
    let session: Stripe.Checkout.Session | null = null
    try {
      session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['line_items'] })
    } catch {
      redirect('/products')
    }
    if (!session || session.payment_status !== 'paid') redirect('/products')

    orderRef = session_id.slice(-8).toUpperCase()
    const lineItems = (session.line_items as Stripe.ApiList<Stripe.LineItem> | undefined)?.data ?? []
    lignes = lineItems.map((item) => ({
      nom: item.description ?? '',
      quantite: item.quantity ?? 1,
      montant: item.amount_total ?? 0,
    }))
    montantTotal = session.amount_total ?? 0
    email = session.customer_details?.email ?? null

    const shippingInfo = session.collected_information?.shipping_details
    shippingName = shippingInfo?.name ?? session.customer_details?.name ?? null
    shippingAddr = shippingInfo?.address ?? session.customer_details?.address ?? null
  } else {
    // Achat express -- aucun line_items Stripe natif sur un PaymentIntent (ca
    // n'existe que sur une Checkout Session) : les articles sont reconstruits
    // depuis PRODUCTS + les overrides live, a partir des memes metadonnees que
    // le webhook utilise pour enregistrer la commande.
    let paymentIntent: Stripe.PaymentIntent | null = null
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(payment_intent!)
    } catch {
      redirect('/products')
    }
    if (!paymentIntent || paymentIntent.status !== 'succeeded') redirect('/products')

    viderPanier = false
    orderRef = payment_intent!.slice(-8).toUpperCase()

    let overrides: Record<string, ProductOverride> = {}
    try {
      const { data } = await supabaseAdmin.from('product_overrides').select('id,name,price,images,actif')
      if (data) (data as ProductOverride[]).forEach((o) => { overrides[o.id] = o })
    } catch {}

    let parsedItems: { id?: string; variantId?: string; qty?: number }[] = []
    try {
      parsedItems = JSON.parse(paymentIntent.metadata?.items ?? '[]')
    } catch {}

    lignes = parsedItems.map((it) => {
      const base = it.id ? PRODUCTS.find((p) => p.id === it.id) : undefined
      const resolu = base ? applyOverride(base, overrides) : undefined
      const variant = resolu?.variants?.find((v) => v.id === it.variantId)
      const nom = resolu ? (variant ? `${resolu.name} — ${variant.name}` : resolu.name) : 'Produit'
      const quantite = it.qty ?? 1
      const unitaire = variant?.price ?? resolu?.price ?? 0
      return { nom, quantite, montant: unitaire * quantite }
    })
    montantTotal = paymentIntent.amount
    email = paymentIntent.receipt_email ?? null
    shippingName = paymentIntent.shipping?.name ?? null
    shippingAddr = paymentIntent.shipping?.address ?? null
  }

  return (
    <main className="confm-page">
      {viderPanier && <ClearCartOnMount />}
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
          <strong>{email ?? 'votre adresse'}</strong>.
        </p>

        <div className="confm-ref">N° {orderRef}</div>

        {/* Récapitulatif articles */}
        {lignes.length > 0 && (
          <div className="confm-items">
            <div className="confm-items-hd">Votre commande</div>
            {lignes.map((item, i) => (
              <div key={i} className="confm-item">
                <span className="confm-item-name">
                  {item.nom}
                  {item.quantite > 1 ? ` × ${item.quantite}` : ''}
                </span>
                <span className="confm-item-price">{formatPrice(item.montant)}</span>
              </div>
            ))}
            <div className="confm-total">
              <span>Total payé</span>
              <span>{formatPrice(montantTotal)}</span>
            </div>
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
