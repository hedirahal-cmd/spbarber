import { Product, ProductImage, ProductVariant } from '@/types'

/**
 * Sous-ensemble de `images` qui correspond au coloris choisi (matching sur
 * une sous-chaine d'URL, ex. nom de fichier) -- repli sur la galerie complete
 * si rien ne correspond, pour ne jamais vider la galerie a cause d'une photo
 * renommee/re-uploadee cote admin.
 */
export function imagesPourVariante(images: ProductImage[], variant?: ProductVariant): ProductImage[] {
  if (!variant?.imageMatch || variant.imageMatch.length === 0) return images
  const filtrees = images.filter((img) => variant.imageMatch!.some((m) => img.url.includes(m)))
  return filtrees.length > 0 ? filtrees : images
}

export const PRODUCTS: Product[] = [
  {
    id: '2',
    name: 'Shampooing Noir Colorant',
    slug: 'shampooing-noir-colorant',
    description:
      'Le Shampooing Colorant Noir SP Barber est la solution naturelle pour masquer les cheveux blancs et raviver l\'intensité de votre couleur noire. Sans ammoniaque, sans peroxyde, sa formule douce respecte le cuir chevelu tout en déposant des pigments naturels à chaque lavage. Résultat visible dès la première utilisation, la couleur s\'intensifie progressivement pour un rendu naturel et homogène. Idéal pour les hommes qui souhaitent atténuer les reflets gris ou blancs sans passer par une coloration agressive. Compatible avec tous les types de cheveux noirs ou foncés.',
    price: 2890,
    images: [{ url: '/images/products/shampooing-noir.jpg', alt: 'Flacon de Shampooing Noir Colorant SP Barber' }],
    category: 'soin',
    stock: 40,
    is_dropshipping: false,
    benefit: 'Cheveux noirs intenses dès 1 lavage',
    usageTag: 'Cheveux blancs ou gris à camoufler',
    trust: ['Couleur ravivée en 1 lavage', 'Sans ammoniaque ni peroxyde', 'Livraison 3-5 jours ouvrés', 'Satisfait ou remboursé'],
    // Plus de recommandation fixe (2026-10-01, decision Hedi) : carrousel
    // generique a la place (voir genericRecommendations dans [slug]/page.tsx).
    genericRecommendations: true,
    beforeAfterEnabled: true,
    pills: ['Sans ammoniaque', 'Résultat en 1 lavage', 'Tient 3–4 semaines'],
    usageSteps: [
      { label: 'Appliquez', texte: 'Utilisez comme un shampooing ordinaire sur cheveux mouillés' },
      { label: 'Laissez poser', texte: 'Laissez agir 3 minutes — les pigments pénètrent en profondeur' },
      { label: 'Rincez', texte: 'Rincez abondamment — couleur ravivée, cheveux brillants' },
    ],
    seo_title: 'Shampooing Colorant Noir Homme — SP Barber | Masque les Cheveux Blancs',
    seo_description:
      'Masquez vos cheveux blancs en quelques lavages. Shampooing colorant noir naturel pour homme. Résultat visible dès la 1ère utilisation. Sans ammoniaque. Expédition 48h.',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Crème Curl Control',
    slug: 'creme-curl-control',
    description:
      'La Crème Curl Control SP Barber est spécialement formulée pour les hommes aux cheveux bouclés, frisés ou ondulés. Elle définit et discipline les boucles avec légèreté, sans l\'effet cartonné des gels classiques. Sa formule hydratante maintient l\'élasticité des boucles toute la journée tout en nourrissant les cheveux en profondeur. Sans résidu, sans alourdissement, elle offre un coiffage naturel et soigné façon salon. Adaptée à tous les types de boucles, de légèrement ondulées aux frisures serrées, c\'est l\'alliée indispensable de la routine capillaire bouclée masculine.',
    price: 2690,
    images: [{ url: '/images/products/creme-curl.jpg', alt: 'Pot de Crème Curl Control SP Barber pour cheveux bouclés' }],
    category: 'coiffant',
    stock: 35,
    is_dropshipping: false,
    benefit: 'Boucles définies sans effet lourd',
    usageTag: 'Cheveux bouclés, frisés ou ondulés',
    trust: ['Boucles définies & hydratées', 'Sans résidu, sans alourdissement', 'Livraison 3-5 jours ouvrés', 'Satisfait ou remboursé'],
    // Plus de recommandation fixe (2026-10-01, decision Hedi) : carrousel
    // generique a la place (voir genericRecommendations dans [slug]/page.tsx).
    genericRecommendations: true,
    seo_title: 'Crème Curl Cheveux Bouclés Homme — SP Barber | Boucles Définies Sans Résidu',
    seo_description:
      'Crème coiffante curl pour cheveux bouclés et frisés homme. Boucles définies, hydratation longue durée, sans résidu ni alourdissement. Livraison offerte dès 59€.',
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Peigne Texture Expert',
    slug: 'peigne-texture-expert',
    description:
      'Le Peigne Texture Expert SP Barber est l\'outil professionnel incontournable pour sculpter, texturer et coiffer avec précision. Ses dents larges anti-casse sont conçues pour cheveux épais, texturés et bouclés : elles démêlent sans arracher et définissent le style avec précision. Utilisé par les barbiers professionnels, ce peigne homme offre une prise en main ergonomique et une durabilité supérieure aux accessoires classiques. Compatible avec tous types de coiffures masculines, il complète parfaitement votre routine avec la crème curl pour un résultat pro à la maison.',
    price: 1490,
    images: [{ url: '/images/products/peigne-texture.jpg', alt: 'Peigne Texture Expert SP Barber pour barbier professionnel' }],
    category: 'accessoire',
    stock: 80,
    is_dropshipping: false,
    benefit: 'Précision pro — dents anti-casse',
    usageTag: 'Cheveux épais, texturés ou bouclés',
    trust: ['Dents renforcées anti-casse', 'Idéal cheveux épais & texturés', 'Livraison 3-5 jours ouvrés', 'Satisfait ou remboursé'],
    related: ['3'],
    seo_title: 'Peigne Homme Professionnel SP Barber | Texture Expert Dents Anti-Casse',
    seo_description:
      'Peigne texture expert professionnel pour homme. Dents larges anti-casse, idéal cheveux épais et texturés. Précision salon à la maison. Livraison offerte dès 59€.',
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Pack Barbe Complet',
    slug: 'pack-barbe-complet',
    description:
      'Le Pack Barbe Complet SP Barber réunit tout ce qu\'il faut pour entretenir et sublimer sa barbe au quotidien. Ce kit barbe homme de 6 essentiels inclut huile de barbe nourrissante, brosse à barbe, peigne barbe, baume de barbe coiffant, coupe-chou et dermaroller. Sélectionnés par des barbiers professionnels de Fougères, ces produits soin barbe homme offrent un résultat visible dès la première utilisation : barbe douce, hydratée, bien coiffée et parfaitement entretenue. Un cadeau idéal pour homme ou une mise à niveau complète de votre routine barbe.',
    price: 4990,
    images: [{ url: '/images/products/pack-barbe.jpg', alt: "Pack Barbe Complet SP Barber avec 6 produits d'entretien" }],
    category: 'barbe',
    stock: 25,
    is_dropshipping: false,
    // "Valeur 85e, economisez 35e" retire (2026-09-28, decision Hedi) : aucun
    // des articles du pack n'existe comme produit vendu separement dans le
    // catalogue, ce prix de reference n'a donc jamais ete reellement pratique.
    // Composition reelle et definitive (2026-09-30, decision Hedi) : huile de
    // barbe, brosse, peigne, baume, coupe-chou, dermaroller -- plus de
    // shampooing ni ciseaux, qui ne font pas partie du pack.
    benefit: '6 essentiels pour une barbe magnifique',
    usageTag: 'Toutes densités de barbe',
    trust: ['6 produits complémentaires inclus', 'Formulé par des barbiers pro', 'Livraison 3-5 jours ouvrés', 'Satisfait ou remboursé'],
    // Recommande les deux tondeuses (2026-10-01, decision Hedi) -- une barbe
    // bien entretenue va avec une coupe nette.
    related: ['8', '9'],
    seo_title: 'Pack Barbe Complet Homme — SP Barber | Kit 6 Produits Soin Barbe',
    seo_description:
      'Kit barbe complet pour homme : 6 essentiels inclus. Huile, brosse, peigne, baume, coupe-chou, dermaroller. Livraison offerte. Idéal cadeau.',
    created_at: new Date().toISOString(),
  },
  {
    id: '7',
    name: 'Poudre Texturante',
    slug: 'poudre-texturante',
    description:
      'La Poudre Texturante SP Barber apporte volume, grip et style mat instantanément aux cheveux fins ou sans tenue. Sa formule légère en poudre active les racines sans alourdir ni graisser. Facile à appliquer, elle crée une texture naturelle et un effet volume immédiat, idéal pour les coiffures structurées ou décoiffées-coiffées. Plébiscitée par les barbiers professionnels pour les cheveux fins, elle transforme chaque style en coiffure qui dure. Un indispensable de la routine capillaire masculine pour un look naturellement travaillé.',
    price: 2000,
    images: [{ url: '/images/products/poudre-texturante.jpg', alt: 'Pot de Poudre Texturante SP Barber pour volume des cheveux' }],
    category: 'coiffant',
    stock: 45,
    is_dropshipping: false,
    benefit: 'Volume & grip instantanés',
    usageTag: 'Cheveux fins, sans tenue',
    trust: ['Volume instantané dès la racine', 'Effet mat naturel longue tenue', 'Livraison 3-5 jours ouvrés', 'Satisfait ou remboursé'],
    // Une seule recommandation pertinente (2026-10-01, decision Hedi) : le
    // peigne, pas de carrousel generique ici.
    related: ['4'],
    seo_title: 'Poudre Texturante Cheveux Homme — SP Barber | Volume & Grip Mat',
    seo_description:
      'Poudre texturante homme pour volume et grip mat instantanés. Formule légère, idéale cheveux fins. Résultat salon à la maison. Livraison offerte dès 59€.',
    created_at: new Date().toISOString(),
  },
  {
    // NON MISE EN AVANT : actif:false tant que ce chantier (achat direct en
    // dropshipping manuel) n'est pas termine et valide par Hedi -- il passera
    // lui-meme actif:true une fois pret, pas avant. Pas de champ `related`,
    // pour ne pas le faire apparaitre dans "Completez votre routine" ailleurs
    // avant d'etre pret.
    id: '8',
    name: 'Tondeuse BRDCLIP FA1T',
    slug: 'tondeuse-brdclip-fa1t',
    brand: 'BRDCLIP',
    description:
      'La Tondeuse BRDCLIP FA1T embarque des lames en titane pour une coupe précise et durable, sans faux mouvement. Sa batterie Li-ion offre environ 90 minutes d\'autonomie pour une recharge complète d\'environ 2 heures sur son support de charge inclus. Conçue pour un usage à sec, ses lames se rincent facilement à l\'eau pour un entretien simple. Livrée avec plusieurs embouts interchangeables (de 0,5 à 5 mm), elle s\'adapte à toutes les longueurs de coupe, du dégradé le plus court à la finition la plus fournie.',
    price: 2739,
    images: [{ url: '/images/products/tondeuse-brdclip-fa1t.jpg', alt: 'Tondeuse BRDCLIP FA1T SP Barber, lames titane' }],
    category: 'tondeuse',
    stock: 999,
    is_dropshipping: true,
    // Dropshipping manuel : Hedi passe lui-meme la commande chez le
    // fournisseur apres reception du paiement -- pas de redirection client.
    skip_dsers_redirect: true,
    // Lien DSers = note interne pour Hedi, PAS pour le client (voir ci-dessus).
    // Pas encore importe dans son compte DSers ; reference AliExpress pour lui
    // seul, jamais a exposer publiquement : https://fr.aliexpress.com/item/1005006825951304.html
    actif: false,
    benefit: 'Lames titane, 90 min d\'autonomie',
    usageTag: 'Finitions précises et dégradés',
    trust: ['Lames titane précises', 'Usage à sec', 'Livraison sous 2 semaines', 'Satisfait ou remboursé'],
    // Coloris (2026-10-01, decision Hedi) : meme prix et meme stock pour les
    // deux (dropshipping manuel, hors systeme de stock -- cf. pricing.ts), le
    // coloris est une preference visuelle, pas un critere de disponibilite.
    // Photos deja presentes dans product_overrides.images (4 au total) :
    // -2 = vert, -3/-4/-5 = blanc (identifiees visuellement).
    variantKind: 'color',
    variants: [
      { id: 'blanc', name: 'Blanc', stock: 999, imageMatch: ['-3.png', '-4.png', '-5.png'] },
      { id: 'vert', name: 'Vert', stock: 999, imageMatch: ['-2.png'] },
    ],
    seo_title: 'Tondeuse BRDCLIP FA1T — SP Barber | Lames Titane, Sans Fil',
    seo_description:
      'Tondeuse cheveux sans fil BRDCLIP FA1T. Lames titane, autonomie 90 min, usage à sec. Embouts interchangeables 0,5 à 5 mm.',
    created_at: new Date().toISOString(),
  },
  {
    // NON MISE EN AVANT : meme situation que la BRDCLIP FA1T ci-dessus (voir
    // commentaire au-dessus) -- actif:false + pas de `related`.
    id: '9',
    name: 'Tondeuse Kemei KM-999',
    brand: 'Kemei',
    slug: 'tondeuse-kemei-km-999',
    description:
      'La Tondeuse Kemei KM-999 est équipée d\'une lame DLC zéro écart pour une coupe nette, sans tiraillement ni accroche dans les cheveux. Son écran LED affiche en temps réel le niveau de charge de la batterie 1500 mAh, qui offre environ 3 heures d\'utilisation continue pour une recharge USB d\'environ 3 heures. Compacte et sans fil, elle se glisse facilement dans un sac de voyage pour un entretien impeccable en toutes circonstances.',
    price: 2659,
    images: [{ url: '/images/products/tondeuse-kemei-km-999.jpg', alt: 'Tondeuse Kemei KM-999 SP Barber, lame DLC' }],
    category: 'tondeuse',
    stock: 999,
    is_dropshipping: true,
    // Dropshipping manuel : meme principe que la BRDCLIP FA1T ci-dessus.
    skip_dsers_redirect: true,
    // Lien DSers = note interne pour Hedi, PAS pour le client. Pas encore
    // importe dans son compte DSers ; reference AliExpress pour lui seul,
    // jamais a exposer publiquement : https://fr.aliexpress.com/item/1005008348243648.html
    actif: false,
    benefit: 'Lame DLC zéro écart, écran LED',
    usageTag: 'Coupe complète à la maison',
    trust: ['Coupe nette sans tiraillement', 'Écran LED de charge', 'Livraison sous 2 semaines', 'Satisfait ou remboursé'],
    // Coloris (2026-10-01, decision Hedi) : meme principe que la BRDCLIP FA1T
    // ci-dessus. Photos deja presentes dans product_overrides.images :
    // -1/-4/-5 = noir, -3 = rouge (identifiees visuellement).
    variantKind: 'color',
    variants: [
      { id: 'noir', name: 'Noir', stock: 999, imageMatch: ['-1.png', '-4.png', '-5.png'] },
      { id: 'rouge', name: 'Rouge', stock: 999, imageMatch: ['-3.png'] },
    ],
    seo_title: 'Tondeuse Kemei KM-999 — SP Barber | Lame DLC, Écran LED',
    seo_description:
      'Tondeuse cheveux sans fil Kemei KM-999. Lame DLC zéro écart, écran LED de charge, batterie 1500 mAh. Recharge USB rapide.',
    created_at: new Date().toISOString(),
  },
]
