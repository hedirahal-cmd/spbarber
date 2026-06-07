import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente — SP Barber',
  description: 'Conditions générales de vente de la boutique en ligne SP Barber. Mentions légales, paiement, livraison et retours.',
  alternates: { canonical: 'https://spbarber.fr/cgv' },
  robots: { index: false },
}

export default async function CGVPage() {
  let dbContent: string | null = null
  try {
    const { data } = await supabase.from('legal_pages').select('content').eq('slug', 'cgv').single()
    if (data?.content) dbContent = data.content as string
  } catch {}

  if (dbContent) return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back">
          <Link href="/">← Retour à l&apos;accueil</Link>
        </div>
        <h1 className="legal-h1">Conditions Générales de Vente</h1>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: 15 }}>{dbContent}</div>
      </div>
    </div>
  )

  return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back">
          <Link href="/">← Retour à l&apos;accueil</Link>
        </div>

        <h1 className="legal-h1">Conditions Générales de Vente</h1>
        <p className="legal-updated">Dernière mise à jour : 5 juin 2026</p>

        <section className="legal-section">
          <h2>Article 1 — Identité du vendeur</h2>
          <p>
            La boutique en ligne <strong>SP Barber</strong> est exploitée par :<br />
            <strong>SP Barber</strong><br />
            48 Boulevard Jean Jaurès<br />
            35300 Fougères, France<br />
            E-mail : contact@spbarber.fr<br />
            (ci-après « le Vendeur »)
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 2 — Champ d&apos;application</h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) régissent toutes les ventes de produits capillaires effectuées via le site internet spbarber.fr (ci-après « le Site »). Elles s&apos;appliquent à tout acheteur consommateur (ci-après « le Client ») au sens de l&apos;article liminaire du Code de la consommation.
          </p>
          <p>
            Toute commande passée sur le Site implique l&apos;acceptation pleine et entière des présentes CGV. Le Vendeur se réserve le droit de modifier ses CGV à tout moment ; les CGV applicables sont celles en vigueur à la date de la commande.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 3 — Produits</h2>
          <p>
            SP Barber propose à la vente des produits capillaires et d&apos;entretien de la barbe (cires, shampoings, crèmes, accessoires, packs), décrits sur le Site avec leurs caractéristiques essentielles.
          </p>
          <p>
            Les photographies et visuels présentés sont non contractuels. Le Vendeur s&apos;engage à décrire les produits avec la plus grande exactitude possible. En cas d&apos;erreur manifeste, le Client peut annuler sa commande dans les conditions prévues à l&apos;article 8.
          </p>
          <p>
            Les produits sont proposés dans la limite des stocks disponibles. En cas d&apos;indisponibilité après validation de la commande, le Vendeur en informera le Client par e-mail dans les meilleurs délais et proposera soit un remboursement intégral, soit un produit de substitution de qualité et de prix équivalents.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 4 — Prix</h2>
          <p>
            Les prix sont indiqués en euros (€), toutes taxes comprises (TTC). La TVA applicable est la TVA française en vigueur au jour de la commande.
          </p>
          <p>
            Les frais de livraison sont indiqués séparément lors du processus de commande et sont à la charge du Client, sauf offre promotionnelle en cours (livraison offerte à partir de 49 € d&apos;achat).
          </p>
          <p>
            Le Vendeur se réserve le droit de modifier ses prix à tout moment, étant entendu que le prix applicable est celui affiché sur le Site au moment de la validation de la commande par le Client.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 5 — Commande</h2>
          <p>Le processus de commande comprend les étapes suivantes :</p>
          <ol>
            <li>Sélection des produits et ajout au panier ;</li>
            <li>Vérification du contenu du panier ;</li>
            <li>Renseignement des coordonnées de livraison ;</li>
            <li>Choix et validation du mode de paiement ;</li>
            <li>Validation définitive de la commande par le Client ;</li>
            <li>Confirmation de commande par e-mail.</li>
          </ol>
          <p>
            La commande est réputée définitive à réception du paiement. Un e-mail de confirmation est envoyé au Client récapitulant les produits commandés, le prix total, les frais de livraison et l&apos;adresse de livraison.
          </p>
          <p>
            Le Vendeur se réserve le droit d&apos;annuler ou de refuser toute commande en cas de litige existant avec le Client, de défaut de paiement ou de suspicion de fraude.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 6 — Paiement</h2>
          <p>
            Le règlement s&apos;effectue en ligne, de manière sécurisée, via la plateforme <strong>Stripe</strong>, par :
          </p>
          <ul>
            <li>Carte bancaire (Visa, Mastercard, American Express) ;</li>
            <li>PayPal ;</li>
            <li>Apple Pay / Google Pay.</li>
          </ul>
          <p>
            Les données bancaires transmises lors du paiement sont cryptées via le protocole SSL et ne sont jamais stockées sur les serveurs du Vendeur. Le paiement est débité immédiatement à la validation de la commande.
          </p>
          <p>
            En cas de paiement refusé, la commande est automatiquement annulée et le Client en est informé par e-mail.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 7 — Livraison</h2>
          <p>
            Les commandes sont expédiées depuis la France vers les destinations suivantes : France métropolitaine, Belgique, Suisse et Luxembourg.
          </p>
          <p>
            <strong>Délais :</strong> Les commandes sont traitées et expédiées sous 24 à 48 heures ouvrées après confirmation du paiement. La livraison est ensuite effectuée sous 3 à 5 jours ouvrés selon le transporteur.
          </p>
          <p>
            <strong>Frais de livraison :</strong> Offerts pour toute commande égale ou supérieure à 49 €. En dessous de ce seuil, les frais de port sont indiqués lors de la commande.
          </p>
          <p>
            <strong>Suivi :</strong> Un e-mail de confirmation d&apos;expédition avec numéro de suivi est envoyé au Client dès l&apos;envoi du colis.
          </p>
          <p>
            En cas de retard de livraison, le Client peut contacter le service client à contact@spbarber.fr. Si le colis n&apos;est pas livré dans un délai de 15 jours ouvrés suivant la date d&apos;expédition (hors cas de force majeure), le Client peut demander la résolution de la vente conformément à l&apos;article L. 216-2 du Code de la consommation.
          </p>
          <p>
            Le transfert des risques de perte et de détérioration des produits s&apos;effectue à la livraison au Client ou en point relais. Le Client est invité à vérifier l&apos;état du colis à la réception en présence du transporteur.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 8 — Droit de rétractation</h2>
          <p>
            Conformément aux articles L. 221-18 et suivants du Code de la consommation, le Client consommateur dispose d&apos;un droit de rétractation de <strong>14 jours calendaires</strong> à compter de la réception des produits, sans avoir à motiver sa décision.
          </p>
          <p>
            <strong>Exercice du droit de rétractation :</strong> Le Client notifie sa décision de se rétracter en contactant le Vendeur par e-mail à contact@spbarber.fr, en précisant le numéro de commande et les articles concernés. Il peut également utiliser le formulaire de rétractation type prévu à l&apos;annexe du Code de la consommation.
          </p>
          <p>
            <strong>Retour des produits :</strong> Le Client retourne les produits dans leur emballage d&apos;origine, en parfait état, non utilisés, dans un délai de 14 jours suivant la notification de rétractation. Les frais de retour sont à la charge du Client.
          </p>
          <p>
            <strong>Remboursement :</strong> Le Vendeur procède au remboursement intégral (prix des produits + frais de livraison initiaux) dans un délai maximum de 14 jours suivant la réception des articles retournés ou la preuve d&apos;expédition, par le même moyen de paiement que celui utilisé lors de la commande.
          </p>
          <p>
            <strong>Exceptions :</strong> Le droit de rétractation ne s&apos;applique pas aux produits descellés ou dont le sceau d&apos;hygiène a été brisé après livraison (conformément à l&apos;article L. 221-28, 5° du Code de la consommation).
          </p>
          <p>
            Par exception à cette règle, et dans un souci de satisfaction client, SP Barber propose une garantie satisfait ou remboursé de <strong>30 jours</strong> sur l&apos;ensemble de ses produits, y compris après première utilisation, à condition que le retour soit motivé par une insatisfaction du produit. Les frais de retour restent à la charge du Client dans ce cas.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 9 — Garanties légales</h2>
          <p>Tous les produits bénéficient des garanties légales suivantes :</p>
          <ul>
            <li>
              <strong>Garantie légale de conformité</strong> (articles L. 217-4 à L. 217-14 du Code de la consommation) : 2 ans à compter de la délivrance du produit. En cas de défaut de conformité, le Client choisit entre la réparation ou le remplacement du produit.
            </li>
            <li>
              <strong>Garantie des vices cachés</strong> (articles 1641 à 1649 du Code civil) : Le Client peut demander la résolution de la vente ou une réduction du prix si un vice caché est constaté, dans les deux ans suivant la découverte du vice.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Article 10 — Responsabilité</h2>
          <p>
            Le Vendeur ne saurait être tenu responsable de l&apos;inexécution du contrat en cas de force majeure, de perturbation ou grève des services postaux et de transport, d&apos;inondations ou incendies.
          </p>
          <p>
            La responsabilité du Vendeur ne pourra être engagée qu&apos;à hauteur du montant de la commande du Client. Les produits sont conformes à la réglementation française en vigueur et aux normes européennes applicables aux cosmétiques.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 11 — Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble du contenu du Site (textes, images, logos, photographies, vidéos, base de données) est la propriété exclusive de SP Barber ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction, représentation, modification ou adaptation, totale ou partielle, est interdite sans autorisation préalable et écrite.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 12 — Données personnelles</h2>
          <p>
            Les données personnelles collectées lors d&apos;une commande sont traitées conformément à la Politique de Confidentialité accessible sur le Site. Conformément au RGPD et à la loi « Informatique et Libertés », le Client dispose d&apos;un droit d&apos;accès, de rectification, d&apos;effacement et de portabilité de ses données.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 13 — Droit applicable et litiges</h2>
          <p>
            Les présentes CGV sont soumises au droit français. En cas de litige relatif à une commande, le Client est invité à contacter le service client par e-mail à contact@spbarber.fr afin de trouver une solution amiable.
          </p>
          <p>
            À défaut de règlement amiable, le Client peut recourir à la médiation de la consommation. Le Vendeur adhère au service de médiation proposé par la plateforme européenne de règlement en ligne des litiges accessible à l&apos;adresse : <strong>https://ec.europa.eu/consumers/odr</strong>.
          </p>
          <p>
            En l&apos;absence de résolution amiable, les tribunaux compétents seront ceux du ressort du domicile du défendeur ou, au choix du consommateur, du lieu de livraison effective du produit.
          </p>
        </section>

        <div className="legal-contact">
          <strong>Contact :</strong> contact@spbarber.fr — SP Barber, 48 Boulevard Jean Jaurès, 35300 Fougères
        </div>
      </div>
    </div>
  )
}
