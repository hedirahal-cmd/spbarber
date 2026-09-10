import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'

export async function GET() {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('salons').select('*').order('ordre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/** '' ou absent -> null ; sinon Number(). Une coordonnee invalide ne doit jamais devenir 0/NaN en base. */
function coordonneeOuNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function PUT(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { slug, id, updated_at, latitude, longitude, ...fields } = body
  if (!slug) return NextResponse.json({ error: 'slug requis' }, { status: 400 })

  const lat = coordonneeOuNull(latitude)
  const lng = coordonneeOuNull(longitude)

  const { data, error } = await supabase
    .from('salons')
    .update({
      ...fields,
      ...(lat !== undefined ? { latitude: lat } : {}),
      ...(lng !== undefined ? { longitude: lng } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // update().eq() sans correspondance reussit avec error: null -- sans ce
  // controle, un slug errone ou une ligne supprimee entre-temps repondrait
  // quand meme 200, comme si la modification avait eu lieu.
  if (!data) return NextResponse.json({ error: 'Salon introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, latitude, longitude, ...body } = await req.json()
  if (!body.slug) return NextResponse.json({ error: 'slug requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('salons')
    .insert([{
      ...body,
      latitude: coordonneeOuNull(latitude) ?? null,
      longitude: coordonneeOuNull(longitude) ?? null,
    }])
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Salon introuvable après création' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slug } = await req.json()
  if (!slug) return NextResponse.json({ error: 'slug requis' }, { status: 400 })

  const { error } = await supabase.from('salons').delete().eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
