import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'

// Meme bucket Storage que les photos produits -- prefixe "salon-" pour que les
// fichiers restent distincts et reperables, meme si un slug de salon coincidait
// un jour avec un slug de produit.
const BUCKET = 'products'
const PREFIXE = 'salon-'

/**
 * Nom de fichier SEO (salon-slug-N.ext) au lieu d'un nom genere au hasard. Le
 * numero doit etre le plus grand suffixe DEJA UTILISE + 1 -- jamais "nombre de
 * photos actuelles + 1" : une suppression suivie d'un nouvel upload recalculerait
 * sinon un numero deja pris par une photo encore en place, et l'ecraserait en
 * silence. Meme logique que /api/admin/products/upload.
 */
async function prochainNomFichier(slug: string, ext: string): Promise<string> {
  const { data: existants } = await supabaseAdmin.storage
    .from(BUCKET)
    .list('', { search: `${PREFIXE}${slug}-`, limit: 100 })

  const motif = new RegExp(`^${PREFIXE}${slug}-(\\d+)\\.`)
  const max = (existants ?? []).reduce((m, f) => {
    const match = f.name.match(motif)
    return match ? Math.max(m, Number(match[1])) : m
  }, 0)

  return `${PREFIXE}${slug}-${max + 1}.${ext}`
}

export async function POST(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const slug = formData.get('slug') as string | null

  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  // Un salon en cours de creation n'existe pas encore en base -- on ne peut
  // donc pas verifier son slug contre une liste connue comme pour les produits
  // (catalogue fixe). On valide juste un format sur, pour eviter un chemin de
  // stockage exotique (slash, espace, etc.).
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug de salon invalide -- renseignez-le avant d\'ajouter des photos.' }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = await prochainNomFichier(slug, ext)

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
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
