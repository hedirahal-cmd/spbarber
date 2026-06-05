import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mentions Légales — SP Barber',
  description: 'Mentions légales du site spbarber.fr.',
}

export default function MentionsLegalesPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <div className="legal-back">
          <Link href="/">← Retour à l&apos;accueil</Link>
        </div>

        <h1 className="legal-h1">Mentions Légales</h1>
        <p className="legal-updated">Dernière mise à jour : 5 juin 2026</p>

        <section className="legal-section">
          <h2>1. Éditeur du site</h2>
          <p>
            Le site <strong>spbarber.fr</strong> est édité par :<br />
            <strong>SP Barber</strong><br />
            48 Boulevard Jean Jaurès<br />
            35300 Fougères, France<br />
            E-mail : contact@spbarber.fr<br />
            Téléphone : disponible par e-mail<br />
            Forme juridique : Entreprise individuelle / Auto-entrepreneur
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Directeur de la publication</h2>
          <p>
            Le directeur de la publication du site spbarber.fr est le responsable de SP Barber, dont le siège social est situé au 48 Boulevard Jean Jaurès, 35300 Fougères.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Hébergeur</h2>
          <p>
            Le site est hébergé par :<br />
            <strong>Vercel Inc.</strong><br />
            340 Pine Street, Suite 701<br />
            San Francisco, CA 94104, États-Unis<br />
            Site : <strong>vercel.com</strong>
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des éléments constituant le site spbarber.fr (textes, graphismes, logiciels, photographies, images, vidéos, sons, plans, noms, logos, marques, créations et œuvres protégeables diverses) sont la propriété exclusive de SP Barber, à l&apos;exception des marques, logos ou contenus appartenant à d&apos;autres sociétés partenaires ou auteurs.
          </p>
          <p>
            Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de SP Barber, conformément aux articles L.335-2 et suivants du Code de propriété intellectuelle.
          </p>
          <p>
            Toute exploitation non autorisée du site ou de l&apos;un quelconque des éléments qu&apos;il contient sera considérée comme constitutive d&apos;une contrefaçon et poursuivie conformément aux dispositions des articles L.335-2 et suivants du Code de propriété intellectuelle.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Données personnelles</h2>
          <p>
            SP Barber collecte des données personnelles dans le cadre de la gestion des commandes et de la relation client. Ces données sont traitées conformément au Règlement Général sur la Protection des Données (RGPD) n°2016/679 du 27 avril 2016 et à la loi n°78-17 du 6 janvier 1978 relative à l&apos;informatique, aux fichiers et aux libertés.
          </p>
          <p>
            Pour toute demande relative à vos données personnelles (accès, rectification, suppression, portabilité, opposition), contactez-nous à : contact@spbarber.fr.
          </p>
          <p>
            Pour plus d&apos;informations, consultez notre{' '}
            <Link href="/politique-confidentialite">Politique de Confidentialité</Link>.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Cookies</h2>
          <p>
            Le site spbarber.fr utilise des cookies techniques nécessaires au bon fonctionnement du service (panier, session). Ces cookies ne collectent pas de données personnelles à des fins marketing et ne nécessitent pas de consentement préalable.
          </p>
          <p>
            L&apos;utilisateur peut désactiver les cookies dans les paramètres de son navigateur, ce qui peut toutefois affecter le bon fonctionnement de certaines fonctionnalités du site.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Limitation de responsabilité</h2>
          <p>
            SP Barber s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur le site. Toutefois, SP Barber ne peut garantir l&apos;exactitude, la précision ou l&apos;exhaustivité des informations mises à disposition sur ce site. En conséquence, SP Barber décline toute responsabilité pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur ce site.
          </p>
          <p>
            SP Barber ne saurait être tenu responsable des dommages directs ou indirects résultant de l&apos;accès au site ou de l&apos;utilisation du site et/ou des informations y figurant.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Droit applicable</h2>
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.
          </p>
        </section>

        <div className="legal-contact">
          <strong>Contact :</strong> contact@spbarber.fr — SP Barber, 48 Boulevard Jean Jaurès, 35300 Fougères
        </div>
      </div>
    </div>
  )
}
