'use client'
import Link from 'next/link'
import { resetConsent } from '@/lib/cookie-consent'

// Fuseau horaire explicite (2026-11-19, audit externe relaye par Hedi,
// meme categorie de defaut que getTomorrowLabel dans ProductDetail.tsx) --
// new Date().getFullYear() seul lit le fuseau du systeme d'execution :
// autour du 31 decembre/1er janvier, le serveur (UTC) et un visiteur a
// Paris (en avance sur UTC) peuvent litteralement etre sur deux annees
// civiles differentes au meme instant.
function anneeCourante(): number {
  return Number(new Intl.DateTimeFormat('fr-FR', { year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date()))
}

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
            <li><Link href="/products/poudre-texturante">Poudre Texturante</Link></li>
            <li><Link href="/products/shampooing-noir-colorant">Shampooing Noir</Link></li>
            <li><Link href="/products/creme-curl-control">Crème Curl</Link></li>
            <li><Link href="/products/peigne-texture-expert">Peigne Expert</Link></li>
            <li><Link href="/products/pack-barbe-complet">Pack Barbe</Link></li>
          </ul>
        </div>

        <div className="ft-col">
          <h4>Aide</h4>
          <ul>
            <li><Link href="/livraison">Livraison</Link></li>
            <li><Link href="/retours">Retours</Link></li>
            <li><Link href="/retractation">Rétractation</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className="ft-col">
          <h4>Nous Suivre</h4>
          <div className="ft-soc">
            <a href="https://www.instagram.com/sp_barbershop_/" target="_blank" rel="noopener noreferrer">
              <div className="ft-soc-i">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
              </div>
              <span>Instagram</span>
            </a>
          </div>
        </div>
      </div>

      <div className="ft-bottom">
        <span className="ft-copy">© {anneeCourante()} SP Barber — Tous droits réservés</span>
        <div className="ft-legal">
          <Link href="/politique-confidentialite">Confidentialité</Link>
          <Link href="/cgv">CGV</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <button type="button" className="ft-legal-cookies" onClick={resetConsent}>
            Gérer les cookies
          </button>
        </div>
      </div>
    </footer>
  )
}
