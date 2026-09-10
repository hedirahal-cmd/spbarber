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
  const { id, status } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Meme principe que salons : sans ce controle, un id de commande inexistant
  // repondrait quand meme 200, et l'interface afficherait un changement de
  // statut qui n'a jamais eu lieu en base.
  if (!data) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  return NextResponse.json(data)
}
