import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t mt-20 py-12" style={{ borderColor: 'var(--black-border)', background: 'var(--black-soft)' }}>
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="text-2xl tracking-widest uppercase mb-3" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--gold)' }}>SP Barber</p>
          <p className="text-sm" style={{ color: 'var(--white-muted)' }}>Produits capillaires premium pour hommes. L'excellence au quotidien.</p>
        </div>
        <div>
          <p className="font-semibold tracking-widest uppercase text-sm mb-3" style={{ color: 'var(--gold)' }}>Navigation</p>
          <nav className="flex flex-col gap-2">
            {[['Boutique', '/products'], ['Mon Panier', '/cart'], ['Admin', '/admin']].map(([label, href]) => (
              <Link key={href} href={href} className="text-sm hover:text-yellow-400 transition-colors" style={{ color: 'var(--white-muted)' }}>{label}</Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="font-semibold tracking-widest uppercase text-sm mb-3" style={{ color: 'var(--gold)' }}>Légal</p>
          <nav className="flex flex-col gap-2">
            {[['CGV', '/cgv'], ['Politique de confidentialité', '/privacy'], ['Mentions légales', '/mentions']].map(([label, href]) => (
              <Link key={href} href={href} className="text-sm hover:text-yellow-400 transition-colors" style={{ color: 'var(--white-muted)' }}>{label}</Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t text-center text-xs" style={{ borderColor: 'var(--black-border)', color: 'var(--white-muted)' }}>
        © {new Date().getFullYear()} SP Barber. Tous droits réservés.
      </div>
    </footer>
  )
}
