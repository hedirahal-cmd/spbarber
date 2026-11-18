'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStripeClient } from '@/lib/stripe-client'
import { diviserNomComplet } from '@/lib/noms'
import { PAYS_LIVRABLES } from '@/lib/shipping-countries'
import type {
  PaymentRequestPaymentMethodEvent,
  PaymentRequestShippingAddressEvent,
  StripePaymentRequestButtonElement,
} from '@stripe/stripe-js'

const FRAIS_PORT = 590

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
  // Case CGV obligatoire (2026-11-18, demande Hedi, "item 8 bis") -- Stripe
  // n'a pas de consent_collection pour les PaymentIntents (contrairement a
  // Checkout Sessions, voir /api/stripe/checkout) : la feuille native
  // Apple Pay/Google Pay ne laisse aucune place a un texte a nous, donc le
  // consentement se recueille AVANT, sur notre propre page. cguAccepteesRef
  // double l'etat React : le gestionnaire 'paymentmethod' ci-dessous est
  // enregistre une seule fois a l'ouverture (effet sans cguAcceptees en
  // dependance) et lirait sinon une valeur figee au premier rendu.
  const [cguAcceptees, setCguAcceptees] = useState(false)
  const [cguAlerte, setCguAlerte] = useState(false)
  const cguAccepteesRef = useRef(false)

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
        // Telephone (2026-10-21, chantier Boxtal) : rendu directement par la
        // feuille Apple Pay/Google Pay, structure -- aucun decoupage a faire
        // ici, contrairement au nom (voir plus bas, payerName).
        requestPayerPhone: true,
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
        if (!pays || !(PAYS_LIVRABLES as string[]).includes(pays)) {
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
        // Filet de securite : le survoile sur le bouton (voir le JSX plus
        // bas) empeche deja normalement ce gestionnaire de se declencher
        // sans case cochee ; ce controle couvre le cas marginal ou la
        // feuille native serait ouverte autrement (ex. Tab clavier direct
        // sur l'iframe Stripe, que le survoile ne peut pas empecher).
        if (!cguAccepteesRef.current) {
          ev.complete('fail')
          setCguAlerte(true)
          return
        }
        try {
          const creation = await fetch('/api/stripe/payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, variantId, quantity: 1, cguAcceptees: true }),
          })
          const donnees = await creation.json()
          if (!creation.ok || !donnees.clientSecret) {
            ev.complete('fail')
            setErreur(donnees.error || 'Paiement indisponible pour le moment.')
            return
          }

          const addr = ev.shippingAddress
          // payerName = chaine unique rendue par la feuille (Apple Pay/Google
          // Pay, via l'abstraction Stripe) -- pas de prenom/nom separes ici,
          // contrairement au Checkout classique (custom_fields dedies). Voir
          // le commentaire de diviserNomComplet pour la limite connue.
          const { prenom, nom } = diviserNomComplet(addr?.recipient || ev.payerName || 'Client SP Barber')
          const maj = await fetch('/api/stripe/payment-intent', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: donnees.paymentIntentId,
              email: ev.payerEmail,
              phone: ev.payerPhone,
              firstName: prenom,
              lastName: nom,
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
          // DOM-TOM (chantier 2026-10-21) : le serveur refuse ici, AVANT toute
          // confirmation de paiement -- voir le controle dans le PATCH de
          // /api/stripe/payment-intent. Sans cette verification du resultat,
          // le paiement se confirmait quand meme (reponse ignoree jusqu'ici).
          if (!maj.ok) {
            const d = await maj.json().catch(() => ({}))
            ev.complete('fail')
            setErreur(d.error || 'Cette adresse de livraison n\'est pas prise en charge.')
            return
          }

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

      {supporte && (
        <label className="sn-express-pay-cgu">
          <input
            type="checkbox"
            checked={cguAcceptees}
            onChange={(e) => {
              const coche = e.target.checked
              setCguAcceptees(coche)
              cguAccepteesRef.current = coche
              if (coche) setCguAlerte(false)
            }}
          />
          <span>
            J&apos;accepte les{' '}
            <Link href="/cgv" target="_blank" rel="noopener noreferrer">Conditions Générales de Vente</Link>
          </span>
        </label>
      )}

      <div className="sn-express-pay-wrap">
        <div ref={containerRef} />
        {/* Survoile transparent : bloque le clic/tactile sur le bouton natif
            Apple Pay/Google Pay tant que la case n'est pas cochee -- la
            feuille de paiement est controlee par Apple/Google, aucun texte
            a nous ne peut y figurer. Limite connue : n'empeche pas un Tab
            clavier direct sur l'iframe Stripe (voir le filet de securite
            cote serveur et dans le gestionnaire 'paymentmethod' ci-dessus). */}
        {supporte && !cguAcceptees && (
          <button
            type="button"
            className="sn-express-pay-blocker"
            aria-label="Acceptez les Conditions Générales de Vente avant de payer"
            onClick={() => setCguAlerte(true)}
          />
        )}
      </div>

      {cguAlerte && <p className="sn-express-pay-err" role="alert">Merci d&apos;accepter les CGV avant d&apos;utiliser le paiement express.</p>}
      {erreur && <p className="sn-express-pay-err" role="alert">{erreur}</p>}
    </div>
  )
}
