export const dynamic = 'force-dynamic'
export const revalidate = 0

import { permanentRedirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DEFAULT_SALONS } from '@/lib/salons'

/**
 * /salon etait jusqu'ici la fiche detaillee du salon de Fougeres, ecrite en dur.
 * Elle devient une redirection permanente vers le salon de plus petit `ordre`
 * (Fougeres aujourd'hui) plutot qu'un index separe : le menu principal ("Nos
 * salons") pointe deja vers /#salons sur l'accueil, qui liste deja tous les
 * salons actifs generiquement -- /salon n'a pas besoin d'etre un second index.
 * Une redirection permanente (308) preserve le referencement deja acquis par
 * cette URL sans dupliquer son contenu.
 */
export default async function SalonIndexRedirect() {
  let slugPrincipal = DEFAULT_SALONS[0].slug

  try {
    const { data } = await supabase
      .from('salons')
      .select('slug')
      .eq('actif', true)
      .order('ordre')
      .limit(1)
      .maybeSingle()
    if (data?.slug) slugPrincipal = data.slug as string
  } catch {}

  permanentRedirect(`/salon/${slugPrincipal}`)
}
