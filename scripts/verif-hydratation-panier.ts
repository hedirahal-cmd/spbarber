/**
 * Banc de verification du correctif d'hydratation du panier (2026-11-19,
 * audit externe relaye par Hedi, point 4 : erreur React #418 sur l'accueil).
 *
 * Cause reelle identifiee : useCart (Zustand + persist) rehydratait depuis
 * localStorage DES la creation du store, au chargement du bundle navigateur
 * -- donc AVANT la passe d'hydratation React. Le serveur rend toujours un
 * panier vide (aucun acces a localStorage cote serveur) ; un visiteur avec
 * un panier non vide voyait donc le badge du panier (Header, CartDrawer)
 * differer entre le HTML serveur et le tout premier rendu client.
 *
 * Correctif : skipHydration:true (src/hooks/useCart.ts) + rehydratation
 * manuelle APRES le montage (src/components/SessionInit.tsx). Ce banc
 * prouve le mecanisme au niveau du store Zustand lui-meme (import frais du
 * module, comme le ferait un bundle navigateur qui demarre) : AUCUNE
 * librairie de rendu/hydratation React n'est necessaire pour eprouver
 * precisement CE mecanisme -- ce que ce banc NE PROUVE PAS, c'est l'absence
 * reelle de l'erreur #418 dans un vrai navigateur (aucun outil de navigateur
 * disponible cette session, voir le rapport).
 *
 * A lancer depuis la racine du depot :
 *     npx tsx scripts/verif-hydratation-panier.ts
 *
 * Il sort en 0 si tout passe, en 1 sinon.
 *
 * SECURITE — aucune base reelle, aucun reseau. Un faux `window`/`localStorage`
 * en memoire, strictement local a ce processus Node, simule le navigateur.
 */

let ok = 0
let ko = 0
function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) { ok++; console.log('  OK    ' + nom) }
  else { ko++; console.log('  ECHEC ' + nom + (detail ? '\n        ' + detail : '')) }
}

/** Faux localStorage en memoire -- juste assez pour sessionCartStorage et getSessionId. */
class FauxLocalStorage {
  private donnees = new Map<string, string>()
  getItem(cle: string): string | null { return this.donnees.get(cle) ?? null }
  setItem(cle: string, valeur: string): void { this.donnees.set(cle, valeur) }
  removeItem(cle: string): void { this.donnees.delete(cle) }
  get [Symbol.toStringTag]() { return 'FauxLocalStorage' }
  keys(): string[] { return Array.from(this.donnees.keys()) }
}

async function main() {
  const faux = new FauxLocalStorage()
  // Simule un navigateur AVANT tout import -- getSessionId()/sessionCartStorage
  // (src/lib/session.ts, src/hooks/useCart.ts) decident de leur comportement
  // via `typeof window === 'undefined'`.
  ;(globalThis as unknown as { window: unknown }).window = {}
  ;(globalThis as unknown as { localStorage: unknown }).localStorage = faux

  const SESSION_ID = 'session-test-fixe'
  faux.setItem('sp_session_id', SESSION_ID)
  // Panier DEJA present en "localStorage" avant meme que le store existe --
  // exactement la situation d'un visiteur qui revient sur le site.
  faux.setItem(
    'cart_' + SESSION_ID,
    JSON.stringify({
      state: {
        items: [{ product: { id: '2', name: 'Shampooing Noir Colorant', price: 4490 }, quantity: 2 }],
      },
      version: 0,
    }),
  )

  // Import APRES la mise en place du faux navigateur -- comme un bundle
  // navigateur qui evalue useCart.ts au demarrage.
  const { useCart } = await import('../src/hooks/useCart')

  console.log('\n--- A. Juste apres import (= chargement du bundle), AVANT toute rehydratation manuelle ---')
  verifie(
    'le panier reste VIDE (identique au rendu serveur) malgre un panier present en localStorage',
    useCart.getState().items.length === 0,
    'obtenu ' + JSON.stringify(useCart.getState().items),
  )
  verifie('hasHydrated() renvoie false (rehydratation pas encore declenchee)', useCart.persist.hasHydrated() === false)

  console.log('\n--- B. Apres rehydrate() manuel (simule SessionInit.tsx, declenche APRES le montage) ---')
  await useCart.persist.rehydrate()
  verifie('le panier reflete maintenant le vrai contenu de localStorage', useCart.getState().items.length === 1, 'obtenu ' + JSON.stringify(useCart.getState().items))
  verifie('produit correct', useCart.getState().items[0]?.product.id === '2')
  verifie('quantite correcte', useCart.getState().items[0]?.quantity === 2)
  verifie('hasHydrated() renvoie true', useCart.persist.hasHydrated() === true)

  console.log('\n--- C. Sans aucun panier en localStorage (premiere visite) : reste vide avant ET apres rehydrate() ---')
  faux.removeItem('cart_' + SESSION_ID)
  useCart.setState({ items: [] })
  await useCart.persist.rehydrate()
  verifie('toujours vide, aucune donnee inventee', useCart.getState().items.length === 0)

  console.log('\n=======================================')
  console.log('  ' + ok + ' OK, ' + ko + ' ECHEC')
  console.log('=======================================')
  process.exitCode = ko === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
