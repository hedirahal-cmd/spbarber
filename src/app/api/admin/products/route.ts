import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'

export async function GET() {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('product_overrides').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

type ImageInput = { url?: unknown; alt?: unknown }

/** Limite dure, cote serveur : le client (admin) ne fait pas foi sur ce point. */
const MAX_PHOTOS_PAR_PRODUIT = 6
const MAX_LONGUEUR_ALT = 125

function normaliserImages(images: unknown): { url: string; alt: string }[] {
  if (!Array.isArray(images)) return []
  return (images as ImageInput[])
    .filter((img): img is { url: string; alt?: unknown } => !!img && typeof img.url === 'string' && img.url.length > 0)
    .slice(0, MAX_PHOTOS_PAR_PRODUIT)
    .map((img) => ({
      url: img.url as string,
      alt: typeof img.alt === 'string' ? img.alt.slice(0, MAX_LONGUEUR_ALT) : '',
    }))
}

export async function PUT(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, name, price, description, stock, benefit, images } = body

  const { error } = await supabase.from('product_overrides').upsert({
    id,
    name: name || null,
    price: price !== undefined ? Number(price) : null,
    description: description || null,
    stock: stock !== undefined ? Number(stock) : null,
    benefit: benefit || null,
    images: normaliserImages(images),
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
