'use client'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

const NAV_LINKS = [
  { label: 'Best Sellers', href: '/#produits' },
  { label: 'Packs', href: '/products/pack-barbe-complet' },
  { label: 'Tous les Produits', href: '/products' },
  { label: 'Notre Salon', href: '/#salon' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <div className="ann">
        Livraison offerte dès <b className="ann-gold">49€</b> &nbsp;·&nbsp; <b>Cadeau offert dès 70€</b> &nbsp;·&nbsp; Expédition 48h
      </div>

      <nav className="site-nav">
        <div className="site-nav-inner">
          <div className="site-nav-links-desktop" style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={label} href={href}>
                {label}
              </Link>
            ))}
          </div>

          <div className="site-nav-right">
            <button
              className="hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

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
