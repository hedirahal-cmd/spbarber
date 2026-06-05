import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — SP Barber',
  description: 'Politique de confidentialité et RGPD de SP Barber.',
}

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back">
          <Link href="/">← Retour à l&apos;accueil</Link>
        </div>

        <h1 className="legal-h1">Politique de Confidentialité</h1>
        <p className="legal-updated">Dernière mise à jour : 5 juin 2026</p>

        <section className="legal-section">
          <h2>1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement de vos données personnelles est :<br />
            <strong>SP Barber</strong><br />
            48 Boulevard Jean Jaurès, 35300 Fougères, France<br />
            E-mail : contact@spbarber.fr
          </p>
          <p>
            SP Barber s&apos;engage à traiter vos données personnelles dans le respect du Règlement Général sur la Protection des Données (RGPD) n°2016/679 du 27 avril 2016 et de la loi n°78-17 du 6 janvier 1978 modifiée relative à l&apos;informatique, aux fichiers et aux libertés.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Données collectées</h2>
          <p>SP Barber collecte les données personnelles suivantes dans le cadre de ses activités :</p>

          <h3>2.1 Lors d&apos;une commande</h3>
          <ul>
            <li>Prénom et nom ;</li>
            <li>Adresse e-mail ;</li>
            <li>Adresse postale de livraison ;</li>
            <li>Numéro de téléphone (optionnel) ;</li>
            <li>Données de paiement (gérées exclusivement par Stripe — SP Barber n&apos;accède jamais aux données bancaires brutes) ;</li>
            <li>Historique des commandes et des produits achetés.</li>
          </ul>

          <h3>2.2 Lors de la navigation sur le site</h3>
          <ul>
            <li>Adresse IP ;</li>
            <li>Type de navigateur et système d&apos;exploitation ;</li>
            <li>Pages visitées et durée de visite ;</li>
            <li>Données de session (panier d&apos;achat via localStorage).</li>
          </ul>

          <h3>2.3 Lors d&apos;une demande de contact</h3>
          <ul>
            <li>Adresse e-mail ;</li>
            <li>Contenu du message.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Finalités et bases légales du traitement</h2>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Finalité</th>
                <th>Base légale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Traitement et livraison des commandes</td>
                <td>Exécution du contrat (art. 6.1.b RGPD)</td>
              </tr>
              <tr>
                <td>Gestion du service après-vente et des retours</td>
                <td>Exécution du contrat (art. 6.1.b RGPD)</td>
              </tr>
              <tr>
                <td>Facturation et obligations comptables</td>
                <td>Obligation légale (art. 6.1.c RGPD)</td>
              </tr>
              <tr>
                <td>Lutte contre la fraude</td>
                <td>Intérêt légitime (art. 6.1.f RGPD)</td>
              </tr>
              <tr>
                <td>Amélioration du site et des services</td>
                <td>Intérêt légitime (art. 6.1.f RGPD)</td>
              </tr>
              <tr>
                <td>Envoi d&apos;e-mails transactionnels (confirmation de commande, expédition)</td>
                <td>Exécution du contrat (art. 6.1.b RGPD)</td>
              </tr>
              <tr>
                <td>Prospection commerciale / newsletter (si consentement)</td>
                <td>Consentement (art. 6.1.a RGPD)</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="legal-section">
          <h2>4. Durée de conservation</h2>
          <ul>
            <li><strong>Données de commande :</strong> conservées 5 ans à compter de la commande (obligation comptable et fiscale) ;</li>
            <li><strong>Données de compte client :</strong> conservées 3 ans à compter du dernier achat ou contact ;</li>
            <li><strong>Données de prospection commerciale :</strong> 3 ans à compter du dernier contact ou jusqu&apos;à retrait du consentement ;</li>
            <li><strong>Données de navigation :</strong> 13 mois maximum (conformément aux recommandations de la CNIL) ;</li>
            <li><strong>Pièces comptables :</strong> 10 ans (obligation légale).</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Destinataires des données</h2>
          <p>Vos données personnelles peuvent être transmises aux tiers suivants dans la stricte limite de leurs missions :</p>
          <ul>
            <li>
              <strong>Stripe Inc.</strong> (traitement des paiements) — siège aux États-Unis, avec garanties adéquates (clauses contractuelles types) ;
            </li>
            <li>
              <strong>Transporteurs postaux</strong> (Colissimo, Chronopost, etc.) pour la livraison des commandes ;
            </li>
            <li>
              <strong>Supabase Inc.</strong> (hébergement de la base de données) — données hébergées dans l&apos;Union Européenne (région eu-north-1) ;
            </li>
            <li>
              <strong>Vercel Inc.</strong> (hébergement du site) — données traitées conformément à leur DPA (Data Processing Agreement) ;
            </li>
            <li>
              <strong>Autorités légales</strong> sur réquisition judiciaire.
            </li>
          </ul>
          <p>
            Aucune donnée personnelle n&apos;est vendue ou cédée à des fins commerciales à des tiers.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Transferts hors UE</h2>
          <p>
            Certains de nos prestataires (Stripe, Vercel) sont établis aux États-Unis. Ces transferts sont encadrés par des mécanismes de garanties appropriées conformément au RGPD, notamment les clauses contractuelles types approuvées par la Commission européenne et/ou le cadre EU-US Data Privacy Framework.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Vos droits</h2>
          <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants concernant vos données personnelles :</p>
          <ul>
            <li><strong>Droit d&apos;accès</strong> (art. 15 RGPD) : obtenir une copie de vos données ;</li>
            <li><strong>Droit de rectification</strong> (art. 16 RGPD) : corriger des données inexactes ou incomplètes ;</li>
            <li><strong>Droit à l&apos;effacement</strong> (art. 17 RGPD) : demander la suppression de vos données (« droit à l&apos;oubli ») ;</li>
            <li><strong>Droit à la limitation du traitement</strong> (art. 18 RGPD) : suspendre temporairement le traitement de vos données ;</li>
            <li><strong>Droit à la portabilité</strong> (art. 20 RGPD) : recevoir vos données dans un format structuré ;</li>
            <li><strong>Droit d&apos;opposition</strong> (art. 21 RGPD) : vous opposer au traitement de vos données, notamment à des fins de prospection commerciale ;</li>
            <li><strong>Droit de retrait du consentement</strong> : retirer votre consentement à tout moment sans que cela n&apos;affecte la licéité du traitement effectué avant ce retrait ;</li>
            <li><strong>Droit de définir des directives post-mortem</strong> : définir le sort de vos données après votre décès.</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez SP Barber par e-mail à <strong>contact@spbarber.fr</strong> en indiquant votre nom, prénom, adresse e-mail et la nature de votre demande. Une réponse vous sera apportée dans un délai maximum de 30 jours.
          </p>
          <p>
            En cas de réponse insatisfaisante, vous avez le droit de déposer une plainte auprès de la <strong>CNIL</strong> (Commission Nationale de l&apos;Informatique et des Libertés), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — www.cnil.fr.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Cookies</h2>
          <p>
            <strong>Cookies strictement nécessaires (pas de consentement requis) :</strong>
          </p>
          <ul>
            <li>
              <strong>Panier d&apos;achat</strong> (localStorage) : mémorise le contenu de votre panier entre les pages. Durée : session + persistance locale.
            </li>
            <li>
              <strong>Session admin</strong> (cookie httpOnly) : authentifie les administrateurs du site. Durée : session.
            </li>
          </ul>
          <p>
            <strong>Cookies de paiement (Stripe) :</strong> Stripe dépose des cookies de sécurité anti-fraude sur les pages de paiement. Ces cookies sont nécessaires à la sécurisation des transactions.
          </p>
          <p>
            SP Barber n&apos;utilise pas de cookies publicitaires, de tracking ou d&apos;outils d&apos;analyse de type Google Analytics.
          </p>
          <p>
            Pour gérer vos cookies, rendez-vous dans les paramètres de votre navigateur (Firefox, Chrome, Safari, etc.).
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Sécurité</h2>
          <p>
            SP Barber met en œuvre des mesures techniques et organisationnelles appropriées pour assurer la sécurité de vos données personnelles et les protéger contre toute destruction accidentelle ou illicite, perte accidentelle, altération, diffusion ou accès non autorisé.
          </p>
          <p>
            Les communications entre votre navigateur et notre site sont chiffrées via le protocole TLS (HTTPS). Les données de paiement sont traitées exclusivement par Stripe sur ses serveurs certifiés PCI DSS.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Modifications</h2>
          <p>
            SP Barber se réserve le droit de modifier la présente politique de confidentialité à tout moment pour la mettre en conformité avec les évolutions législatives ou réglementaires. La version en vigueur est celle publiée sur le site à la date de votre consultation.
          </p>
        </section>

        <div className="legal-contact">
          <strong>Contact DPO :</strong> contact@spbarber.fr — SP Barber, 48 Boulevard Jean Jaurès, 35300 Fougères
        </div>
      </div>
    </div>
  )
}
