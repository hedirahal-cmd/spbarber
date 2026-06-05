import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Commande confirmée — SP Barber',
  description: 'Merci pour votre commande SP Barber.',
}

export default function SuccessPage() {
  return (
    <div style={{ minHeight: '60vh', background: 'var(--w)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', fontSize: 28 }}>
          ✓
        </div>

        <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(28px, 5vw, 42px)', letterSpacing: 3, color: 'var(--b)', marginBottom: 12 }}>
          COMMANDE CONFIRMÉE
        </div>

        <p style={{ fontSize: 14, color: 'var(--gt)', lineHeight: 1.7, marginBottom: 32 }}>
          Merci pour votre commande ! Vous recevrez un e-mail de confirmation avec le suivi de votre colis sous 24–48h.
        </p>

        <div style={{ background: 'var(--g)', border: '1px solid var(--gm)', padding: '18px 24px', marginBottom: 32, textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 13, letterSpacing: 2, color: 'var(--b)', marginBottom: 12 }}>LIVRAISON</div>
          <div style={{ fontSize: 13, color: 'var(--gt)', lineHeight: 1.7 }}>
            Expédition sous 24–48h ouvrées<br />
            Livraison 3 à 5 jours ouvrés<br />
            Numéro de suivi envoyé par e-mail
          </div>
        </div>

        <Link
          href="/products"
          style={{ display: 'inline-block', background: 'var(--gold)', color: 'var(--w)', padding: '14px 32px', fontFamily: 'var(--fb)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none' }}
        >
          Continuer mes achats →
        </Link>

        <div style={{ marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 12, color: 'var(--gt)', textDecoration: 'none' }}>
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
