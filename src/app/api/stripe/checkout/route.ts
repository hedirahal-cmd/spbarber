import { NextRequest, NextResponse } from 'next/server'
import { problemeConfigurationStripe, stripe } from '@/lib/stripe'
import { CartValidationError, resolveCartItems } from '@/lib/pricing'

function getBaseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

// Forfait fixe unique (2026-09-29, decision Hedi) : remplace l'ancien bareme
// au poids (POIDS_PRODUIT + getColissimoPrice), qui divergeait du forfait
// affiche sur le site (4,90e affiche partout, alors que Stripe facturait
// jusqu'a 9,90e selon le poids reel du panier).
const SEUIL_LIVRAISON_OFFERTE = 5900
const FRAIS_PORT = 590

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
    const isFreeShip = subtotal >= SEUIL_LIVRAISON_OFFERTE
    const fraisPort = isFreeShip ? 0 : FRAIS_PORT

    // Les tondeuses (dropshipping manuel) ont un delai reel d'environ 2
    // semaines, tres different du "3-5 jours ouvres" affiche par defaut -- un
    // panier qui en contient une ne doit pas promettre le delai standard au
    // moment le plus sensible (juste avant paiement).
    const contientTondeuse = resolved.some((item) => item.product.category === 'tondeuse')

    const libelle = (item: (typeof resolved)[number]) =>
      item.variant ? `${item.product.name} — ${item.variant.name}` : item.product.name

    // Delai propre a chaque article -- affiche par Stripe sous le nom du
    // produit sur sa page de paiement. Necessaire des qu'un panier mixte
    // (produit standard + tondeuse) promet des delais differents : le
    // libelle du forfait de port ci-dessous renvoie a CE detail, qui doit
    // donc exister reellement plutot que renvoyer dans le vide.
    const delaiLigne = (item: (typeof resolved)[number]) =>
      item.product.category === 'tondeuse'
        ? 'Livraison sous ~2 semaines, envoi séparé'
        : 'Livraison 3-5 jours ouvrés'

    const line_items = resolved.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: libelle(item),
          description: delaiLigne(item),
          images: item.product.images.filter((img) => img.url.startsWith('http')).map((img) => img.url),
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
            fixed_amount: { amount: fraisPort, currency: 'eur' },
            display_name: contientTondeuse
              ? `Livraison${isFreeShip ? ' — Offerte !' : ''} — délais variables selon produits (voir détail ci-dessus)`
              : isFreeShip
                ? 'Colissimo — Offerte !'
                : 'Colissimo (3-5 jours ouvrés)',
            delivery_estimate: contientTondeuse
              ? {
                  minimum: { unit: 'business_day', value: 3 },
                  maximum: { unit: 'business_day', value: 15 },
                }
              : {
                  minimum: { unit: 'business_day', value: 3 },
                  maximum: { unit: 'business_day', value: 5 },
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
