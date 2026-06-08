import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

async function authed(): Promise<boolean> {
  return (await cookies()).get('spbarber_admin')?.value === 'authenticated'
}

export async function GET() {
  const { data, error } = await supabase
    .from('temoignages_pros')
    .select('*')
    .order('ordre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!await authed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: _id, ...body } = await req.json()
  const { data, error } = await supabase.from('temoignages_pros').insert([body]).select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Témoignage introuvable après insertion' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  if (!await authed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...rest } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const { data, error } = await supabase.from('temoignages_pros').update(rest).eq('id', id).select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Témoignage introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!await authed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const { error } = await supabase.from('temoignages_pros').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
