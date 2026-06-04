'use client'
import Link from 'next/link'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '@/hooks/useCart'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const itemCount = useCart((s) => s.itemCount())

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: 'var(--black)', borderColor: 'var(--black-border)' }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl tracking-widest uppercase" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--gold)' }}>
          SP Barber
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[['Boutique', '/products'], ['Pack Barbe', '/products/pack-barbe-complet'], ['Tondeuse', '/products/tondeuse-fade-pro']].map(([label, href]) => (
            <Link key={href} href={href} className="text-sm font-medium tracking-widest uppercase hover:text-yellow-400 transition-colors" style={{ color: 'var(--white-muted)', fontFamily: 'Rajdhani, sans-serif' }}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative">
            <ShoppingBag size={22} style={{ color: 'var(--white)' }} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: 'var(--gold)', color: 'var(--black)' }}>
                {itemCount}
              </span>
            )}
          </Link>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-4" style={{ background: 'var(--black-soft)' }}>
          {[['Boutique', '/products'], ['Pack Barbe', '/products/pack-barbe-complet'], ['Tondeuse', '/products/tondeuse-fade-pro']].map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="text-sm tracking-widest uppercase py-2" style={{ color: 'var(--white-muted)' }}>
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
