import { NextResponse } from 'next/server'
import { estAdmin } from '@/lib/admin-auth'
import { problemeConfigurationBoxtal } from '@/lib/boxtal'

/**
 * Permet au panneau admin de savoir si Boxtal est configure AVANT d'afficher
 * le panneau "Etiquette automatique" (2026-11-11, decision Hedi) -- sans
 * cette route, le panneau s'affichait inconditionnellement et echouait
 * seulement au clic (voir /api/admin/boxtal/create-label). Ne renvoie que
 * le statut, jamais le detail de la cle manquante (pas utile au client, et
 * ca resterait de toute facon un message non sensible -- juste inutile ici).
 */
export async function GET() {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ configure: problemeConfigurationBoxtal() === null })
}
