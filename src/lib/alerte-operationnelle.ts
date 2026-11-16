import { Resend } from 'resend'
import { EXPEDITEUR_EMAIL } from '@/lib/email'

function echapper(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Envoi d'une alerte operationnelle par e-mail (ALERT_EMAIL) -- extrait de
 * src/app/api/webhook/route.ts (2026-11-16) pour etre reutilisable par
 * toutes les routes qui envoient des e-mails transactionnels (webhook
 * Stripe, webhook Boxtal, expedition manuelle admin) : chacune doit pouvoir
 * declencher la meme alerte quand son propre envoi au client echoue.
 *
 * Ne leve jamais et ne bloque jamais l'appelant : une alerte qui casse la
 * route serait pire que pas d'alerte. Si la configuration manque, elle le
 * DIT dans le journal plutot que de se taire.
 *
 * Controle explicitement le champ { error } de la reponse (voir plus bas) :
 * resend.emails.send() ne REJETTE jamais sur une erreur cote API (domaine non
 * verifie, adresse invalide...), elle revient dans { error } SANS exception
 * (node_modules/resend/dist : fetchRequest ne leve que sur un echec reseau).
 * Sans ce controle explicite, une alerte refusee par Resend passerait pour
 * un succes silencieux -- exactement le defaut que cette fonction existe
 * pour supprimer.
 */
export async function envoyerAlerteOperationnelle(
  sujet: string,
  intro: string,
  lignes: [string, string][],
  motifJournal: string,
): Promise<void> {
  const destinataire = process.env.ALERT_EMAIL
  const apiKey = process.env.RESEND_API_KEY

  if (!destinataire || !apiKey) {
    console.error('[alerte operationnelle] NON ENVOYEE (ALERT_EMAIL ou RESEND_API_KEY absent) —', motifJournal)
    return
  }

  const html =
    '<h2>' + echapper(sujet) + '</h2>' +
    '<p>' + intro + '</p><table cellpadding="6">' +
    lignes
      .map(([cle, valeur]) => '<tr><td><b>' + echapper(cle) + '</b></td><td>' + echapper(valeur) + '</td></tr>')
      .join('') +
    '</table>'

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({ from: EXPEDITEUR_EMAIL, to: [destinataire], subject: sujet, html })
    if (error) throw new Error(error.message ?? JSON.stringify(error))
  } catch (e) {
    console.error('[alerte operationnelle] envoi impossible:', e instanceof Error ? e.message : String(e), '—', motifJournal)
  }
}
