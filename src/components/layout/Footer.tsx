import Link from 'next/link'

export function Footer() {
  return (
    <footer>
      <div className="ft-grid">
        <div className="ft-brand">
          <span className="ft-logo-txt">
            SP<span style={{ color: 'var(--gold)' }}>.</span>BARBER
          </span>
          <p>Soins professionnels pour hommes exigeants. Directement chez vous ou en boutique à Fougères.</p>
        </div>

        <div className="ft-col">
          <h4>Produits</h4>
          <ul>
            <li><Link href="/products/cire-cheveux-premium">Cire Cheveux</Link></li>
            <li><Link href="/products/shampooing-noir-colorant">Shampooing Noir</Link></li>
            <li><Link href="/products/creme-curl-control">Crème Curl</Link></li>
            <li><Link href="/products/peigne-texture-expert">Peigne Expert</Link></li>
            <li><Link href="/products/tondeuse-fade-pro">Tondeuse Pro</Link></li>
            <li><Link href="/products/pack-barbe-complet">Pack Barbe</Link></li>
          </ul>
        </div>

        <div className="ft-col">
          <h4>Aide</h4>
          <ul>
            <li><Link href="#">Livraison</Link></li>
            <li><Link href="#">Retours</Link></li>
            <li><Link href="#">FAQ</Link></li>
            <li><Link href="#">Contact</Link></li>
          </ul>
        </div>

        <div className="ft-col">
          <h4>Nous Suivre</h4>
          <div className="ft-soc">
            <a href="#" rel="noopener noreferrer">
              <div className="ft-soc-i">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
              </div>
              <span>Instagram</span>
            </a>
            <a href="#" rel="noopener noreferrer">
              <div className="ft-soc-i">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.52V6.76a4.85 4.85 0 01-1.02-.07z"/>
                </svg>
              </div>
              <span>TikTok</span>
            </a>
            <a href="#" rel="noopener noreferrer">
              <div className="ft-soc-i">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.55 3.6 12 3.6 12 3.6s-7.55 0-9.38.47a3.02 3.02 0 00-2.12 2.12C.03 8.04.03 12 .03 12s0 3.96.47 5.81a3.02 3.02 0 002.12 2.12C4.45 20.4 12 20.4 12 20.4s7.55 0 9.38-.47a3.02 3.02 0 002.12-2.12c.47-1.85.47-5.81.47-5.81s0-3.96-.47-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                </svg>
              </div>
              <span>YouTube</span>
            </a>
          </div>
        </div>
      </div>

      <div className="ft-bottom">
        <span className="ft-copy">© {new Date().getFullYear()} SP Barber — Tous droits réservés</span>
        <div className="ft-legal">
          <Link href="#">Confidentialité</Link>
          <Link href="#">CGV</Link>
          <Link href="#">Mentions légales</Link>
        </div>
      </div>
    </footer>
  )
}
