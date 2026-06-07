import { createClient } from '@supabase/supabase-js'

const stripBom = (s: string): string => s.replace(/^﻿/, '')

const url = stripBom(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
const key = stripBom(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')

export const supabase = createClient(url, key)
