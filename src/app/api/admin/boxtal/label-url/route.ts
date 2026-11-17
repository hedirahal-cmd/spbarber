import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'

/**
 * Lien signe de courte duree vers l'etiquette PDF d'une commande (2026-11-17,
 * demande Hedi) -- le PDF est dans un bucket PRIVE "etiquettes" (porte nom/
 * adresse/telephone du client, voir /api/webhook/boxtal) : jamais d'URL
 * publique. boxtal_label_url en base contient le CHEMIN dans ce bucket, pas
 * une URL -- cette route le resout en lien signe a la demande, jamais
 * recalcule a l'avance ni mis en cache.
 */
const DUREE_SIGNATURE_SECONDES = 60

export async function GET(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { data: order, error: fetchErr } = await supabase.from('orders').select('boxtal_label_url').eq('id', id).single()
  if (fetchErr || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  if (!order.boxtal_label_url) return NextResponse.json({ error: 'Aucune étiquette disponible pour cette commande.' }, { status: 404 })

  const { data, error } = await supabase.storage.from('etiquettes').createSignedUrl(order.boxtal_label_url, DUREE_SIGNATURE_SECONDES)
  if (error || !data) {
    console.error('[Boxtal label-url] lien signé impossible :', error?.message)
    return NextResponse.json({ error: 'Lien de téléchargement impossible à générer.' }, { status: 502 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
