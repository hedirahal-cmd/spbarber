import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'

export async function GET() {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, status, fournisseur_commande } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  // Deux commandes independantes sur la meme ligne (statut d'expedition vs.
  // case "commande passee chez le fournisseur") -- ne mettre a jour que le
  // champ effectivement envoye, sinon l'un ecraserait silencieusement l'autre.
  const patch: Record<string, unknown> = {}
  if (status !== undefined) patch.status = status
  if (fournisseur_commande !== undefined) patch.fournisseur_commande = !!fournisseur_commande
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Rien a mettre a jour' }, { status: 400 })

  const { data, error } = await supabase.from('orders').update(patch).eq('id', id).select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Meme principe que salons : sans ce controle, un id de commande inexistant
  // repondrait quand meme 200, et l'interface afficherait un changement de
  // statut qui n'a jamais eu lieu en base.
  if (!data) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  return NextResponse.json(data)
}
