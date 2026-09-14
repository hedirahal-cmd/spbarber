import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { noteValide } from '@/lib/reviews'
import { PRODUCTS } from '@/lib/products'

/**
 * Depot public d'avis -- volontairement SANS garde admin, n'importe quel
 * visiteur peut poster. La securite tient a deux choses : la validation
 * stricte ci-dessous, et le fait que rien de ce qui est ecrit ici n'est
 * jamais visible tant qu'un humain (Hedi, via TabAvis) ne l'a pas approuve --
 * visible/verified sont forces cote serveur, jamais lus depuis le corps de
 * la requete.
 */

const LONGUEUR_MAX_NOM = 80
const LONGUEUR_MIN_TEXTE = 10
const LONGUEUR_MAX_TEXTE = 1000
const LONGUEUR_MAX_EMAIL = 200

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  // Piege a robots : un champ cache qu'un visiteur humain ne peut pas remplir.
  // Un bot qui le remplit recoit un faux succes -- ne jamais reveler que la
  // ruse a ete detectee, sinon il s'adapte.
  if (typeof body.site_web === 'string' && body.site_web.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const author = typeof body.author === 'string' ? body.author.trim() : ''
  if (!author || author.length > LONGUEUR_MAX_NOM) {
    return NextResponse.json({ error: `Le nom est requis (${LONGUEUR_MAX_NOM} caractères maximum).` }, { status: 400 })
  }

  const note = noteValide(body.rating)
  if (note === null) {
    return NextResponse.json({ error: 'La note doit être un entier entre 1 et 5.' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (text.length < LONGUEUR_MIN_TEXTE || text.length > LONGUEUR_MAX_TEXTE) {
    return NextResponse.json(
      { error: `Le texte de l'avis doit contenir entre ${LONGUEUR_MIN_TEXTE} et ${LONGUEUR_MAX_TEXTE} caractères.` },
      { status: 400 },
    )
  }

  // Soumis depuis une fiche produit precise : le produit est implicite, pas
  // choisi dans une liste. Un id qui ne correspond a aucun produit reel est
  // simplement ignore (tableau vide) plutot que de faire echouer tout l'avis.
  const productIds = typeof body.product_id === 'string' && PRODUCTS.some((p) => p.id === body.product_id)
    ? [body.product_id]
    : []

  const email = typeof body.email === 'string' && body.email.trim().length > 0
    ? body.email.trim().slice(0, LONGUEUR_MAX_EMAIL)
    : null

  const { error } = await supabase.from('reviews').insert({
    author,
    avatar: '👤',
    rating: note,
    text,
    product_ids: productIds,
    email,
    verified: false,
    visible: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
