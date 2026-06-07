import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

async function isAdmin() {
  const store = await cookies()
  return store.get('spbarber_admin')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('salons').select('*').order('ordre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { slug, id, updated_at, ...fields } = body
  if (!slug) return NextResponse.json({ error: 'slug requis' }, { status: 400 })

  const { error } = await supabase
    .from('salons')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('slug', slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
