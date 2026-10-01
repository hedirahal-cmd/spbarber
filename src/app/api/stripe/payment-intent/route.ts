import { NextRequest, NextResponse } from 'next/server'
import { problemeConfigurationStripe, stripe } from '@/lib/stripe'
import { CartValidationError, resolveCartItems } from '@/lib/pricing'

// Paiement express (Apple Pay / Google Pay) depuis la fiche produit -- chemin
// VOLONTAIREMENT independant du panier (decision Hedi, 2026-10-01) : toujours
// un seul produit, jamais fusionne avec ce qui est deja dans le panier.
//
// Meme seuil que le panier classique (src/app/api/stripe/checkout/route.ts) --
// dupliquer la valeur plutot que l importer evite un couplage entre deux routes
// qui ne partagent rien d autre, au prix d une seule constante a garder en sync.
const SEUIL_LIVRAISON_OFFERTE = 5900
const FRAIS_PORT = 590

export async function POST(req: NextRequest) {
  try {
    const probleme = problemeConfigurationStripe()
    if (probleme) {
      console.error('[Stripe payment-intent] paiement refuse :', probleme)
      return NextResponse.json({ error: 'Le paiement est momentanement indisponible.' }, { status: 503 })
    }

    const { productId, variantId, quantity }: { productId?: unknown; variantId?: unknown; quantity?: unknown } =
      await req.json()

    if (typeof productId !== 'string' || !productId) {
      return NextResponse.json({ error: 'Produit invalide.' }, { status: 400 })
    }
    const qty = typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0 ? quantity : 1

    // Meme resolution serveur que le panier classique (prix, stock, override) --
    // jamais un montant envoye par le client, meme principe que pricing.ts.
    let resolved
    try {
      resolved = await resolveCartItems([
        {
          product: { id: productId },
          ...(typeof variantId === 'string' && variantId ? { variant: { id: variantId } } : {}),
          quantity: qty,
        },
      ])
    } catch (e) {
      if (e instanceof CartValidationError) {
        return NextResponse.json({ error: e.message }, { status: e.status })
      }
      throw e
    }
    const item = resolved[0]

    const subtotal = item.unitAmount * item.quantity
    const isFreeShip = subtotal >= SEUIL_LIVRAISON_OFFERTE
    const fraisPort = isFreeShip ? 0 : FRAIS_PORT
    const amount = subtotal + fraisPort

    // Meme forme que metadata.items du Checkout classique : le webhook partage
    // la meme boucle de decrement de stock pour les deux chemins.
    const itemsStock = [
      {
        id: item.product.id,
        ...(item.variant ? { variantId: item.variant.id } : {}),
        qty: item.quantity,
      },
    ]

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        // Marqueur exclusif a ce chemin : le webhook ne traite un
        // payment_intent.succeeded QUE s il porte cette valeur, pour ne jamais
        // retraiter le PaymentIntent sous-jacent d une Checkout Session
        // classique (qui en cree toujours un, sans cette metadonnee).
        source: 'express_checkout',
        items: JSON.stringify(itemsStock),
      },
    })

    if (!paymentIntent.client_secret) {
      console.error('[Stripe payment-intent] client_secret absent pour', paymentIntent.id)
      return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Stripe payment-intent]', msg)
    return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}

type AdresseEnvoi = {
  name?: string
  address?: {
    line1?: string
    line2?: string
    city?: string
    postal_code?: string
    country?: string
  }
}

/**
 * Complete le PaymentIntent (adresse de livraison, e-mail) juste avant sa
 * confirmation cote navigateur -- ces informations n existent qu au moment ou
 * le visiteur valide la feuille Apple Pay / Google Pay, donc apres la creation
 * ci-dessus. Mises a jour cote serveur (jamais en confiance depuis le client
 * pour la commande elle-meme : seul le webhook ecrit dans `orders`, a partir
 * des champs ici poses sur le PaymentIntent).
 */
export async function PATCH(req: NextRequest) {
  try {
    const { paymentIntentId, shipping, email }: {
      paymentIntentId?: unknown
      shipping?: AdresseEnvoi
      email?: unknown
    } = await req.json()

    if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
      return NextResponse.json({ error: 'Paiement invalide.' }, { status: 400 })
    }

    await stripe.paymentIntents.update(paymentIntentId, {
      ...(shipping?.address
        ? {
            shipping: {
              name: shipping.name || 'Client SP Barber',
              address: {
                line1: shipping.address.line1 || '',
                line2: shipping.address.line2,
                city: shipping.address.city || '',
                postal_code: shipping.address.postal_code || '',
                country: shipping.address.country || '',
              },
            },
          }
        : {}),
      ...(typeof email === 'string' && email ? { receipt_email: email } : {}),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Stripe payment-intent PATCH]', msg)
    return NextResponse.json({ error: 'Impossible de finaliser le paiement.' }, { status: 500 })
  }
}
