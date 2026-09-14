import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'
import { noteValide } from '@/lib/reviews'
import { PRODUCTS } from '@/lib/products'

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

  const note = noteValide(body.rating)
  if (note === null) {
    return NextResponse.json({ error: 'La note doit être un entier entre 1 et 5.' }, { status: 400 })
  }

  // Filtre silencieusement tout id qui ne correspond a aucun produit reel --
  // un id fantome ne doit pas faire echouer tout l'enregistrement de l'avis.
  const idsConnus = new Set(PRODUCTS.map((p) => p.id))
  const productIds = Array.isArray(body.product_ids)
    ? body.product_ids.filter((id: unknown): id is string => typeof id === 'string' && idsConnus.has(id))
    : []

  const { error } = await supabase.from('reviews').insert({
    author: body.author,
    avatar: body.avatar || '👤',
    rating: note,
    text: body.text,
    verified: body.verified ?? true,
    product_ids: productIds,
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
