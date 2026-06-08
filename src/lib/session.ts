import { v4 as uuidv4 } from 'uuid'

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('sp_session_id')
  if (!id) {
    id = uuidv4()
    localStorage.setItem('sp_session_id', id)
  }
  return id
}

export function cleanOldCarts(): void {
  if (typeof window === 'undefined') return
  const currentKey = `cart_${getSessionId()}`
  Object.keys(localStorage)
    .filter(k => k.startsWith('cart_'))
    .forEach(k => { if (k !== currentKey) localStorage.removeItem(k) })
}
