import { PRODUCTS } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase'
import type { Product, ProductVariant } from '@/types'

/**
 * Source de verite SERVEUR pour tout montant facture.
 *
 * Le panier vit dans le localStorage du navigateur : tout ce qu'il contient est
 * modifiable par le visiteur (DevTools). Rien de ce que le client envoie sur un
 * prix, un poids ou un libelle ne doit donc atteindre Stripe. Ce module reprend
 * l'article a partir du seul identifiant (id, a defaut slug) et recalcule le
 * reste depuis product_overrides + PRODUCTS -- la meme paire de sources que les
 * pages produit.
 *
 * Le montant rendu ici est l'unique origine du unit_amount Stripe ET du prix
 * inscrit dans metadata.items : une seule lecture, pas deux.
 */

/** Erreur portant un message affichable au client et le statut HTTP a rendre. */
export class CartValidationError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'CartValidationError'
    this.status = status
  }
}

export interface ResolvedCartItem {
  /** Produit reconstruit cote serveur (overrides appliques). */
  product: Product
  variant?: ProductVariant
  quantity: number
  /** Prix unitaire en centimes. Seule valeur a facturer. */
  unitAmount: number
}

type OverrideRow = {
  id: string
  name: string | null
  price: number | null
  description: string | null
  stock: number | null
  benefit: string | null
  images: { url: string; alt: string }[] | null
}

/** Garde-fou de volume : une ligne de panier ne depasse pas ce nombre d'unites. */
const MAX_QUANTITE_PAR_LIGNE = 100

const MSG_PRIX_INDISPONIBLE =
  'Les prix ne sont pas disponibles pour le moment. Merci de reessayer dans un instant.'

function estMontantEntierPositif(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isInteger(valeur) && valeur > 0
}

/**
 * Lit les overrides de prix. En cas d'echec de lecture on REFUSE le paiement au
 * lieu de retomber sur le catalogue statique : un prix qu'on ne peut pas
 * verifier ne doit pas etre facture. Une ligne simplement absente de la table
 * n'est pas un echec -- c'est le cas normal, le prix statique fait foi.
 */
async function lireOverrides(): Promise<Map<string, OverrideRow>> {
  let lignes: OverrideRow[]

  try {
    const { data, error } = await supabaseAdmin
      .from('product_overrides')
      .select('id,name,price,description,stock,benefit,images')

    if (error) {
      console.error('[pricing] lecture product_overrides en erreur:', error.message)
      throw new CartValidationError(MSG_PRIX_INDISPONIBLE, 503)
    }
    lignes = (data ?? []) as OverrideRow[]
  } catch (e) {
    if (e instanceof CartValidationError) throw e
    console.error('[pricing] lecture product_overrides impossible:', e instanceof Error ? e.message : String(e))
    throw new CartValidationError(MSG_PRIX_INDISPONIBLE, 503)
  }

  const parId = new Map<string, OverrideRow>()
  for (const ligne of lignes) parId.set(String(ligne.id), ligne)
  return parId
}

function resoudreLigne(
  brut: unknown,
  index: number,
  overrides: Map<string, OverrideRow>,
): ResolvedCartItem {
  const ligne = 'Ligne ' + (index + 1)
  const item = (brut ?? {}) as {
    product?: { id?: unknown; slug?: unknown }
    variant?: unknown
    quantity?: unknown
  }

  // 1. Quantite : entier strictement positif et borne.
  const quantity = item.quantity
  if (!estMontantEntierPositif(quantity) || quantity > MAX_QUANTITE_PAR_LIGNE) {
    throw new CartValidationError(ligne + ' : quantite invalide.')
  }

  // 2. Produit : retrouve par identifiant, jamais par le prix envoye.
  const id = typeof item.product?.id === 'string' ? item.product.id : null
  const slug = typeof item.product?.slug === 'string' ? item.product.slug : null
  const base =
    (id !== null ? PRODUCTS.find((p) => p.id === id) : undefined) ??
    (slug !== null ? PRODUCTS.find((p) => p.slug === slug) : undefined)

  if (!base) {
    throw new CartValidationError(ligne + ' : produit inconnu.')
  }

  // 3. Override eventuel, applique comme sur les pages produit.
  const ov = overrides.get(base.id)
  const prixProduit = ov && ov.price != null ? Number(ov.price) : base.price

  // 4. Variante : elle doit exister dans le catalogue du produit resolu.
  let variant: ProductVariant | undefined
  if (item.variant != null) {
    const variantId = typeof (item.variant as { id?: unknown }).id === 'string'
      ? (item.variant as { id: string }).id
      : null
    const trouvee = variantId === null
      ? undefined
      : base.variants?.find((v) => v.id === variantId)

    if (!trouvee) {
      throw new CartValidationError(ligne + ' : variante inconnue.')
    }
    variant = trouvee
  }

  // 5. Prix unitaire a facturer.
  //
  // DETTE CONNUE, chantier separe : product_overrides n'a pas de colonne de
  // variante (cf. /api/admin/products, qui n'ecrit que id/name/price/
  // description/stock/benefit). Un changement de prix depuis l'admin n'atteint
  // donc PAS les variantes de la tondeuse, qui gardent leur prix en dur dans
  // PRODUCTS. On reproduit ici le comportement existant sans le modifier :
  // le corriger demande une decision produit, pas un correctif de securite.
  const unitAmount = variant ? variant.price : prixProduit

  if (!estMontantEntierPositif(unitAmount)) {
    console.error('[pricing] prix inexploitable pour le produit', base.id, ':', unitAmount)
    throw new CartValidationError(ligne + ' : prix indisponible pour ce produit.', 500)
  }

  // 6. Stock. Un produit en dropshipping (aujourd'hui : la Tondeuse Fade Pro,
  // seule a porter des variantes) est HORS de ce systeme -- le fournisseur gere
  // son propre stock, decision actee separement. Le critere est is_dropshipping,
  // pas "a une variante" : ca reste juste si un futur produit dropshipping
  // arrive sans variante, ou l'inverse.
  if (!base.is_dropshipping) {
    const stockDisponible = ov && ov.stock != null ? Number(ov.stock) : base.stock
    if (quantity > stockDisponible) {
      throw new CartValidationError(
        ligne + ' : stock insuffisant (il reste ' + stockDisponible + ').',
        409,
      )
    }
  }

  // 7. Produit reconstruit : le libelle envoye a Stripe vient d'ici, pas du client.
  const product: Product = {
    ...base,
    ...(ov?.name != null ? { name: String(ov.name) } : {}),
    ...(ov?.price != null ? { price: prixProduit } : {}),
    ...(ov?.description != null ? { description: String(ov.description) } : {}),
    ...(ov?.stock != null ? { stock: Number(ov.stock) } : {}),
    ...(ov?.benefit != null ? { benefit: String(ov.benefit) } : {}),
    ...(Array.isArray(ov?.images) && ov.images.length > 0 ? { images: ov.images } : {}),
  }

  return { product, variant, quantity, unitAmount }
}

/**
 * Reprend le panier envoye par le client et en rend la version serveur.
 * Lance CartValidationError si une ligne est inexploitable.
 */
export async function resolveCartItems(brut: unknown): Promise<ResolvedCartItem[]> {
  if (!Array.isArray(brut) || brut.length === 0) {
    throw new CartValidationError('Panier vide ou invalide.')
  }

  const overrides = await lireOverrides()
  return brut.map((ligne, index) => resoudreLigne(ligne, index, overrides))
}
