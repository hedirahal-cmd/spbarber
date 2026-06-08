'use client'
import Link from 'next/link'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useCart } from '@/hooks/useCart'

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

  function handleBestSellersClick(e: React.MouseEvent) {
    e.preventDefault()
    setMenuOpen(false)
    if (pathname === '/') {
      document.getElementById('produits')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.location.href = '/#produits'
    }
  }

  return (
    <>
      <div className="ann">
        Livraison offerte dès <b className="ann-gold">49€</b>&nbsp;·&nbsp;<b>Cadeau offert dès 70€</b>&nbsp;·&nbsp;Expédition 48h
      </div>

      <nav className="site-nav">
        <div className="site-nav-inner">

          {/* Gauche : hamburger (mobile) + 4 liens produits/salons (desktop) */}
          <div className="site-nav-left">
            <button
              className="hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="site-nav-links-desktop">
              <a href="/#produits" onClick={handleBestSellersClick}>Best Sellers</a>
              <Link href="/products/pack-barbe-complet">Packs</Link>
              <Link href="/products">Tous les produits</Link>
              <a href="/#salons" onClick={handleSalonsClick}>Nos salons</a>
            </div>
          </div>

          {/* Centre : Logo */}
          <Link href="/" className="site-nav-logo">
            SP<span style={{ color: 'var(--gold)' }}>.</span>BARBER
          </Link>

          {/* Droite : 2 liens secondaires + panier */}
          <div className="site-nav-right">
            <div className="site-nav-links-desktop">
              <Link href="/conseils">Conseils</Link>
              <Link href="/barbers">L&apos;équipe</Link>
            </div>
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

        {/* Menu mobile — tous les liens dans l'ordre gauche → droite */}
        {menuOpen && (
          <div className="mobile-menu">
            <a href="/#produits" onClick={handleBestSellersClick}>Best Sellers</a>
            <Link href="/products/pack-barbe-complet" onClick={() => setMenuOpen(false)}>Packs</Link>
            <Link href="/products" onClick={() => setMenuOpen(false)}>Tous les produits</Link>
            <a href="/#salons" onClick={handleSalonsClick}>Nos salons</a>
            <Link href="/conseils" onClick={() => setMenuOpen(false)}>Conseils</Link>
            <Link href="/barbers" onClick={() => setMenuOpen(false)}>L&apos;équipe</Link>
          </div>
        )}
      </nav>
    </>
  )
}
