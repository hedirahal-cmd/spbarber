/**
 * Banc de verification de diviserNomComplet (2026-11-19, audit externe
 * relaye par Hedi, point 10) -- fonction PURE (aucun I/O), import direct,
 * meme principe que verif-f001.ts/verif-schema.ts.
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-noms.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 */
import { diviserNomComplet } from '../src/lib/noms'

let ok = 0
let ko = 0
function verifie(nom: string, attendu: { prenom: string; nom: string }, obtenu: { prenom: string; nom: string }) {
  const a = JSON.stringify(attendu)
  const o = JSON.stringify(obtenu)
  if (a === o) { ok++; console.log('  OK    ' + nom + '  => ' + o) }
  else { ko++; console.log('  ECHEC ' + nom + '\n        attendu ' + a + '\n        obtenu  ' + o) }
}

console.log('\n--- A. Trait d\'union (prenom compose) ---')
verifie('Jean-Pierre Dupont', { prenom: 'Jean-Pierre', nom: 'Dupont' }, diviserNomComplet('Jean-Pierre Dupont'))
verifie('Anne-Sophie Martin', { prenom: 'Anne-Sophie', nom: 'Martin' }, diviserNomComplet('Anne-Sophie Martin'))
verifie('Jean-Pierre seul (aucun espace)', { prenom: 'Jean-Pierre', nom: 'Jean-Pierre' }, diviserNomComplet('Jean-Pierre'))

console.log('\n--- B. Particules (de, du, le, la, van, el...) ---')
verifie('Jean De La Fontaine (particule juste apres un prenom simple)', { prenom: 'Jean', nom: 'De La Fontaine' }, diviserNomComplet('Jean De La Fontaine'))
verifie('Marie Claire De Smet (particule APRES un prenom compose a espace)', { prenom: 'Marie Claire', nom: 'De Smet' }, diviserNomComplet('Marie Claire De Smet'))
verifie('Amélie Van Damme', { prenom: 'Amélie', nom: 'Van Damme' }, diviserNomComplet('Amélie Van Damme'))
verifie('Omar El Idrissi', { prenom: 'Omar', nom: 'El Idrissi' }, diviserNomComplet('Omar El Idrissi'))
verifie('particule insensible a la casse (DE)', { prenom: 'Marie Claire', nom: 'DE Smet' }, diviserNomComplet('Marie Claire DE Smet'))
verifie('particule = dernier mot (deux mots)', { prenom: 'Jean', nom: 'De' }, diviserNomComplet('Jean De'))

console.log('\n--- C. Nom en un seul mot ---')
verifie('Dupont seul', { prenom: 'Dupont', nom: 'Dupont' }, diviserNomComplet('Dupont'))
verifie('un seul mot avec espaces autour', { prenom: 'Dupont', nom: 'Dupont' }, diviserNomComplet('  Dupont  '))

console.log('\n--- D. Repli ambigu (aucune particule reconnue) : partage au premier espace ---')
verifie('Jean Pierre Dupont (ambigu, documente, non resolu)', { prenom: 'Jean', nom: 'Pierre Dupont' }, diviserNomComplet('Jean Pierre Dupont'))

console.log('\n--- E. Entree vide ou espaces multiples ---')
verifie('chaine vide => valeurs de repli non vides', { prenom: 'Client', nom: 'SP Barber' }, diviserNomComplet(''))
verifie('espaces seuls => valeurs de repli non vides', { prenom: 'Client', nom: 'SP Barber' }, diviserNomComplet('   '))
verifie('espaces multiples normalises', { prenom: 'Jean', nom: 'Dupont' }, diviserNomComplet('Jean    Dupont'))

console.log('\n=======================================')
console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
console.log('=======================================')
process.exitCode = ko === 0 ? 0 : 1
