import { NextRequest, NextResponse } from 'next/server'
import { problemeConfigurationStripe, stripe } from '@/lib/stripe'
import { CartValidationError, resolveCartItems } from '@/lib/pricing'

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
    // Garde-fou de configuration : une cle absente, un prefixe inconnu, ou une
    // cle live non explicitement autorisee font refuser le paiement plutot que
    // de laisser le doute s installer sur ce qui est reellement encaisse.
    const probleme = problemeConfigurationStripe()
    if (probleme) {
      console.error('[Stripe checkout] paiement refuse :', probleme)
      return NextResponse.json({ error: 'Le paiement est momentanement indisponible.' }, { status: 503 })
    }

    const { items, coupon, email, session_id }: { items?: unknown; coupon?: string; email?: string; session_id?: string } = await req.json()

    // Le panier arrive du localStorage du visiteur : il est modifiable de bout
    // en bout. On le reprend donc entierement cote serveur -- prix, libelles,
    // images et slug (donc le poids) sortent de product_overrides + PRODUCTS,
    // jamais du corps de la requete.
    const resolved = await resolveCartItems(items)

    const subtotal = resolved.reduce(
      (sum, item) => sum + item.unitAmount * item.quantity,
      0,
    )
    const isFreeShip = subtotal >= 4900

    const poidsTotal = resolved.reduce((sum, item) => {
      const poids = POIDS_PRODUIT[item.product.slug] ?? 200
      return sum + poids * item.quantity
    }, 0)

    const prixStandard = isFreeShip ? 0 : getColissimoPrice(poidsTotal)
    const prixRetrait = isFreeShip ? 0 : Math.max(0, prixStandard - 100)

    const libelle = (item: (typeof resolved)[number]) =>
      item.variant ? `${item.product.name} — ${item.variant.name}` : item.product.name

    const line_items = resolved.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: libelle(item),
          images: item.product.images.filter((img) => img.startsWith('http')),
        },
        unit_amount: item.unitAmount,
      },
      quantity: item.quantity,
    }))

    const base = getBaseUrl()

    // Reduit au strict necessaire pour le webhook (id, variante, quantite) --
    // PAS le nom ni le prix. Une valeur de metadonnee Stripe est plafonnee a 500
    // caracteres (limite de la plateforme, pas un choix du code) : avec name+price
    // en plus, un panier un peu charge tronquait ce JSON en plein milieu. C'etait
    // cosmetique tant que ce champ ne servait qu'a un affichage jamais montre --
    // ca ne l'est plus des lors que le webhook s'en sert pour decrementer du vrai
    // stock. Le nom et le prix, quand il en faudra, se recalculent depuis
    // PRODUCTS + product_overrides -- jamais une copie, meme principe qu'ailleurs
    // dans ce fichier pour le prix facture.
    const itemsStock = resolved.map((item) => ({
      id: item.product.id,
      ...(item.variant ? { variantId: item.variant.id } : {}),
      qty: item.quantity,
    }))

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'if_required',
      line_items,
      metadata: {
        items: JSON.stringify(itemsStock),
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
    if (error instanceof CartValidationError) {
      console.error('[Stripe checkout] panier refuse:', error.message)
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Stripe checkout]', msg)
    const se = error as { code?: string }
    if (se.code === 'resource_missing') {
      return NextResponse.json({ couponError: 'Code promo invalide ou expiré.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erreur lors de la création du paiement', detail: msg }, { status: 500 })
  }
}
