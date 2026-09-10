import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'

export async function GET() {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  // Rejette plutot que de clamper ou de retomber sur 5 en silence : une note
  // hors bornes venait autrefois s'enregistrer telle quelle (999 possible), et
  // '★'.repeat(NaN) plante l'affichage de TOUT le tableau des avis, pas
  // seulement la ligne fautive.
  const note = Number(body.rating)
  if (!Number.isInteger(note) || note < 1 || note > 5) {
    return NextResponse.json({ error: 'La note doit être un entier entre 1 et 5.' }, { status: 400 })
  }

  const { error } = await supabase.from('reviews').insert({
    author: body.author,
    avatar: body.avatar || '👤',
    rating: note,
    text: body.text,
    verified: body.verified ?? true,
    product_name: body.product_name || '',
    visible: body.visible ?? true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...fields } = await req.json()
  const { error } = await supabase.from('reviews').update(fields).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
