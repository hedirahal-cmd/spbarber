/**
 * Contenu visuel partage par opengraph-image.tsx ET twitter-image.tsx
 * (2026-11-17, demande Hedi) -- UNE SEULE source pour les deux, au lieu de
 * deux images differentes (og:image genere dynamiquement, twitter:image
 * resté sur l'ancien fichier statique og-default.jpg). Pure fonction qui
 * rend l'arbre JSX pour next/og (Satori) -- jamais invoquee comme un
 * composant React classique (<ImageContenuSocial/>), toujours appelee
 * directement (ImageContenuSocial()) et passee a `new ImageResponse(...)`.
 */
import { EXPEDITION_TEXTE, RETOUR_TEXTE } from '@/lib/delais'

export function ImageContenuSocial() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0c0c0c',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Gold bar top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: '#b8903a' }} />

      {/* Logo text */}
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: 16,
          color: '#f8f6f3',
          marginBottom: 8,
        }}
      >
        SP BARBER
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 22,
          color: '#b8903a',
          letterSpacing: 6,
          textTransform: 'uppercase',
          marginBottom: 40,
        }}
      >
        Produits Capillaires Premium pour Hommes
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 24 }}>
        {[EXPEDITION_TEXTE, 'Formules Pro', RETOUR_TEXTE].map((label) => (
          <div
            key={label}
            style={{
              padding: '10px 24px',
              border: '1px solid rgba(184,144,58,.4)',
              color: '#d4ac5e',
              fontSize: 14,
              letterSpacing: 2,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* URL */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          fontSize: 16,
          color: 'rgba(248,246,243,0.35)',
          letterSpacing: 2,
        }}
      >
        spbarber.fr
      </div>

      {/* Gold bar bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, backgroundColor: '#b8903a' }} />
    </div>
  )
}
