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
  const { id, name, price, description, stock, benefit, images, social_proof_text, social_proof_visible, before_image_url, after_image_url, actif, is_bestseller, bestseller_ordre, bestseller_badge, bestseller_cat } = body
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  // Deux ecrans admin distincts editent des sous-ensembles differents de cette
  // meme ligne (fiche produit complete vs. onglet Contenu qui ne touche que le
  // texte "ventes de la semaine") -- on part de la ligne existante et on ne
  // remplace que les champs presents dans le corps de la requete, sinon
  // sauvegarder l'un ecraserait silencieusement l'autre avec des null.
  const { data: existant } = await supabase.from('product_overrides').select('*').eq('id', id).maybeSingle()

  const { error } = await supabase.from('product_overrides').upsert({
    id,
    name: name !== undefined ? (name || null) : existant?.name ?? null,
    price: price !== undefined ? Number(price) : existant?.price ?? null,
    description: description !== undefined ? (description || null) : existant?.description ?? null,
    stock: stock !== undefined ? Number(stock) : existant?.stock ?? null,
    benefit: benefit !== undefined ? (benefit || null) : existant?.benefit ?? null,
    images: images !== undefined ? normaliserImages(images) : existant?.images ?? [],
    social_proof_text: social_proof_text !== undefined ? (social_proof_text || null) : existant?.social_proof_text ?? null,
    // != null exclut a la fois undefined ET null : un booleen force via !!
    // n'a pas de notion de "rester tel quel", `!!null` valant false et non
    // null. Un appelant qui renverrait un null explicite (ex. l'objet recu
    // tel quel d'un GET) ecraserait donc silencieusement la valeur existante
    // avec `!== undefined` seul.
    social_proof_visible: social_proof_visible != null ? !!social_proof_visible : existant?.social_proof_visible ?? null,
    before_image_url: before_image_url !== undefined ? (before_image_url || null) : existant?.before_image_url ?? null,
    after_image_url: after_image_url !== undefined ? (after_image_url || null) : existant?.after_image_url ?? null,
    // != null (pas !== undefined) pour actif/is_bestseller : meme piege que
    // social_proof_visible ci-dessus, un booleen force via !! n'a pas de
    // notion de "rester tel quel" avec !== undefined seul.
    actif: actif != null ? !!actif : existant?.actif ?? true,
    is_bestseller: is_bestseller != null ? !!is_bestseller : existant?.is_bestseller ?? false,
    bestseller_ordre: bestseller_ordre !== undefined ? (bestseller_ordre === null ? null : Number(bestseller_ordre)) : existant?.bestseller_ordre ?? null,
    bestseller_badge: bestseller_badge !== undefined ? (bestseller_badge || null) : existant?.bestseller_badge ?? null,
    bestseller_cat: bestseller_cat !== undefined ? (bestseller_cat || null) : existant?.bestseller_cat ?? null,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
