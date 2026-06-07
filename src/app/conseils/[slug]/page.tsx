import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, User, ArrowRight } from 'lucide-react'
import { schemaBreadcrumb } from '@/lib/schema'

interface Props {
  params: Promise<{ slug: string }>
}

/* ── Contenu des articles ── */
const ARTICLES: Record<string, {
  title: string
  seoTitle: string
  description: string
  category: string
  readTime: string
  date: string
  body: React.ReactNode
}> = {
  'comment-reussir-son-degrade-a-la-maison': {
    title: 'Comment réussir son dégradé à la maison',
    seoTitle: 'Comment Réussir son Dégradé Homme à la Maison — Guide Barbier SP Barber',
    description:
      'Apprenez à réaliser un dégradé fade parfait à la maison. Guide pas à pas par les barbiers SP Barber de Fougères : outils, techniques et conseils pro.',
    category: 'Coupe & Style',
    readTime: '5 min',
    date: '2025-06-01',
    body: (
      <>
        <p>
          Le <strong>dégradé fade</strong> est la coupe masculine la plus demandée en salon. Qu&apos;il s&apos;agisse
          d&apos;un <strong>skin fade</strong>, d&apos;un <strong>low fade</strong> ou d&apos;un{' '}
          <strong>mid fade</strong>, cette technique de coupe homme donne un rendu net et moderne qui
          sublime tous les types de visage.
        </p>
        <p>
          Bonne nouvelle : avec les bons outils et quelques techniques, il est tout à fait possible de
          réaliser un <strong>dégradé à la maison</strong> digne d&apos;un barbier professionnel.
          Nos barbiers SP Barber de Fougères vous donnent leurs meilleurs conseils.
        </p>

        <h2>Les outils indispensables pour un dégradé réussi</h2>
        <p>
          Avant de commencer, il vous faut le bon équipement. Un <strong>dégradé homme</strong>{' '}
          réussi nécessite :
        </p>
        <ul>
          <li>
            Une <strong>tondeuse professionnelle</strong> avec différents sabots (0,5 mm, 1, 2, 3, 4).
            La qualité des lames est déterminante pour la précision du fade.
          </li>
          <li>
            Un <strong>peigne texture</strong> ou peigne queue de rat pour délimiter les zones de travail.
          </li>
          <li>
            Un miroir de dos pour contrôler les zones inaccessibles.
          </li>
          <li>
            Un bon éclairage — idéalement naturel ou une lampe LED orientable.
          </li>
        </ul>

        <h2>Les étapes clés pour réussir son dégradé fade</h2>

        <h3>1. Délimiter les zones</h3>
        <p>
          La première étape est la plus importante : définir vos trois zones de travail. La{' '}
          <strong>zone basse</strong> (0 à 1 cm au-dessus de la peau) sera la plus courte, la{' '}
          <strong>zone intermédiaire</strong> fera la transition, et la <strong>zone haute</strong> conservera
          la longueur. Cette structure est la base de tout <strong>fade haircut</strong> réussi.
        </p>

        <h3>2. Travailler du bas vers le haut</h3>
        <p>
          Commencez toujours par la zone la plus basse avec votre sabot le plus court (0 ou 0,5 mm pour
          un skin fade). Remontez progressivement en augmentant la longueur du sabot. Le mouvement doit être
          fluide, en arc de cercle, sans à-coups.
        </p>

        <h3>3. La technique du fondu</h3>
        <p>
          Le secret d&apos;un <strong>dégradé impeccable</strong> est la transition invisible entre les zones.
          Pour obtenir ce fondu, alternez entre deux sabots consécutifs sur la ligne de jonction, en faisant
          des mouvements rapides vers l&apos;extérieur. Prenez votre temps — cette étape demande de la
          pratique.
        </p>

        <h3>4. Les finitions au rasoir ou tondeuse sans sabot</h3>
        <p>
          Pour un <strong>skin fade</strong> parfait, les contours et la nuque se finissent sans sabot ou au
          rasoir droit. C&apos;est ce qui donne cet aspect ultra-net caractéristique des coupes de barbier
          professionnel.
        </p>

        <h2>Les erreurs à éviter</h2>
        <ul>
          <li>
            <strong>Couper trop court trop vite :</strong> commencez toujours avec un sabot plus long
            que prévu, vous pourrez affiner ensuite.
          </li>
          <li>
            <strong>Négliger les zones du dessus :</strong> le dégradé doit s&apos;harmoniser avec le
            reste de la coupe. Assurez-vous que les longueurs du dessus sont bien débroussaillées avant
            de commencer.
          </li>
          <li>
            <strong>Se précipiter :</strong> un bon fade prend 20 à 40 minutes, même pour un barbier
            expérimenté.
          </li>
        </ul>

        <h2>Quel produit après la coupe ?</h2>
        <p>
          Une fois votre <strong>coupe dégradé homme</strong> terminée, le style se tient avec le bon
          produit coiffant. Pour une finition nette et structurée, notre{' '}
          <Link href="/products/cire-cheveux-premium">Cire Cheveux Premium SP Barber</Link> offre
          une fixation forte avec un effet naturel — exactement comme en salon. Pour les cheveux
          bouclés, optez pour la{' '}
          <Link href="/products/creme-curl-control">Crème Curl Control</Link>.
        </p>
      </>
    ),
  },

  'meilleurs-produits-barbe-impeccable-2025': {
    title: 'Les meilleurs produits pour une barbe impeccable en 2025',
    seoTitle: 'Meilleurs Produits Barbe Homme 2025 — Guide Complet SP Barber',
    description:
      'Quel produit soin barbe choisir en 2025 ? Huile, baume, cire ou gel : notre guide complet par les barbiers SP Barber pour une barbe parfaitement entretenue.',
    category: 'Soin Barbe',
    readTime: '6 min',
    date: '2025-06-05',
    body: (
      <>
        <p>
          Entretenir sa barbe ne se résume pas à la tailler de temps en temps. Une{' '}
          <strong>barbe impeccable</strong> nécessite une routine adaptée, avec les bons{' '}
          <strong>produits soin barbe homme</strong>. En 2025, l&apos;offre est vaste — et choisir
          entre huile, baume, cire et gel peut sembler complexe. Nos barbiers de Fougères démêlent
          tout pour vous.
        </p>

        <h2>L&apos;huile de barbe : le soin de base incontournable</h2>
        <p>
          L&apos;<strong>huile de barbe</strong> est le produit numéro un de toute routine barbe sérieuse.
          Elle hydrate en profondeur les poils et la peau sous-jacente, prévient les démangeaisons et
          donne à votre barbe un aspect brillant et soigné. Elle s&apos;applique sur barbe légèrement
          humide, en massant depuis la peau vers les pointes.
        </p>
        <p>
          <strong>Pour qui :</strong> tous les types de barbe, particulièrement les barbes longues
          ou sèches.
        </p>

        <h2>Le baume de barbe : coiffage et nutrition</h2>
        <p>
          Le <strong>baume de barbe</strong> combine les propriétés nutritives de l&apos;huile et le
          pouvoir coiffant de la cire. Il aide à discipliner les poils rebelles, structurer la barbe
          et maintenir la forme toute la journée. Sa texture plus épaisse le rend idéal pour les
          barbes de longueur moyenne à longue.
        </p>
        <p>
          <strong>Pour qui :</strong> barbes moyennes à longues, poils indisciplinés, besoin de
          tenue légère à moyenne.
        </p>

        <h2>Le shampooing barbe : une étape souvent négligée</h2>
        <p>
          Beaucoup d&apos;hommes lavent leur barbe avec le shampooing cheveux classique — c&apos;est
          une erreur. Les poils de barbe sont plus épais et plus secs que les cheveux. Un{' '}
          <strong>shampooing barbe spécifique</strong> les nettoie sans agresser, tout en préservant
          les huiles naturelles protectrices.
        </p>

        <h2>Notre sélection 2025 : le kit barbe complet SP Barber</h2>
        <p>
          Pour ceux qui souhaitent une solution clé en main, notre{' '}
          <Link href="/products/pack-barbe-complet">Pack Barbe Complet SP Barber</Link> regroupe
          les 5 essentiels sélectionnés par nos barbiers : huile, baume, shampooing, peigne et ciseaux
          de précision. C&apos;est le <strong>kit barbe homme complet</strong> le mieux noté de notre
          boutique, avec plus de 310 avis 5 étoiles.
        </p>

        <h2>Tableau comparatif : quel produit choisir ?</h2>
        <ul>
          <li><strong>Barbe courte (1–3 semaines) :</strong> huile de barbe + contour rasoir</li>
          <li><strong>Barbe moyenne (1–2 mois) :</strong> baume de barbe + shampooing barbe</li>
          <li><strong>Barbe longue :</strong> huile + baume + peigne barbe + ciseaux</li>
          <li><strong>Poils blancs ou grisonnants :</strong> notre{' '}
            <Link href="/products/shampooing-noir-colorant">Shampooing Colorant Noir</Link>{' '}
            pour raviver la couleur naturellement, sans ammoniaque.
          </li>
        </ul>

        <h2>La routine barbe quotidienne selon nos barbiers</h2>
        <ol>
          <li><strong>Matin :</strong> rincer la barbe à l&apos;eau tiède, appliquer quelques gouttes d&apos;huile.</li>
          <li><strong>Tous les 2–3 jours :</strong> laver au shampooing barbe.</li>
          <li><strong>Après le lavage :</strong> appliquer le baume sur barbe encore légèrement humide.</li>
          <li><strong>Hebdomadaire :</strong> tailler les poindtes aux ciseaux pour maintenir la forme.</li>
        </ol>
      </>
    ),
  },

  'routine-capillaire-homme-5-etapes-essentielles': {
    title: 'Routine capillaire homme : les 5 étapes essentielles',
    seoTitle: 'Routine Capillaire Homme : 5 Étapes Pour des Cheveux Parfaits — SP Barber',
    description:
      'Shampooing, après-shampooing, séchage, coiffage, entretien : la routine capillaire complète en 5 étapes pour des cheveux parfaits. Guide par les barbiers SP Barber.',
    category: 'Routine & Entretien',
    readTime: '7 min',
    date: '2025-06-10',
    body: (
      <>
        <p>
          La <strong>routine capillaire homme</strong> est souvent résumée à un coup de shampooing
          rapide — mais les hommes qui ont vraiment de beaux cheveux savent que ça ne s&apos;arrête
          pas là. En 5 étapes simples et cohérentes, vous pouvez transformer l&apos;état de vos
          cheveux en quelques semaines. Nos barbiers SP Barber vous livrent leur protocole complet.
        </p>

        <h2>Étape 1 : Le shampooing — ni trop, ni trop peu</h2>
        <p>
          Le <strong>soin capillaire masculin</strong> commence par un lavage bien calibré. La
          fréquence idéale dépend de votre type de cheveux :
        </p>
        <ul>
          <li><strong>Cheveux secs :</strong> 2 fois par semaine maximum</li>
          <li><strong>Cheveux normaux :</strong> 3 fois par semaine</li>
          <li><strong>Cheveux gras :</strong> tous les jours ou tous les deux jours</li>
        </ul>
        <p>
          Privilégiez un shampooing adapté à votre type de cheveux. Massez le cuir chevelu avec le
          bout des doigts — pas les ongles — pendant 60 secondes minimum pour stimuler la circulation
          et oxygéner les follicules.
        </p>

        <h2>Étape 2 : L&apos;après-shampooing, souvent oublié par les hommes</h2>
        <p>
          L&apos;après-shampooing est l&apos;étape la plus négligée dans la routine capillaire masculine.
          Pourtant, c&apos;est lui qui nourrit les cheveux en profondeur, ferme les écailles et prévient
          la casse. Appliquez-le sur les longueurs et pointes (jamais sur le cuir chevelu), laissez
          poser 2 minutes, rincez à l&apos;eau froide pour sceller les écailles.
        </p>

        <h2>Étape 3 : Le séchage — la chaleur est l&apos;ennemi</h2>
        <p>
          Évitez de frotter vos cheveux avec la serviette — tamponner doucement suffit. La chaleur
          excessive du sèche-cheveux fragilise la fibre capillaire : utilisez-le à puissance moyenne,
          à 15 cm de distance, et terminez toujours avec un jet d&apos;air froid pour fixer le style.
        </p>

        <h2>Étape 4 : Le coiffage avec le bon produit</h2>
        <p>
          Le choix du <strong>produit coiffant homme</strong> dépend du rendu voulu et de votre type
          de cheveux :
        </p>
        <ul>
          <li>
            <strong>Fixation forte, effet mat :</strong>{' '}
            <Link href="/products/cire-cheveux-premium">Cire Cheveux Premium SP Barber</Link>{' '}
            — pour des coiffures nettes et structurées.
          </li>
          <li>
            <strong>Cheveux bouclés ou frisés :</strong>{' '}
            <Link href="/products/creme-curl-control">Crème Curl Control</Link>{' '}
            — définit les boucles sans alourdir.
          </li>
          <li>
            <strong>Tenue légère, look naturel :</strong> une noisette de baume ou quelques gouttes
            d&apos;huile suffisent.
          </li>
        </ul>
        <p>
          Appliquez toujours le produit sur cheveux légèrement humides pour une meilleure répartition
          et une tenue optimale.
        </p>

        <h2>Étape 5 : L&apos;entretien régulier chez le barbier</h2>
        <p>
          Même avec la meilleure routine à la maison, les <strong>cheveux homme</strong> bénéficient
          d&apos;une coupe régulière tous les 3 à 5 semaines. C&apos;est le secret des hommes qui ont
          toujours l&apos;air impeccable : des pointes saines, une forme maintenue. Si vous êtes à
          Fougères ou en Ille-et-Vilaine, nos barbiers SP Barber sont là pour entretenir votre coupe
          entre deux séances à la maison.
        </p>
      </>
    ),
  },
}

export function generateStaticParams() {
  return Object.keys(ARTICLES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = ARTICLES[slug]
  if (!article) return {}

  const url = `https://spbarber.fr/conseils/${slug}`
  return {
    title: article.seoTitle,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      title: article.seoTitle,
      description: article.description,
      url,
      type: 'article',
      publishedTime: article.date,
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = ARTICLES[slug]
  if (!article) notFound()

  const breadcrumb = schemaBreadcrumb([
    { name: 'Accueil', url: 'https://spbarber.fr' },
    { name: 'Conseils', url: 'https://spbarber.fr/conseils' },
    { name: article.title, url: `https://spbarber.fr/conseils/${slug}` },
  ])

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: {
      '@type': 'Organization',
      name: 'SP Barber',
      url: 'https://spbarber.fr',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SP Barber',
      url: 'https://spbarber.fr',
    },
    mainEntityOfPage: `https://spbarber.fr/conseils/${slug}`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="article-page">
        {/* Breadcrumb */}
        <nav className="article-bc" aria-label="Fil d'Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true"> › </span>
          <Link href="/conseils">Conseils</Link>
          <span aria-hidden="true"> › </span>
          <span>{article.title}</span>
        </nav>

        {/* Header article */}
        <header className="article-header">
          <div className="article-cat">{article.category}</div>
          <h1 className="article-title">{article.title}</h1>
          <div className="article-meta">
            <div className="article-meta-item">
              <Clock size={13} strokeWidth={2} />
              <span>{article.readTime} de lecture</span>
            </div>
            <div className="article-meta-item">
              <User size={13} strokeWidth={2} />
              <span>Par les barbiers SP Barber, Fougères</span>
            </div>
          </div>
        </header>

        {/* Corps */}
        <div className="article-body">
          {article.body}
        </div>

        {/* CTA */}
        <div className="article-cta-box">
          <p className="article-cta-txt">
            Les produits mentionnés dans cet article sont disponibles dans notre boutique en ligne — livrés en 48h en France.
          </p>
          <Link href="/products" className="article-cta-btn">
            Voir tous les produits <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Nav bas */}
        <div className="article-footer-nav">
          <Link href="/conseils" className="article-back">
            <ArrowLeft size={14} strokeWidth={2} /> Tous les conseils
          </Link>
        </div>
      </div>
    </>
  )
}
