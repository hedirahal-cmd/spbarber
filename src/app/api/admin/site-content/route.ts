import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { estAdmin } from '@/lib/admin-auth'
import { getSiteContent, SITE_CONTENT_KEYS } from '@/lib/site-content'

const CLES_CONNUES = new Set<string>(SITE_CONTENT_KEYS)
const LONGUEUR_MAX_TEXTE = 300

export async function GET() {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const content = await getSiteContent()
  return NextResponse.json(content)
}

export async function PUT(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  const { key, text, visible } = body
  // Cle fixee a l'avance (pas de saisie libre) : evite de creer des lignes
  // fantomes qu'aucune page ne lira jamais.
  if (typeof key !== 'string' || !CLES_CONNUES.has(key)) {
    return NextResponse.json({ error: 'Clé de contenu inconnue' }, { status: 400 })
  }
  const texteNettoye = typeof text === 'string' ? text.trim() : ''
  if (!texteNettoye || texteNettoye.length > LONGUEUR_MAX_TEXTE) {
    return NextResponse.json({ error: `Le texte doit contenir entre 1 et ${LONGUEUR_MAX_TEXTE} caractères.` }, { status: 400 })
  }

  const { error } = await supabase.from('site_content').upsert({
    key,
    text: texteNettoye,
    visible: !!visible,
    updated_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
