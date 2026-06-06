'use client'
import Link from 'next/link'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '@/hooks/useCart'

const NAV_LINKS = [
  { label: 'Best Sellers', href: '/products' },
  { label: 'Packs', href: '/products/pack-barbe-complet' },
  { label: 'Tous les Produits', href: '/products' },
  { label: 'Notre Salon', href: '/#salon' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const openCart = useCart((s) => s.openCart)
  const count = useCart((s) => s.itemCount())

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
              {NAV_LINKS.map(({ label, href }) => (
                <Link key={label} href={href}>{label}</Link>
              ))}
            </div>
          </div>

          {/* Centre : Logo — positionné en absolu */}
          <Link href="/" className="site-nav-logo">
            SP<span style={{ color: 'var(--gold)' }}>.</span>BARBER
          </Link>

          {/* Droite : Panier */}
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
