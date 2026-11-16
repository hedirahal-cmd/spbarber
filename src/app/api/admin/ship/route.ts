import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { estAdmin } from '@/lib/admin-auth'
import { EXPEDITEUR_EMAIL } from '@/lib/email'
import { type Transporteur, type LigneCommande, lignesDuColis, nomsArticles, shipEmailHtml } from '@/lib/shipping-email'
import { estCorse } from '@/lib/geo-france'
import { envoyerAlerteOperationnelle } from '@/lib/alerte-operationnelle'

type Colis = 'standard' | 'tondeuse'

export async function POST(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, tracking_number, carrier, parcel } = await req.json()
  if (!id || !tracking_number?.trim()) {
    return NextResponse.json({ error: 'id et tracking_number requis' }, { status: 400 })
  }
  // Transporteur obligatoire a l'expedition -- defaut 'colissimo' uniquement
  // pour les commandes deja expediees AVANT ce champ (carrier NULL en base),
  // jamais pour une nouvelle expedition : un choix explicite evite qu'un oubli
  // cote formulaire admin n'envoie silencieusement le mauvais nom de
  // transporteur au client.
  if (carrier !== 'colissimo' && carrier !== 'chronopost') {
    return NextResponse.json({ error: 'transporteur invalide (colissimo ou chronopost attendu)' }, { status: 400 })
  }
  const transporteur: Transporteur = carrier
  // 'standard' par defaut : toute commande sans tondeuse (l'immense majorite)
  // n'a jamais qu'un seul colis, et n'a donc pas besoin de preciser ce champ --
  // comportement inchange pour elles.
  const colis: Colis = parcel === 'tondeuse' ? 'tondeuse' : 'standard'

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('email, items, shipping_address')
    .eq('id', id)
    .single()
  if (fetchErr || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  // Corse (2026-10-20, decision Hedi) : Chronopost y coute environ 4x le
  // tarif metropole (devis reel) -- jamais autorise, meme par un appel direct
  // qui contournerait le formulaire admin (voir admin/page.tsx, ou le menu ne
  // propose meme plus l'option). Colissimo reste le seul choix possible.
  const sa = (order.shipping_address ?? {}) as Record<string, unknown>
  const adresseDest = (sa.address ?? {}) as Record<string, unknown>
  if (carrier === 'chronopost' && estCorse(typeof adresseDest.postal_code === 'string' ? adresseDest.postal_code : null)) {
    return NextResponse.json({ error: 'Chronopost indisponible en Corse (tarif ×4 environ) — Colissimo uniquement.' }, { status: 400 })
  }

  const items = Array.isArray(order.items) ? (order.items as LigneCommande[]) : []
  const articlesDeCeColis = lignesDuColis(items, colis)

  // Deux jeux de colonnes independants selon le colis -- jamais le meme
  // paiement de commande ecrase par deux expeditions differentes (voir
  // schema.sql : tracking_number_fournisseur/carrier_fournisseur/
  // shipped_at_fournisseur pour le colis tondeuse).
  const patch: Record<string, unknown> =
    colis === 'tondeuse'
      ? { status: 'shipped', tracking_number_fournisseur: tracking_number.trim(), carrier_fournisseur: transporteur, shipped_at_fournisseur: new Date().toISOString() }
      : { status: 'shipped', tracking_number: tracking_number.trim(), carrier: transporteur, shipped_at: new Date().toISOString() }

  const { error: updateErr } = await supabase.from('orders').update(patch).eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey && order.email) {
    try {
      const resend = new Resend(apiKey)
      // resend.emails.send() ne rejette jamais sur une erreur API, elle
      // revient dans { error } sans exception (voir src/lib/alerte-
      // operationnelle.ts) -- controle explicite indispensable.
      const { error } = await resend.emails.send({
        from: EXPEDITEUR_EMAIL,
        to: [order.email],
        subject: `Votre commande SP Barber est expédiée — ${tracking_number.trim()}`,
        html: shipEmailHtml(tracking_number.trim(), transporteur, nomsArticles(articlesDeCeColis)),
      })
      if (error) throw new Error(error.message ?? JSON.stringify(error))
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      console.error('[Resend ship email]', detail)
      await envoyerAlerteOperationnelle(
        'E-mail d\'expédition non envoyé',
        'La commande a bien été marquée expédiée, mais l&rsquo;e-mail "commande expédiée" au client n&rsquo;a pas pu partir.',
        [
          ['Commande', String(id)],
          ['Client', order.email],
          ['Numéro de suivi', tracking_number.trim()],
          ['Transporteur', transporteur],
          ['Erreur', detail],
          ['Horodatage', new Date().toISOString()],
        ],
        'e-mail expédition (manuel) non envoyé, commande ' + id,
      )
    }
  }

  return NextResponse.json({ ok: true })
}
