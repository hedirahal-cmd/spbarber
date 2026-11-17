import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'
import { annulerCommandeExpedition, BoxtalApiError, lireCommandeExpedition, messageLisibleErreurBoxtal } from '@/lib/boxtal'

/**
 * Annule une etiquette Boxtal -- possible uniquement avant remise au
 * transporteur (l'admin verrouille deja ce bouton une fois le suivi connu,
 * voir admin/page.tsx).
 *
 * Avant le DELETE (2026-11-17, demande Hedi suite a un 422 "InvalidRequest
 * Exception" en production) : on LIT l'etat actuel de la commande d'expe-
 * dition cote Boxtal (GET, confirme par la specification officielle v3.1).
 * Si elle est DEJA annulee (ex. a la main sur l'interface Boxtal), on
 * traite ca comme un succes sans meme appeler DELETE -- Boxtal y repond
 * sinon par un 422 generique, sans detail de champ, impossible a distinguer
 * d'un autre refus. Cette lecture n'est PAS bloquante : si elle echoue pour
 * une autre raison, on retente simplement l'annulation normale juste apres,
 * comme avant ce chantier.
 *
 * Pour tout autre refus, le message affiche reprend la VRAIE cause Boxtal
 * (message/code reel, jamais une cause supposee -- 2026-11-13, demande
 * Hedi) mais JAMAIS le JSON brut (2026-11-17, demande Hedi -- voir
 * messageLisibleErreurBoxtal). Le corps complet de la reponse Boxtal est
 * de toute facon deja journalise integralement par appelBoxtal.
 *
 * En cas de succes (annulation reelle OU deja annulee cote Boxtal), la
 * commande revient INTEGRALEMENT a l'etat "paid" (2026-11-17, demande Hedi
 * -- revu par rapport au choix initial du 2026-11-13 qui ne reinitialisait
 * que boxtal_order_id/boxtal_label_url) : statut, boxtal_order_id,
 * boxtal_label_url, tracking_number, carrier et shipped_at sont tous
 * effaces/remis a "paid", quel que soit l'etat ou on en etait.
 */
export async function POST(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { data: order, error: fetchErr } = await supabase.from('orders').select('boxtal_order_id').eq('id', id).single()
  if (fetchErr || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  if (!order.boxtal_order_id) return NextResponse.json({ error: 'Aucune étiquette Boxtal à annuler pour cette commande.' }, { status: 400 })

  let dejaAnnuleeCoteBoxtal = false
  try {
    const etat = await lireCommandeExpedition(order.boxtal_order_id)
    console.log('[Boxtal cancel-label] état lu avant annulation, commande', id, ':', etat.status)
    dejaAnnuleeCoteBoxtal = etat.status === 'CANCELLED'
  } catch (e) {
    console.error('[Boxtal cancel-label] lecture d\'état impossible avant annulation (non bloquant, commande', id, ') :', e instanceof Error ? e.message : String(e))
  }

  if (!dejaAnnuleeCoteBoxtal) {
    try {
      await annulerCommandeExpedition(order.boxtal_order_id)
    } catch (e) {
      console.error('[Boxtal cancel-label] échec de l\'annulation, commande', id, '-- voir la ligne "[Boxtal] erreur" ci-dessus pour le corps complet de la réponse.')
      const message = e instanceof BoxtalApiError
        ? `Boxtal a refusé l'annulation (${messageLisibleErreurBoxtal(e)}) — voir les logs serveur pour le détail complet.`
        : "Boxtal a refusé l'annulation — voir les logs serveur pour le détail complet."
      return NextResponse.json({ error: message }, { status: 502 })
    }
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

  return NextResponse.json({
    ok: true,
    dejaAnnulee: dejaAnnuleeCoteBoxtal,
    message: dejaAnnuleeCoteBoxtal ? 'Étiquette déjà annulée côté Boxtal, commande remise à payée.' : undefined,
  })
}
