import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'
import { annulerCommandeExpedition } from '@/lib/boxtal'

/**
 * Annule une etiquette Boxtal -- possible uniquement avant remise au
 * transporteur (l'admin verrouille deja ce bouton une fois le suivi connu,
 * voir admin/page.tsx). Remet la commande en etat "repli manuel possible" :
 * boxtal_order_id/boxtal_label_url efface, statut et tracking_number
 * INCHANGES (un tracking deja recu reste valable meme apres annulation cote
 * nous). Boxtal peut refuser l'annulation pour plusieurs raisons (colis deja
 * pris en charge, cle invalide, etc.) -- traite comme un echec ci-dessous,
 * pas ignore, avec le message d'erreur REEL renvoye par Boxtal plutot qu'une
 * cause supposee (2026-11-13, demande Hedi : un message errone pourrait
 * laisser croire a tort que le colis est deja parti).
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
    .update({ boxtal_order_id: null, boxtal_label_url: null })
    .eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
