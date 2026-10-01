'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStripeClient } from '@/lib/stripe-client'
import type {
  PaymentRequestPaymentMethodEvent,
  PaymentRequestShippingAddressEvent,
  StripePaymentRequestButtonElement,
} from '@stripe/stripe-js'

const FRAIS_PORT = 590

// Memes pays que le Checkout classique (src/app/api/stripe/checkout/route.ts,
// shipping_address_collection.allowed_countries) -- a garder en sync. Dupliquee
// ici plutot qu importee : cette liste doit vivre cote NAVIGATEUR (verification
// faite dans l evenement shippingaddresschange, avant meme d appeler le serveur),
// la aussi le seul fichier qui la partagerait reellement serait celui-ci.
const PAYS_LIVRABLES = ['FR', 'BE', 'CH', 'LU']

/**
 * Bouton de paiement express (Apple Pay / Google Pay) sur la fiche produit --
 * achat d'UN produit, independant du panier (decision Hedi, 2026-10-01).
 *
 * Ne s'affiche QUE si canMakePayment() confirme que le navigateur/appareil du
 * visiteur sait reellement proposer un moyen de paiement (sinon : rien, pas de
 * bouton mort comme les anciens logos statiques qu'il remplace).
 */
export function ExpressCheckoutButton({
  productId,
  productName,
  variantId,
  unitAmount,
  isFreeShip,
}: {
  productId: string
  productName: string
  variantId?: string
  /** Prix unitaire affiche sur la page, en centimes -- deja a jour (override appliquee en amont). */
  unitAmount: number
  isFreeShip: boolean
}) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [supporte, setSupporte] = useState<boolean | null>(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let actif = true
    let prButton: StripePaymentRequestButtonElement | null = null

    async function init() {
      const stripe = await getStripeClient()
      if (!stripe) {
        if (actif) setSupporte(false)
        return
      }

      const fraisPort = isFreeShip ? 0 : FRAIS_PORT
      const paymentRequest = stripe.paymentRequest({
        country: 'FR',
        currency: 'eur',
        total: { label: productName, amount: unitAmount + fraisPort },
        requestPayerEmail: true,
        requestShipping: true,
        shippingOptions: [
          {
            id: 'standard',
            label: isFreeShip ? 'Livraison offerte' : 'Livraison standard',
            detail: isFreeShip ? 'Offerte' : '5,90 €',
            amount: fraisPort,
          },
        ],
      })

      const peutPayer = await paymentRequest.canMakePayment()
      if (!actif) return
      if (!peutPayer) {
        setSupporte(false)
        return
      }

      setSupporte(true)

      const elements = stripe.elements()
      const button = elements.create('paymentRequestButton', {
        paymentRequest,
        style: { paymentRequestButton: { type: 'buy', theme: 'dark', height: '52px' } },
      })
      prButton = button
      if (containerRef.current) button.mount(containerRef.current)

      // Restreint aux memes pays que le Checkout classique -- la feuille
      // Apple/Google Pay laisserait sinon choisir n'importe quel pays de
      // livraison, a un tarif qui ne correspond a aucune offre reelle.
      paymentRequest.on('shippingaddresschange', (ev: PaymentRequestShippingAddressEvent) => {
        const pays = ev.shippingAddress.country
        if (!pays || !PAYS_LIVRABLES.includes(pays)) {
          ev.updateWith({ status: 'invalid_shipping_address' })
          return
        }
        ev.updateWith({
          status: 'success',
          shippingOptions: [
            {
              id: 'standard',
              label: isFreeShip ? 'Livraison offerte' : 'Livraison standard',
              detail: isFreeShip ? 'Offerte' : '5,90 €',
              amount: fraisPort,
            },
          ],
        })
      })

      paymentRequest.on('paymentmethod', async (ev: PaymentRequestPaymentMethodEvent) => {
        try {
          const creation = await fetch('/api/stripe/payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, variantId, quantity: 1 }),
          })
          const donnees = await creation.json()
          if (!creation.ok || !donnees.clientSecret) {
            ev.complete('fail')
            setErreur(donnees.error || 'Paiement indisponible pour le moment.')
            return
          }

          const addr = ev.shippingAddress
          await fetch('/api/stripe/payment-intent', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: donnees.paymentIntentId,
              email: ev.payerEmail,
              shipping: addr
                ? {
                    name: addr.recipient || 'Client SP Barber',
                    address: {
                      line1: addr.addressLine?.[0] || '',
                      line2: addr.addressLine?.[1] || undefined,
                      city: addr.city || '',
                      postal_code: addr.postalCode || '',
                      country: addr.country || '',
                    },
                  }
                : undefined,
            }),
          })

          const { paymentIntent, error: erreurConfirm } = await stripe.confirmCardPayment(
            donnees.clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false },
          )

          if (erreurConfirm) {
            ev.complete('fail')
            setErreur('Le paiement a été refusé.')
            return
          }

          ev.complete('success')

          if (paymentIntent?.status === 'requires_action') {
            const { error: erreurAction } = await stripe.confirmCardPayment(donnees.clientSecret)
            if (erreurAction) {
              setErreur('Le paiement a été refusé.')
              return
            }
          }

          router.push(`/commande-confirmee?payment_intent=${donnees.paymentIntentId}`)
        } catch {
          ev.complete('fail')
          setErreur('Une erreur est survenue, réessayez.')
        }
      })
    }

    init()

    return () => {
      actif = false
      if (prButton) prButton.unmount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId, unitAmount, isFreeShip, productName])

  if (supporte === false) return null

  return (
    <div className="sn-express-pay">
      {supporte === null && <div className="sn-express-pay-loading" aria-hidden="true" />}
      <div ref={containerRef} />
      {erreur && <p className="sn-express-pay-err" role="alert">{erreur}</p>}
    </div>
  )
}
