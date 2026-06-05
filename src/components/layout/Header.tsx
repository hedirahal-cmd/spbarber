'use client'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

const NAV_LINKS = [
  { label: 'Cheveux', href: '/products' },
  { label: 'Barbe', href: '/products/pack-barbe-complet' },
  { label: 'Notre Salon', href: '/#salon' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      {/* Announcement bar */}
      <div className="ann">
        Livraison offerte dès 50€ &nbsp;·&nbsp; <b>Cadeau offert dès 70€</b> &nbsp;·&nbsp; Expédition 48h
      </div>

      {/* Nav */}
      <nav className="site-nav">
        <div className="site-nav-inner">
          {/* Desktop centered links */}
          <div className="site-nav-links-desktop" style={{ display: 'flex', gap: 52, alignItems: 'center' }}>
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>

          {/* Right: hamburger (mobile only) */}
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

        {/* Mobile menu */}
        {menuOpen && (
          <div className="mobile-menu">
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}
