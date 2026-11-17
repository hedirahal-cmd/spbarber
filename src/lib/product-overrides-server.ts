import { supabaseAdmin } from '@/lib/supabase'
import type { ProductOverride } from '@/lib/product-overrides'

// Cote serveur uniquement (supabaseAdmin = service_role) -- ne pas importer
// depuis un composant client, contrairement a product-overrides.ts qui lui
// est pur et partageable.
//
// SEULE implementation (2026-11-17, demande Hedi) -- src/app/page.tsx et
// src/app/products/page.tsx avaient chacun leur propre copie, divergente :
// repli silencieux sur le catalogue statique en cas d'echec, SANS aucun
// log -- un incident de lecture des prix reels (product_overrides) passait
// totalement inapercu. Journalisation alignee sur ce que products/page.tsx
// faisait deja de mieux (compte + erreur systematiquement journalises).
export async function getProductOverrides(): Promise<Record<string, ProductOverride>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('product_overrides')
      .select('id,name,price,description,stock,benefit,images,actif,before_image_url,after_image_url,is_bestseller,bestseller_ordre,bestseller_badge,bestseller_cat')
    console.log('[product-overrides] lecture :', data?.length ?? 0, 'ligne(s) | erreur :', error?.message ?? null)
    const map: Record<string, ProductOverride> = {}
    ;(data as ProductOverride[] | null)?.forEach((r) => { map[r.id] = r })
    return map
  } catch (e) {
    console.error('[product-overrides] lecture impossible :', e instanceof Error ? e.message : String(e))
    return {}
  }
}
