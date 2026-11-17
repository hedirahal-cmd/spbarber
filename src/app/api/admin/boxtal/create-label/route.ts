import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'
import { PRODUCTS } from '@/lib/products'
import { lignesDuColis, type LigneCommande } from '@/lib/shipping-email'
import { diviserNomComplet } from '@/lib/noms'
import { estCorse } from '@/lib/geo-france'
import {
  BOXTAL_EXPEDITEUR_EMAIL,
  BOXTAL_EXPEDITEUR_NOM,
  creerCommandeExpedition,
  offerCodePour,
  problemeConfigurationBoxtal,
  type BoxtalAdresse,
} from '@/lib/boxtal'

type Transporteur = 'colissimo' | 'chronopost'

/**
 * Genere l'etiquette Boxtal du colis STANDARD d'une commande (jamais le colis
 * fournisseur/tondeuse -- voir lignesDuColis). Le bouton "Etiquette manuelle"
 * existant (/api/admin/ship) reste disponible en parallele, inchange : repli
 * si Boxtal est indisponible ou si une commande n'a pas toutes les donnees
 * necessaires (telephone client, poids produit...).
 *
 * L'etiquette elle-meme n'est PAS prete a la fin de cet appel -- Boxtal la
 * genere de facon asynchrone et previent par webhook (voir
 * /api/webhook/boxtal). Ce qui est immediat : la commande d'expedition existe
 * cote Boxtal, et notre commande passe a "label_ready" (etiquette prete, en
 * attente de depot chez le transporteur) -- PAS "shipped" : ce statut final,
 * et l'e-mail client, n'arrivent qu'a la vraie prise en charge transporteur
 * (2026-11-17, demande Hedi -- voir STATUTS_PRISE_EN_CHARGE dans boxtal.ts et
 * le webhook TRACKING_CHANGED).
 */
export async function POST(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const probleme = problemeConfigurationBoxtal()
  if (probleme) {
    console.error('[Boxtal create-label] refuse :', probleme)
    return NextResponse.json({ error: 'Boxtal indisponible — utilisez le suivi manuel.' }, { status: 503 })
  }

  const { id, carrier, poidsKg, longueurCm, largeurCm, hauteurCm } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  if (carrier !== 'colissimo' && carrier !== 'chronopost') {
    return NextResponse.json({ error: 'transporteur invalide (colissimo ou chronopost attendu)' }, { status: 400 })
  }
  const transporteur: Transporteur = carrier
  const colis = {
    poidsKg: Number(poidsKg),
    longueurCm: Number(longueurCm),
    largeurCm: Number(largeurCm),
    hauteurCm: Number(hauteurCm),
  }
  if (!Object.values(colis).every((v) => Number.isFinite(v) && v > 0)) {
    return NextResponse.json({ error: 'poids/dimensions invalides (tous requis, strictement positifs)' }, { status: 400 })
  }

  const offerCode = offerCodePour(transporteur)
  if (!offerCode) {
    return NextResponse.json(
      { error: `Code d'offre Boxtal manquant pour ${transporteur} (BOXTAL_OFFER_CODE_${transporteur.toUpperCase()}) — à déterminer en bac à sable avant la première étiquette.` },
      { status: 503 },
    )
  }

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, email, items, shipping_address, boxtal_order_id')
    .eq('id', id)
    .single()
  if (fetchErr || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  if (order.boxtal_order_id) {
    // Protege aussi contre un double clic / double appel : une fois
    // boxtal_order_id pose (apres le premier succes, voir plus bas), tout
    // appel suivant pour la meme commande s'arrete ICI -- avant le moindre
    // appel Boxtal -- jamais une deuxieme etiquette reelle.
    return NextResponse.json({ error: 'Étiquette Boxtal déjà générée pour cette commande — annulez-la avant d’en générer une autre.' }, { status: 400 })
  }

  // Commande 100% tondeuses (dropshipping) : rien a expedier nous-memes --
  // refuse ICI, avant tout appel Boxtal et avant toute ecriture en base
  // (2026-11-17, demande Hedi). Sans ce garde-fou, un appel direct a cette
  // route pour une telle commande (contournant le panneau admin, qui masque
  // deja le bouton dans ce cas) creerait une VRAIE etiquette Boxtal
  // facturable pour une valeur declaree de 0 EUR et une description
  // generique -- rien a voir avec le contenu reel de la commande.
  const items = Array.isArray(order.items) ? (order.items as LigneCommande[]) : []
  const articlesStandard = lignesDuColis(items, 'standard')
  if (articlesStandard.length === 0) {
    return NextResponse.json(
      { error: 'Cette commande ne contient que des tondeuses (expédition fournisseur) — aucune étiquette Boxtal à générer.' },
      { status: 400 },
    )
  }

  const sa = (order.shipping_address ?? {}) as Record<string, unknown>
  const adresse = (sa.address ?? {}) as Record<string, unknown>
  const telephone = typeof sa.phone === 'string' ? sa.phone.trim() : ''
  if (!telephone) {
    return NextResponse.json({ error: 'Numéro de téléphone client manquant (commande passée avant sa collecte) — utilisez le suivi manuel.' }, { status: 400 })
  }
  if (!adresse.line1 || !adresse.postal_code || !adresse.city) {
    return NextResponse.json({ error: 'Adresse de livraison incomplète — utilisez le suivi manuel.' }, { status: 400 })
  }
  // Corse : meme regle que le suivi manuel (/api/admin/ship) -- Chronopost y
  // coute environ 4x le tarif metropole (devis reel), jamais autorise ici non
  // plus, meme par un appel direct qui contournerait le panneau admin.
  if (transporteur === 'chronopost' && estCorse(typeof adresse.postal_code === 'string' ? adresse.postal_code : null)) {
    return NextResponse.json({ error: 'Chronopost indisponible en Corse (tarif ×4 environ) — Colissimo uniquement.' }, { status: 400 })
  }

  let prenom = typeof sa.prenom === 'string' ? sa.prenom.trim() : ''
  let nom = typeof sa.nom === 'string' ? sa.nom.trim() : ''
  if (!prenom || !nom) {
    const division = diviserNomComplet(typeof sa.name === 'string' && sa.name ? sa.name : order.email)
    prenom = prenom || division.prenom
    nom = nom || division.nom
  }

  const destinataire: BoxtalAdresse = {
    prenom,
    nom,
    email: order.email,
    telephone,
    rue: String(adresse.line1) + (adresse.line2 ? ` ${adresse.line2}` : ''),
    codePostal: String(adresse.postal_code),
    ville: String(adresse.city),
    paysIso: typeof adresse.country === 'string' && adresse.country ? adresse.country : 'FR',
  }

  const { data: salon, error: salonErr } = await supabase
    .from('salons')
    .select('adresse, ville, code_postal')
    .eq('slug', 'fougeres')
    .single()
  const senderPhone = process.env.BOXTAL_SENDER_PHONE
  if (salonErr || !salon || !senderPhone) {
    console.error('[Boxtal create-label] adresse expéditeur indisponible :', salonErr?.message ?? 'BOXTAL_SENDER_PHONE absente')
    return NextResponse.json({ error: 'Adresse expéditeur indisponible (configuration serveur) — utilisez le suivi manuel.' }, { status: 503 })
  }
  const expediteur: BoxtalAdresse = {
    prenom: BOXTAL_EXPEDITEUR_NOM.prenom,
    nom: BOXTAL_EXPEDITEUR_NOM.nom,
    email: BOXTAL_EXPEDITEUR_EMAIL,
    telephone: senderPhone,
    rue: String(salon.adresse),
    codePostal: String(salon.code_postal),
    ville: String(salon.ville),
    paysIso: 'FR',
    societe: 'SP Barber Shop',
    residentiel: false,
  }

  // Valeur declaree du colis = prix reel des SEULS articles du colis standard
  // (articlesStandard calcule plus haut, jamais le total de la commande, qui
  // peut inclure le port et/ou le colis fournisseur).
  const { data: overridesRows } = await supabase.from('product_overrides').select('id, price')
  const prixParId = new Map<string, number>((overridesRows ?? []).filter((r) => r.price != null).map((r) => [String(r.id), Number(r.price)]))
  let valeurCentimes = 0
  const noms: string[] = []
  for (const ligne of articlesStandard) {
    const produitId = typeof ligne.id === 'string' ? ligne.id : null
    const base = produitId ? PRODUCTS.find((p) => p.id === produitId) : undefined
    if (!base) continue
    const qty = typeof ligne.qty === 'number' ? ligne.qty : 1
    const prix = prixParId.get(base.id) ?? base.price
    valeurCentimes += prix * qty
    noms.push(base.name)
  }

  try {
    const { id: shippingOrderId } = await creerCommandeExpedition({
      offerCode,
      from: expediteur,
      to: destinataire,
      colis: {
        ...colis,
        valeurEur: Math.round(valeurCentimes) / 100,
        description: noms.join(', ').slice(0, 200) || 'Produits de soin et accessoires',
      },
      externalId: String(order.id),
    })

    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: 'label_ready', carrier: transporteur, boxtal_order_id: shippingOrderId })
      .eq('id', id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, boxtal_order_id: shippingOrderId })
  } catch (e) {
    console.error('[Boxtal create-label] échec :', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Création de l’étiquette Boxtal impossible — utilisez le suivi manuel.' }, { status: 502 })
  }
}
