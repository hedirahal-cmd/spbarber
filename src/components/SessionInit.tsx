'use client'
import { useEffect } from 'react'
import { cleanOldCarts } from '@/lib/session'
import { useCart } from '@/hooks/useCart'

export function SessionInit() {
  useEffect(() => {
    cleanOldCarts()
    // Rehydratation manuelle du panier APRES le montage (voir le
    // commentaire de skipHydration dans useCart.ts) -- le premier rendu
    // client reste identique au serveur (panier vide), puis se met a jour
    // normalement une fois le vrai panier charge depuis localStorage.
    useCart.persist.rehydrate()
  }, [])
  return null
}
