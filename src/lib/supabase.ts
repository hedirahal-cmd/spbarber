import { createClient } from '@supabase/supabase-js'

const stripBom = (s: string): string => s.replace(/^﻿/, '')

const url = stripBom(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
const key = stripBom(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')

export const supabase = createClient(url, key)

// Client server-side avec service_role — bypass RLS, uniquement dans les routes API
const serviceKey = stripBom(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')
export const supabaseAdmin = createClient(url, serviceKey)
