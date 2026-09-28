import { supabaseAdmin } from '@/lib/supabase'
import type { ProductOverride } from '@/lib/product-overrides'

// Cote serveur uniquement (supabaseAdmin = service_role) -- ne pas importer
// depuis un composant client, contrairement a product-overrides.ts qui lui
// est pur et partageable.
export async function getProductOverrides(): Promise<Record<string, ProductOverride>> {
  try {
    const { data } = await supabaseAdmin.from('product_overrides').select('id,name,price,description,stock,benefit,images,social_proof_text,social_proof_visible,actif')
    const map: Record<string, ProductOverride> = {}
    ;(data as ProductOverride[] | null)?.forEach((r) => { map[r.id] = r })
    return map
  } catch {
    return {}
  }
}
