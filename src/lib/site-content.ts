import { supabaseAdmin } from '@/lib/supabase'
import { SITE_CONTENT_DEFAULTS, type SiteContentBlock } from '@/lib/site-content-data'

export type { SiteContentBlock, TrustItem } from '@/lib/site-content-data'
export { SITE_CONTENT_DEFAULTS, SITE_CONTENT_LABELS, SITE_CONTENT_KEYS, TRUST_KEYS, getTrustItems } from '@/lib/site-content-data'

export async function getSiteContent(): Promise<Record<string, SiteContentBlock>> {
  const result: Record<string, SiteContentBlock> = { ...SITE_CONTENT_DEFAULTS }
  try {
    const { data } = await supabaseAdmin.from('site_content').select('key,text,visible')
    if (Array.isArray(data)) {
      for (const row of data as { key: string; text: string; visible: boolean }[]) {
        if (row.key in result) result[row.key] = { text: row.text, visible: row.visible }
      }
    }
  } catch {}
  return result
}
