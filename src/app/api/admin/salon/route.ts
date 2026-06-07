import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

async function isAdmin() {
  const store = await cookies()
  return store.get('spbarber_admin')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('salon_config').select('*').eq('id', 1).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { error } = await supabase.from('salon_config').upsert({
    id: 1,
    phone: body.phone ?? '',
    google_rating: body.google_rating ?? '4,9',
    google_reviews_count: Number(body.google_reviews_count) || 47,
    google_reviews_url: body.google_reviews_url ?? '',
    google_reviews: body.google_reviews ?? [],
    updated_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
