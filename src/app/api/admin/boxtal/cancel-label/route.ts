import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'
import { annulerCommandeExpedition } from '@/lib/boxtal'

/**
 * Annule une etiquette Boxtal -- possible uniquement avant remise au
 * transporteur (l'admin verrouille deja ce bouton une fois le suivi connu,
 * voir admin/page.tsx). Boxtal peut refuser l'annulation pour plusieurs
 * raisons (colis deja pris en charge, cle invalide, etc.) -- traite comme un
 * echec ci-dessous, pas ignore, avec le message d'erreur REEL renvoye par
 * Boxtal plutot qu'une cause supposee (2026-11-13, demande Hedi : un message
 * errone pourrait laisser croire a tort que le colis est deja parti).
 *
 * En cas de succes, la commande revient INTEGRALEMENT a l'etat "paid"
 * (2026-11-17, demande Hedi -- revu par rapport au choix initial du
 * 2026-11-13 qui ne reinitialisait que boxtal_order_id/boxtal_label_url) :
 * statut, boxtal_order_id, boxtal_label_url, tracking_number, carrier et
 * shipped_at sont tous effaces/remis a "paid", qu'un numero de suivi ait deja
 * ete recu ou non -- une annulation acceptee par Boxtal signifie qu'aucun
 * colis standard n'est en route, quel que soit l'etat ou on en etait.
 */
export async function POST(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { data: order, error: fetchErr } = await supabase.from('orders').select('boxtal_order_id').eq('id', id).single()
  if (fetchErr || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  if (!order.boxtal_order_id) return NextResponse.json({ error: 'Aucune étiquette Boxtal à annuler pour cette commande.' }, { status: 400 })

  try {
    await annulerCommandeExpedition(order.boxtal_order_id)
  } catch (e) {
    const detail = (e instanceof Error ? e.message : String(e)).slice(0, 300)
    console.error('[Boxtal cancel-label] échec :', detail)
    return NextResponse.json({ error: `Boxtal a refusé l'annulation : ${detail}` }, { status: 502 })
  }

  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      boxtal_order_id: null,
      boxtal_label_url: null,
      tracking_number: null,
      carrier: null,
      shipped_at: null,
    })
    .eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
