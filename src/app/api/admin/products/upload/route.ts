import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'
import { PRODUCTS } from '@/lib/products'

const BUCKET = 'products'

/**
 * Nom de fichier SEO (slug-N.ext) au lieu d'un nom genere au hasard. Le numero
 * doit etre le plus grand suffixe DEJA UTILISE + 1 -- jamais "nombre de photos
 * actuelles + 1" : une suppression suivie d'un nouvel upload recalculerait sinon
 * un numero deja pris par une photo encore en place, et l'ecraserait en silence.
 */
async function prochainNomFichier(slug: string, ext: string): Promise<string> {
  const { data: existants } = await supabaseAdmin.storage
    .from(BUCKET)
    .list('', { search: `${slug}-`, limit: 100 })

  const motif = new RegExp(`^${slug}-(\\d+)\\.`)
  const max = (existants ?? []).reduce((m, f) => {
    const match = f.name.match(motif)
    return match ? Math.max(m, Number(match[1])) : m
  }, 0)

  return `${slug}-${max + 1}.${ext}`
}

export async function POST(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const slug = formData.get('slug') as string | null

  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (!slug || !PRODUCTS.some((p) => p.slug === slug)) {
    return NextResponse.json({ error: 'Produit inconnu' }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = await prochainNomFichier(slug, ext)

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      // Le nom vient de prochainNomFichier(), pense pour ne jamais deja exister --
      // une collision malgre tout est un signal reel (course entre deux uploads
      // simultanes), pas un cas a ecraser silencieusement.
      upsert: false,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path)
  return NextResponse.json({ url: urlData.publicUrl })
}

export async function DELETE(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (typeof url !== 'string') return NextResponse.json({ error: 'URL manquante' }, { status: 400 })

  const marqueur = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marqueur)
  if (idx === -1) return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  const path = decodeURIComponent(url.slice(idx + marqueur.length))

  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
