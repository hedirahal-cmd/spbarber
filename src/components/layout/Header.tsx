'use client'
import Link from 'next/link'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useCart } from '@/hooks/useCart'

const NAV_LINKS = [
  { label: 'Produits', href: '/products' },
  { label: 'Barbers', href: '/barbers' },
  { label: 'Conseils', href: '/conseils' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const openCart = useCart((s) => s.openCart)
  const count = useCart((s) => s.itemCount())
  const pathname = usePathname()

  function handleSalonsClick(e: React.MouseEvent) {
    e.preventDefault()
    setMenuOpen(false)
    if (pathname === '/') {
      document.getElementById('salons')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.location.href = '/#salons'
    }
  }

  return (
    <>
      <div className="ann">
        Livraison offerte dès <b className="ann-gold">49€</b>&nbsp;·&nbsp;<b>Cadeau offert dès 70€</b>&nbsp;·&nbsp;Expédition 48h
      </div>

      <nav className="site-nav">
        <div className="site-nav-inner">

          {/* Gauche : hamburger (mobile) + liens nav (desktop) */}
          <div className="site-nav-left">
            <button
              className="hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="site-nav-links-desktop">
              <a href="/#salons" onClick={handleSalonsClick}>Nos salons</a>
              {NAV_LINKS.map(({ label, href }) => (
                <Link key={label} href={href}>{label}</Link>
              ))}
            </div>
          </div>

          {/* Centre : Logo */}
          <Link href="/" className="site-nav-logo">
            SP<span style={{ color: 'var(--gold)' }}>.</span>BARBER
          </Link>

          {/* Droite : Panier uniquement */}
          <div className="site-nav-right">
            <button
              className="site-nav-cart"
              onClick={openCart}
              aria-label="Ouvrir le panier"
            >
              <ShoppingBag size={24} strokeWidth={1.6} />
              {count > 0 && <span className="site-nav-cart-badge">{count}</span>}
            </button>
          </div>

        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="mobile-menu">
            <a href="/#salons" onClick={handleSalonsClick}>Nos salons</a>
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}
