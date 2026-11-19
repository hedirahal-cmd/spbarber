import type { Metadata } from 'next'
import Link from 'next/link'
import { libellesPaysLivrables } from '@/lib/shipping-countries'
import { DELAI_EXPEDITION_FRAGMENT, TRANSIT_TEXTE_COMPACT, TRANSIT_TEXTE_PROSE } from '@/lib/delais'

// France uniquement au lancement (2026-10-21, decision Hedi) -- ces chaines
// SEO sont redigees a la main plutot que generees depuis PAYS_LIVRABLES (un
// titre/une description se reecrivent, ils ne s'enumerent pas) : a adapter
// si un pays est rouvert dans src/lib/shipping-countries.ts.
export const metadata: Metadata = {
  title: { absolute: 'Livraison Colissimo — SP Barber | Offerte dès 59€ | France métropolitaine' },
  description:
    `Livraison Colissimo offerte dès 59€. Préparation ${DELAI_EXPEDITION_FRAGMENT}, livraison ${TRANSIT_TEXTE_COMPACT} en France métropolitaine, Corse comprise. Suivi inclus.`,
  alternates: { canonical: 'https://spbarber.fr/livraison' },
  openGraph: {
    title: 'Livraison SP Barber — Colissimo Offerte dès 59€',
    description: `Livraison Colissimo ${TRANSIT_TEXTE_COMPACT}. Offerte dès 59€ en France métropolitaine.`,
    url: 'https://spbarber.fr/livraison',
  },
}

export default function LivraisonPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back"><Link href="/">← Retour à l&apos;accueil</Link></div>
        <h1 className="legal-h1">Livraison</h1>

        <section className="legal-section">
          <h2>Livraison offerte dès 59 €</h2>
          <p>
            La livraison est <strong>offerte pour toute commande égale ou supérieure à 59 €</strong>. En dessous de ce seuil, les frais de port s&apos;élèvent à 5,90 €, quel que soit le poids du colis.
          </p>
        </section>

        <section className="legal-section">
          <h2>Délais</h2>
          <ul>
            <li><strong>Préparation :</strong> commande préparée {DELAI_EXPEDITION_FRAGMENT} après confirmation du paiement.</li>
            <li><strong>Livraison :</strong> {TRANSIT_TEXTE_PROSE} selon le transporteur et la destination.</li>
          </ul>
          <p>Un e-mail de confirmation d&apos;expédition avec numéro de suivi vous est envoyé dès la prise en charge par le transporteur.</p>
          <p>
            <strong>Exception tondeuses :</strong> nos tondeuses sont expédiées séparément par notre fournisseur
            (livraison sous ~2 semaines, délai indiqué sur chaque fiche produit).
          </p>
        </section>

        <section className="legal-section">
          <h2>Zones desservies</h2>
          <ul>
            {libellesPaysLivrables().map((pays) => <li key={pays}>{pays}</li>)}
          </ul>
          <p>La Corse est desservie comme le reste de la France métropolitaine. Les départements et collectivités d&apos;outre-mer ainsi que l&apos;étranger ne sont pas desservis pour le moment.</p>
        </section>

        <section className="legal-section">
          <h2>Transporteurs</h2>
          <p>Vos commandes sont expédiées via Colissimo ou Chronopost selon le poids et la destination. Un numéro de suivi vous est communiqué par e-mail.</p>
        </section>

        <section className="legal-section">
          <h2>Colis endommagé ou perdu</h2>
          <p>
            En cas de colis endommagé à la réception, notez les dommages en présence du livreur et signalez-le-nous le plus tôt possible à <strong>spbarbershopexploitation@hotmail.com</strong>, avec une photo si possible — cela nous aide à traiter votre demande rapidement, mais ne limite en rien vos droits légaux (garantie légale de conformité, droit de rétractation).
          </p>
          <p>
            En cas de non-livraison après 15 jours ouvrés, contactez-nous : nous ouvrirons une enquête auprès du transporteur et vous proposerons un réenvoi ou un remboursement complet.
          </p>
        </section>

        <div className="legal-contact">
          <strong>Une question sur votre livraison ?</strong> Contactez-nous : spbarbershopexploitation@hotmail.com
        </div>
      </div>
    </div>
  )
}
