/**
 * Banc de verification des donnees structurees JSON-LD (2026-11-17, demande
 * Hedi) : aggregateRating (note_google/nombre_avis) n'est emis QUE si les
 * deux valeurs sont presentes ET coherentes -- note entre 1 et 5 inclus,
 * nombre_avis entier >= 1 -- jamais une simple presence/troncature. La vraie
 * note actuelle des deux salons (Fougeres 4.7/76, Ernee 5.0/38) doit rester
 * affichee (bornes incluses, voir le dernier cas).
 *
 * Fonctions PURES (aucun I/O) -- import direct, pas de serveur Next.js ni de
 * faux Supabase necessaire, meme principe que verif-f001.ts pour
 * resolveCartItems.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-schema.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 */
import { schemaSalon, schemaOrganizationLocal } from '@/lib/schema'
import type { Salon } from '@/lib/salons'

let ok = 0
let ko = 0
function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) { ok++; console.log('  OK    ' + nom) }
  else { ko++; console.log('  ECHEC ' + nom + (detail ? '\n        ' + detail : '')) }
}

function salonDeBase(overrides: Partial<Salon> = {}): Salon {
  return {
    slug: 'test', nom: 'Test', adresse: '1 rue test', ville: 'Testville', code_postal: '00000',
    telephone: null, horaires: null, note_google: null, nombre_avis: null,
    lien_planity: null, lien_google_maps: null, actif: true,
    ...overrides,
  }
}

type AvecAggregateRating = { aggregateRating?: { ratingValue: string; reviewCount: string } }

function main() {
  console.log('\n--- A. note_google ET nombre_avis réels et cohérents (Fougères, 4.7/76) : aggregateRating ÉMIS ---')
  let s = schemaSalon(salonDeBase({ note_google: '4.7', nombre_avis: '76' })) as AvecAggregateRating
  verifie('aggregateRating présent', !!s.aggregateRating, JSON.stringify(s.aggregateRating))
  verifie('ratingValue = "4.7" (vraie valeur, pas arrondie/inventée)', s.aggregateRating?.ratingValue === '4.7')
  verifie('reviewCount = "76"', s.aggregateRating?.reviewCount === '76')

  console.log('\n--- B. Note hors bornes (6.2, > 5) : aggregateRating OMIS ---')
  s = schemaSalon(salonDeBase({ note_google: '6.2', nombre_avis: '10' })) as AvecAggregateRating
  verifie('aggregateRating absent', !s.aggregateRating, JSON.stringify(s.aggregateRating))

  console.log('\n--- C. Note nulle ou négative (0) : aggregateRating OMIS ---')
  s = schemaSalon(salonDeBase({ note_google: '0', nombre_avis: '10' })) as AvecAggregateRating
  verifie('aggregateRating absent', !s.aggregateRating)

  console.log('\n--- D. Nombre d\'avis non entier (12.5) : aggregateRating OMIS ---')
  s = schemaSalon(salonDeBase({ note_google: '4.5', nombre_avis: '12.5' })) as AvecAggregateRating
  verifie('aggregateRating absent', !s.aggregateRating)

  console.log('\n--- E. Nombre d\'avis à zéro : aggregateRating OMIS ---')
  s = schemaSalon(salonDeBase({ note_google: '4.5', nombre_avis: '0' })) as AvecAggregateRating
  verifie('aggregateRating absent', !s.aggregateRating)

  console.log('\n--- F. Note non numérique ("très bien") : aggregateRating OMIS ---')
  s = schemaSalon(salonDeBase({ note_google: 'très bien', nombre_avis: '10' })) as AvecAggregateRating
  verifie('aggregateRating absent', !s.aggregateRating)

  console.log('\n--- G. Un seul des deux champs présent : aggregateRating OMIS ---')
  s = schemaSalon(salonDeBase({ note_google: '4.5', nombre_avis: null })) as AvecAggregateRating
  verifie('absent (nombre_avis manquant)', !s.aggregateRating)
  s = schemaSalon(salonDeBase({ note_google: null, nombre_avis: '10' })) as AvecAggregateRating
  verifie('absent (note_google manquante)', !s.aggregateRating)

  console.log('\n--- H. Bornes EXACTES (5.0 haute, 1/1 basses) : aggregateRating ÉMIS (inclusif) ---')
  s = schemaSalon(salonDeBase({ note_google: '5.0', nombre_avis: '38' })) as AvecAggregateRating
  verifie('note 5.0 (borne haute, Ernée) acceptée', !!s.aggregateRating, JSON.stringify(s.aggregateRating))
  s = schemaSalon(salonDeBase({ note_google: '1', nombre_avis: '1' })) as AvecAggregateRating
  verifie('note 1 / nombre_avis 1 (bornes basses) acceptées', !!s.aggregateRating)

  console.log('\n--- I. Même logique dans schemaOrganizationLocal() (accueil) ---')
  const org = schemaOrganizationLocal(salonDeBase({ note_google: '4.7', nombre_avis: '76' })) as { '@graph': AvecAggregateRating[] }
  const localBusiness = org['@graph'].find((b) => !!b.aggregateRating || 'aggregateRating' in b)
  verifie('aggregateRating présent sur l\'accueil avec des valeurs réelles', !!localBusiness?.aggregateRating, JSON.stringify(org['@graph']))
  const orgInvalide = schemaOrganizationLocal(salonDeBase({ note_google: '0', nombre_avis: '76' })) as { '@graph': AvecAggregateRating[] }
  verifie('aggregateRating absent sur l\'accueil avec une note invalide', !orgInvalide['@graph'].some((b) => !!b.aggregateRating))

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  process.exitCode = ko === 0 ? 0 : 1
}

main()
