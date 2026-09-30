import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { EXPEDITEUR_EMAIL } from '@/lib/email'

/**
 * Depot public d'une demande de retractation -- volontairement SANS garde
 * admin, n'importe quel visiteur peut la soumettre (obligation legale d'un
 * parcours accessible en ligne, sans compte). Meme protection anti-robot
 * (piege invisible) que /api/reviews.
 */

const LONGUEUR_MAX_NOM = 120
const LONGUEUR_MAX_EMAIL = 200
const LONGUEUR_MAX_COMMANDE = 60
const LONGUEUR_MAX_PRODUITS = 500
const LONGUEUR_MAX_MOTIF = 1000

function echapper(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emailValide(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  // Piege a robots : cf. /api/reviews -- un bot qui le remplit recoit un faux
  // succes, rien n'est enregistre, jamais revele que la ruse a ete detectee.
  if (typeof body.site_web === 'string' && body.site_web.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const nom = typeof body.nom === 'string' ? body.nom.trim() : ''
  if (!nom || nom.length > LONGUEUR_MAX_NOM) {
    return NextResponse.json({ error: `Le nom est requis (${LONGUEUR_MAX_NOM} caractères maximum).` }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email || email.length > LONGUEUR_MAX_EMAIL || !emailValide(email)) {
    return NextResponse.json({ error: 'Une adresse e-mail valide est requise.' }, { status: 400 })
  }

  const produits = typeof body.produits === 'string' ? body.produits.trim() : ''
  if (!produits || produits.length > LONGUEUR_MAX_PRODUITS) {
    return NextResponse.json({ error: `Le ou les produits concernés sont requis (${LONGUEUR_MAX_PRODUITS} caractères maximum).` }, { status: 400 })
  }

  const numero_commande = typeof body.numero_commande === 'string' && body.numero_commande.trim()
    ? body.numero_commande.trim().slice(0, LONGUEUR_MAX_COMMANDE)
    : null

  const date_commande = typeof body.date_commande === 'string' && body.date_commande.trim()
    ? body.date_commande.trim()
    : null

  const motif = typeof body.motif === 'string' && body.motif.trim()
    ? body.motif.trim().slice(0, LONGUEUR_MAX_MOTIF)
    : null

  const { error } = await supabase.from('retraction_requests').insert({
    nom,
    email,
    numero_commande,
    date_commande,
    produits,
    motif,
    statut: 'en_attente',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Les deux e-mails ne doivent jamais faire echouer la demande elle-meme --
  // deja enregistree en base a ce stade, c'est ce qui compte legalement.
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    const resend = new Resend(apiKey)
    const recap =
      '<p><b>Nom :</b> ' + echapper(nom) + '</p>' +
      '<p><b>E-mail :</b> ' + echapper(email) + '</p>' +
      (numero_commande ? '<p><b>Numéro de commande :</b> ' + echapper(numero_commande) + '</p>' : '') +
      (date_commande ? '<p><b>Date de commande :</b> ' + echapper(date_commande) + '</p>' : '') +
      '<p><b>Produit(s) concerné(s) :</b> ' + echapper(produits) + '</p>' +
      (motif ? '<p><b>Motif :</b> ' + echapper(motif) + '</p>' : '')

    try {
      await resend.emails.send({
        from: EXPEDITEUR_EMAIL,
        to: [email],
        subject: 'Votre demande de rétractation — SP Barber',
        html:
          '<h2>Demande de rétractation bien reçue</h2>' +
          '<p>Bonjour ' + echapper(nom) + ',</p>' +
          '<p>Nous avons bien reçu votre demande de rétractation. Voici le récapitulatif :</p>' +
          recap +
          '<p>Notre équipe va traiter votre demande dans les meilleurs délais et reviendra vers vous par e-mail si besoin.</p>' +
          '<p>SP Barber</p>',
      })
    } catch (e) {
      console.error('[retractation] envoi confirmation client impossible:', e instanceof Error ? e.message : String(e))
    }

    const destinataire = process.env.ALERT_EMAIL
    if (destinataire) {
      try {
        await resend.emails.send({
          from: EXPEDITEUR_EMAIL,
          to: [destinataire],
          subject: 'Nouvelle demande de rétractation',
          html: '<h2>Nouvelle demande de rétractation</h2>' + recap,
        })
      } catch (e) {
        console.error('[retractation] envoi notification interne impossible:', e instanceof Error ? e.message : String(e))
      }
    }
  } else {
    console.error('[retractation] RESEND_API_KEY absente : aucun e-mail envoyé pour cette demande.')
  }

  return NextResponse.json({ ok: true })
}
