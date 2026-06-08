'use client'
import { useEffect } from 'react'
import { cleanOldCarts } from '@/lib/session'

export function SessionInit() {
  useEffect(() => { cleanOldCarts() }, [])
  return null
}
