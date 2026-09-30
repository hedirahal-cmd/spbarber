import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'

export async function GET() {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('retraction_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, statut } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  if (statut !== 'en_attente' && statut !== 'traite') {
    return NextResponse.json({ error: 'statut invalide' }, { status: 400 })
  }

  const { data, error } = await supabase.from('retraction_requests').update({ statut }).eq('id', id).select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  return NextResponse.json(data)
}
