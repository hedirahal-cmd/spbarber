import { NextResponse } from 'next/server'
import { estAdmin } from '@/lib/admin-auth'
import { listerCategoriesContenu, problemeConfigurationBoxtal } from '@/lib/boxtal'

/**
 * Lecture seule (2026-11-18, demande Hedi suite au premier essai reel
 * refuse) : liste les VRAIES categories de contenu Boxtal du compte, pour
 * verifier sans partager ses cles si "content:v1:30100" (utilise dans
 * create-label/route.ts) existe reellement pour son compte. N'appelle QUE
 * GET /v3.1/content-category -- jamais POST /v3.1/shipping-order, jamais la
 * moindre etiquette creee.
 */
export async function GET() {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const probleme = problemeConfigurationBoxtal()
  if (probleme) return NextResponse.json({ error: probleme }, { status: 503 })

  try {
    const categories = await listerCategoriesContenu()
    return NextResponse.json({ categories })
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    console.error('[Boxtal content-categories] échec :', detail)
    return NextResponse.json({ error: 'Lecture des catégories de contenu Boxtal impossible.' }, { status: 502 })
  }
}
