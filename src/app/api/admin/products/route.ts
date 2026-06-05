import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

async function isAdmin() {
  const store = await cookies()
  return store.get('spbarber_admin')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('product_overrides').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, name, price, description, stock, benefit } = body

  const { error } = await supabase.from('product_overrides').upsert({
    id,
    name: name || null,
    price: price !== undefined ? Number(price) : null,
    description: description || null,
    stock: stock !== undefined ? Number(stock) : null,
    benefit: benefit || null,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
