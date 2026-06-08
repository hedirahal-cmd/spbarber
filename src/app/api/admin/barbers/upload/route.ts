import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

async function authed(): Promise<boolean> {
  return (await cookies()).get('spbarber_admin')?.value === 'authenticated'
}

export async function POST(req: NextRequest) {
  if (!await authed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const slug = (formData.get('slug') as string | null) || `barber-${Date.now()}`

  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${slug}-${Date.now()}.${ext}`

  const { data, error } = await supabaseAdmin.storage
    .from('barbers')
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: true,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage
    .from('barbers')
    .getPublicUrl(data.path)

  return NextResponse.json({ url: urlData.publicUrl })
}
