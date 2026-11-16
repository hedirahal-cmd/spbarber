import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { MODE_STRIPE, stripe } from '@/lib/stripe'
import { EXPEDITEUR_EMAIL } from '@/lib/email'
import { PRODUCTS } from '@/lib/products'
import { estDomTom } from '@/lib/geo-france'
import { nomsArticles, type ArticleAffiche, type LigneCommande } from '@/lib/shipping-email'
import { envoyerAlerteOperationnelle } from '@/lib/alerte-operationnelle'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function echapper(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Base du lien "Voir ma commande" de la confirmation client -- NEXT_PUBLIC_SITE_URL
 * EN PRIORITE (2026-11-16, demande Hedi : jamais un domaine *.vercel.app dans un
 * e-mail client). VERCEL_PROJECT_PRODUCTION_URL seulement en repli si cette
 * variable manquait ; VERCEL_URL (toujours le domaine de deploiement, y compris
 * en production) n'est volontairement PAS utilisee ici, a la difference de
 * /api/stripe/checkout (success_url, un lien de redirection immediate plutot
 * qu'un lien dans un e-mail -- le risque n'est pas le meme).
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}

function idPaiement(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null
}

/** Contexte minimal partage par les deux chemins de paiement (Checkout classique
 *  et PaymentIntent express) pour les alertes ci-dessous -- plus les champs
 *  specifiques de Stripe.Checkout.Session, qu aucune des deux fonctions
 *  n utilise reellement. */
type ContexteAlerte = {
  reference: string
  email: string
  paymentIntentId: string | null
  montant: number
}

/** Previent qu'un paiement a ete encaisse sans que la commande soit enregistree. */
async function alerterEchecInsertion(
  ctx: ContexteAlerte,
  error: { code?: string; message: string },
): Promise<void> {
  await envoyerAlerteOperationnelle(
    'URGENT — paiement encaisse sans commande enregistree',
    'Le webhook Stripe a recu un paiement mais l&rsquo;enregistrement en base a echoue. ' +
      'Stripe va retenter automatiquement. Si toutes les tentatives echouent, la commande ' +
      'devra etre saisie a la main.',
    [
      ['Reference', ctx.reference],
      ['Payment intent', ctx.paymentIntentId ?? '(aucun)'],
      ['Montant', (ctx.montant / 100).toFixed(2) + ' EUR'],
      ['Client', ctx.email || '(inconnu)'],
      ['Erreur', (error.code ? error.code + ' — ' : '') + error.message],
      ['Horodatage', new Date().toISOString()],
    ],
    'paiement encaisse sans commande enregistree, reference ' + ctx.reference,
  )
}

/**
 * Previent qu'un paiement a ete encaisse pour une quantite que le stock ne
 * couvrait plus au moment du decrement -- typiquement deux clients qui achetent
 * les derniers exemplaires a quelques secondes d'intervalle. La commande reste
 * enregistree normalement (Stripe a deja encaisse, impossible de revenir
 * dessus) : cette alerte sert a declencher une verification manuelle
 * (reappro, contact fournisseur), pas a bloquer quoi que ce soit.
 */
async function alerterStockInsuffisant(
  ctx: ContexteAlerte,
  produitId: string,
  quantite: number,
): Promise<void> {
  await envoyerAlerteOperationnelle(
    'Stock insuffisant apres un paiement — verification manuelle requise',
    'Un paiement a ete encaisse pour une quantite superieure au stock disponible au moment ' +
      'du decrement. La commande est enregistree normalement (Stripe a deja encaisse) : ' +
      'verifiez le reapprovisionnement ou contactez le client si necessaire.',
    [
      ['Reference', ctx.reference],
      ['Produit', produitId],
      ['Quantite commandee', String(quantite)],
      ['Client', ctx.email || '(inconnu)'],
      ['Horodatage', new Date().toISOString()],
    ],
    'stock insuffisant au decrement, produit ' + produitId + ', reference ' + ctx.reference,
  )
}

/**
 * DOM-TOM (2026-10-21, decision Hedi) : derniere ligne de defense serveur --
 * Boxtal n'a aucune offre vers ces destinations (verifie reellement sur la
 * Martinique, voir estDomTom). Le flux express est deja bloque plus tot (PATCH
 * de /api/stripe/payment-intent, AVANT la confirmation de paiement) ; le
 * Checkout classique n'a pas d'equivalent cote Stripe -- l'adresse n'existe
 * qu'APRES la creation de la session, saisie sur la page hebergee Stripe, sans
 * webhook d'adresse pour la valider en cours de route. Ce point-ci, juste
 * apres l'encaissement, est donc le plus tot possible pour ce flux : on
 * rembourse immediatement, on n'enregistre jamais la commande, on alerte Hedi.
 */
/**
 * E-mail CLIENT explicatif (2026-10-21, decision Hedi) -- en plus de l'alerte
 * interne ci-dessous. Le client doit comprendre pourquoi il est rembourse,
 * pas seulement voir un remboursement sans explication sur son releve.
 */
function emailRemboursementDomTomHtml(montant: number): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#0c0c0c;padding:28px 40px;border-bottom:1px solid #2a2a2a;text-align:center;">
            <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:6px;color:#f8f6f3;">
              SP<span style="color:#b8903a;">.</span>BARBER
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="color:#f8f6f3;font-size:20px;font-weight:600;margin:0 0 8px;">Votre commande a été remboursée</h1>
            <p style="color:#9a9590;font-size:14px;line-height:1.6;margin:0 0 20px;">
              Bonjour, nous livrons actuellement uniquement en France métropolitaine (Corse incluse).
              L&rsquo;adresse de livraison indiquée pour votre commande se trouve en dehors de cette zone —
              nous ne pouvons malheureusement pas l&rsquo;expédier.
            </p>
            <div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;padding:20px 24px;margin-bottom:28px;">
              <div style="font-size:11px;color:#9a9590;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Montant remboursé</div>
              <div style="font-size:22px;font-weight:700;color:#b8903a;">${(montant / 100).toFixed(2).replace('.', ',')} €</div>
            </div>
            <p style="color:#9a9590;font-size:13px;line-height:1.6;margin:0 0 8px;">
              L&rsquo;intégralité du montant vous a été remboursée automatiquement. Le remboursement apparaîtra sur votre compte sous quelques jours ouvrés, selon votre banque.
            </p>
            <p style="color:#9a9590;font-size:13px;line-height:1.6;margin:0;">
              Si vous pensez qu&rsquo;il s&rsquo;agit d&rsquo;une erreur, répondez simplement à cet e-mail ou écrivez-nous à spbarbershopexploitation@hotmail.com.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a2a2a;text-align:center;">
            <span style="color:#4a4a4a;font-size:12px;">SP Barber Shop — Fougères &amp; Ernée</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function envoyerEmailClientDomTom(email: string, montant: number, reference: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !email) return
  try {
    const resend = new Resend(apiKey)
    // Voir le commentaire de envoyerAlerteOperationnelle (src/lib/alerte-
    // operationnelle.ts) : resend.emails.send() ne rejette jamais sur une
    // erreur API, elle revient dans { error } sans exception.
    const { error } = await resend.emails.send({
      from: EXPEDITEUR_EMAIL,
      to: [email],
      subject: 'Votre commande SP Barber — remboursement intégral',
      html: emailRemboursementDomTomHtml(montant),
    })
    if (error) throw new Error(error.message ?? JSON.stringify(error))
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    console.error('[webhook] e-mail client DOM-TOM non envoyé:', detail)
    await envoyerAlerteOperationnelle(
      'E-mail client DOM-TOM non envoyé',
      'Le remboursement DOM-TOM a bien eu lieu, mais l&rsquo;e-mail explicatif au client n&rsquo;a pas pu partir.',
      [
        ['Référence', reference],
        ['Client', email],
        ['Erreur', detail],
        ['Horodatage', new Date().toISOString()],
      ],
      'e-mail client DOM-TOM non envoyé, référence ' + reference,
    )
  }
}

async function remboursementSiDomTom(
  paymentIntentId: string | null,
  shipping: AdresseLivraison,
  reference: string,
  montant: number,
  email: string,
): Promise<boolean> {
  const codePostal = shipping?.address?.postal_code
  if (!codePostal || !estDomTom(codePostal)) return false

  console.error('[webhook] adresse DOM-TOM detectee apres paiement, remboursement :', reference, codePostal)

  if (paymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: paymentIntentId })
    } catch (e) {
      console.error('[webhook] remboursement DOM-TOM impossible:', e instanceof Error ? e.message : String(e))
    }
  }

  await envoyerAlerteOperationnelle(
    'Commande DOM-TOM remboursée automatiquement',
    'Une adresse DOM-TOM a été saisie au paiement — Boxtal ne peut livrer aucun transporteur ' +
      'vers ces destinations (vérifié sur la Martinique). Le paiement a été remboursé ' +
      'automatiquement, aucune commande n&rsquo;a été enregistrée. Le client a reçu un e-mail ' +
      'explicatif séparé.',
    [
      ['Référence', reference],
      ['Payment intent', paymentIntentId ?? '(aucun)'],
      ['Code postal', codePostal],
      ['Montant', (montant / 100).toFixed(2) + ' EUR'],
      ['Client', email || '(inconnu)'],
      ['Horodatage', new Date().toISOString()],
    ],
    'commande DOM-TOM remboursée, référence ' + reference,
  )
  await envoyerEmailClientDomTom(email, montant, reference)
  return true
}

/**
 * phone/prenom/nom (2026-10-21, chantier Boxtal) : jamais lus par
 * enregistrerCommande lui-meme, simplement portes dans shipping_address --
 * seule la route de creation d'etiquette (/api/admin/boxtal/create-label) les
 * exploite. Absents sur une commande passee avant ce chantier (repli sur un
 * decoupage de `name`, voir diviserNomComplet) ou si le client a choisi de ne
 * pas renseigner son telephone (optionnel cote paiement express, requis cote
 * Checkout classique via phone_number_collection).
 */
type AdresseLivraison = {
  name?: string | null
  address?: Stripe.Address | null
  phone?: string | null
  prenom?: string | null
  nom?: string | null
} | null

/** Lit un custom_field Stripe Checkout par sa cle (voir /api/stripe/checkout). */
function champPersonnalise(session: Stripe.Checkout.Session, cle: string): string | null {
  const champ = session.custom_fields?.find((c) => c.key === cle)
  return champ?.text?.value ?? null
}

/**
 * E-mail "Nouvelle commande" a l'equipe (2026-11-11, decision Hedi) --
 * separe d'ALERT_EMAIL (qui reste reserve aux pannes, voir plus haut) :
 * NOTIF_EQUIPE_EMAIL peut contenir plusieurs adresses separees par une
 * virgule (ex. Pablo ET Sofiane). Best-effort comme toutes les notifications
 * de ce fichier : ne bloque jamais, ne fait jamais echouer l'enregistrement
 * de la commande.
 */
function notificationEquipeHtml(orderId: string, email: string, montant: number, adresse: AdresseLivraison, articles: ArticleAffiche[]): string {
  const blocAdresse = adresse
    ? [
        adresse.name,
        adresse.address?.line1,
        adresse.address?.line2,
        [adresse.address?.postal_code, adresse.address?.city].filter(Boolean).join(' '),
        adresse.address?.country,
        adresse.phone ? `Tél : ${adresse.phone}` : null,
      ].filter((l): l is string => !!l && l.trim().length > 0).map(echapper).join('<br>')
    : 'Adresse non renseignée'

  const listeArticles = articles.length
    ? `<table width="100%" cellpadding="0" cellspacing="0">
        ${articles
          .map(
            (a, i) => `<tr>
              <td style="font-size:15px;color:#f8f6f3;font-weight:500;padding:8px 0;${i < articles.length - 1 ? 'border-bottom:1px solid #2a2a2a;' : ''}">${echapper(a.nom)}</td>
              <td align="right" style="font-size:13px;color:#9a9590;white-space:nowrap;padding:8px 0;${i < articles.length - 1 ? 'border-bottom:1px solid #2a2a2a;' : ''}">× ${a.qty}</td>
            </tr>`,
          )
          .join('')}
      </table>`
    : '<p style="color:#9a9590;font-size:13px;">Aucun article (format inattendu).</p>'

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#0c0c0c;padding:28px 40px;border-bottom:1px solid #2a2a2a;text-align:center;">
            <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:6px;color:#f8f6f3;">
              SP<span style="color:#b8903a;">.</span>BARBER
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="color:#f8f6f3;font-size:20px;font-weight:600;margin:0 0 8px;">Nouvelle commande reçue</h1>
            <p style="color:#9a9590;font-size:14px;line-height:1.6;margin:0 0 20px;">
              Commande <strong style="color:#f8f6f3;">#${echapper(orderId.slice(0, 8))}</strong> — payée par ${echapper(email || '(e-mail inconnu)')}. À préparer.
            </p>
            <div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
              <div style="font-size:11px;color:#9a9590;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Articles commandés</div>
              ${listeArticles}
            </div>
            <div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
              <div style="font-size:11px;color:#9a9590;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Adresse de livraison</div>
              <div style="font-size:14px;color:#f8f6f3;line-height:1.6;">${blocAdresse}</div>
            </div>
            <div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;padding:20px 24px;">
              <div style="font-size:11px;color:#9a9590;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Montant</div>
              <div style="font-size:22px;font-weight:700;color:#b8903a;">${(montant / 100).toFixed(2).replace('.', ',')} €</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a2a2a;text-align:center;">
            <span style="color:#4a4a4a;font-size:12px;">SP Barber Shop — Fougères &amp; Ernée</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function envoyerNotificationEquipe(
  orderId: string,
  email: string,
  montant: number,
  adresse: AdresseLivraison,
  items: LigneCommande[],
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const destinataires = (process.env.NOTIF_EQUIPE_EMAIL ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)

  if (!destinataires.length || !apiKey) {
    console.error('[webhook] notification equipe NON ENVOYEE (NOTIF_EQUIPE_EMAIL ou RESEND_API_KEY absent)')
    return
  }

  try {
    const resend = new Resend(apiKey)
    // Voir le commentaire de envoyerAlerteOperationnelle (src/lib/alerte-
    // operationnelle.ts) : resend.emails.send() ne rejette jamais sur une
    // erreur API, elle revient dans { error } sans exception.
    const { error } = await resend.emails.send({
      from: EXPEDITEUR_EMAIL,
      to: destinataires,
      subject: `Nouvelle commande — ${(montant / 100).toFixed(2).replace('.', ',')} € — #${orderId.slice(0, 8)}`,
      html: notificationEquipeHtml(orderId, email, montant, adresse, nomsArticles(items)),
    })
    if (error) throw new Error(error.message ?? JSON.stringify(error))
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    console.error('[webhook] notification equipe non envoyee:', detail)
    await envoyerAlerteOperationnelle(
      'E-mail "Nouvelle commande" (équipe) non envoyé',
      'La notification "Nouvelle commande" destinée à l&rsquo;équipe (NOTIF_EQUIPE_EMAIL) n&rsquo;a pas pu être envoyée.',
      [
        ['Commande', orderId],
        ['Client', email],
        ['Montant', (montant / 100).toFixed(2) + ' EUR'],
        ['Erreur', detail],
        ['Horodatage', new Date().toISOString()],
      ],
      'notification équipe non envoyée, commande ' + orderId,
    )
  }
}

/**
 * E-mail de confirmation de commande au CLIENT (2026-11-16, demande Hedi).
 * N'avait JAMAIS ete code -- /commande-confirmee affirme pourtant depuis le
 * debut "un e-mail de confirmation a ete envoye a ...", une promesse fausse
 * tant que cette fonction n'existait pas (voir le constat de Hedi : aucune
 * tentative cote Resend).
 *
 * Best-effort comme les autres notifications de ce fichier : ne bloque et ne
 * fait jamais echouer l'enregistrement de la commande. Contrairement a
 * envoyerNotificationEquipe (NOTIF_EQUIPE_EMAIL, une notification business,
 * pas une panne), un e-mail de confirmation client qui ne part pas EST une
 * panne a corriger -- toute erreur declenche donc EN PLUS l'alerte
 * operationnelle existante (ALERT_EMAIL, voir envoyerAlerteOperationnelle),
 * plutot qu'un simple console.error qui passerait inapercu.
 */
function confirmationClientHtml(orderRef: string, montant: number, adresse: AdresseLivraison, articles: ArticleAffiche[], lienCommande: string): string {
  const blocAdresse = adresse
    ? [
        adresse.name,
        adresse.address?.line1,
        adresse.address?.line2,
        [adresse.address?.postal_code, adresse.address?.city].filter(Boolean).join(' '),
        adresse.address?.country,
      ].filter((l): l is string => !!l && l.trim().length > 0).map(echapper).join('<br>')
    : null

  const listeArticles = articles.length
    ? `<table width="100%" cellpadding="0" cellspacing="0">
        ${articles
          .map(
            (a, i) => `<tr>
              <td style="font-size:15px;color:#f8f6f3;font-weight:500;padding:8px 0;${i < articles.length - 1 ? 'border-bottom:1px solid #2a2a2a;' : ''}">${echapper(a.nom)}</td>
              <td align="right" style="font-size:13px;color:#9a9590;white-space:nowrap;padding:8px 0;${i < articles.length - 1 ? 'border-bottom:1px solid #2a2a2a;' : ''}">× ${a.qty}</td>
            </tr>`,
          )
          .join('')}
      </table>`
    : '<p style="color:#9a9590;font-size:13px;">Détail indisponible.</p>'

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#0c0c0c;padding:28px 40px;border-bottom:1px solid #2a2a2a;text-align:center;">
            <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:6px;color:#f8f6f3;">
              SP<span style="color:#b8903a;">.</span>BARBER
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="color:#f8f6f3;font-size:20px;font-weight:600;margin:0 0 8px;">Votre commande est confirmée</h1>
            <p style="color:#9a9590;font-size:14px;line-height:1.6;margin:0 0 20px;">
              Merci pour votre achat ! Commande <strong style="color:#f8f6f3;">#${echapper(orderRef)}</strong> — voici son récapitulatif.
            </p>
            <div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
              <div style="font-size:11px;color:#9a9590;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Votre commande</div>
              ${listeArticles}
            </div>
            ${blocAdresse ? `<div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
              <div style="font-size:11px;color:#9a9590;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Livraison à</div>
              <div style="font-size:14px;color:#f8f6f3;line-height:1.6;">${blocAdresse}</div>
            </div>` : ''}
            <div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;padding:20px 24px;margin-bottom:20px;">
              <div style="font-size:11px;color:#9a9590;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Total payé</div>
              <div style="font-size:22px;font-weight:700;color:#b8903a;">${(montant / 100).toFixed(2).replace('.', ',')} €</div>
            </div>
            <p style="color:#9a9590;font-size:13px;line-height:1.6;margin:0 0 24px;">
              📦 Préparation sous <strong style="color:#f8f6f3;">2 jours ouvrés</strong>. Vous recevrez un e-mail séparé avec votre numéro de suivi dès l&rsquo;expédition.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="border-radius:4px;background:#b8903a;">
                  <a href="${lienCommande}" target="_blank"
                    style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">
                    Voir ma commande →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#9a9590;font-size:13px;line-height:1.6;margin:0;">
              Une question ? Répondez simplement à cet e-mail ou écrivez-nous à spbarbershopexploitation@hotmail.com.
              Conditions générales de vente : <a href="https://spbarber.fr/cgv" style="color:#b8903a;">spbarber.fr/cgv</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a2a2a;text-align:center;">
            <span style="color:#4a4a4a;font-size:12px;">SP Barber Shop — Fougères &amp; Ernée</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function envoyerConfirmationClient(
  orderRef: string,
  email: string,
  montant: number,
  adresse: AdresseLivraison,
  items: LigneCommande[],
  lienCommande: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || !email) {
    console.error('[webhook] confirmation client NON ENVOYEE (RESEND_API_KEY ou e-mail client absent) — référence', orderRef)
    await envoyerAlerteOperationnelle(
      'E-mail de confirmation client non envoyé',
      'La confirmation de commande au client n&rsquo;a pas pu partir (configuration manquante).',
      [
        ['Référence', orderRef],
        ['Client', email || '(inconnu)'],
        ['Horodatage', new Date().toISOString()],
      ],
      'confirmation client non envoyée (configuration), référence ' + orderRef,
    )
    return
  }

  try {
    const resend = new Resend(apiKey)
    // resend.emails.send() ne REJETTE jamais sur une erreur cote API (domaine
    // non verifie, adresse invalide...) -- elle revient dans { error }, sans
    // exception (voir resend/dist : fetchRequest ne leve que sur un echec
    // reseau). Sans ce controle explicite, une erreur API passerait pour un
    // succes et l'alerte equipe ci-dessous ne se declencherait jamais.
    const { error: erreurResend } = await resend.emails.send({
      from: EXPEDITEUR_EMAIL,
      // EXPEDITEUR_EMAIL est une adresse "noreply" (voir src/lib/email.ts) --
      // une reponse du client doit arriver sur la vraie boite de contact,
      // pas se perdre (2026-11-16, demande Hedi).
      replyTo: 'spbarbershopexploitation@hotmail.com',
      to: [email],
      subject: `Votre commande SP Barber #${orderRef} est confirmée`,
      html: confirmationClientHtml(orderRef, montant, adresse, nomsArticles(items), lienCommande),
    })
    if (erreurResend) throw new Error(erreurResend.message ?? JSON.stringify(erreurResend))
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    console.error('[webhook] confirmation client non envoyee:', detail, '— référence', orderRef)
    await envoyerAlerteOperationnelle(
      'E-mail de confirmation client non envoyé',
      'L&rsquo;envoi de la confirmation de commande au client a échoué.',
      [
        ['Référence', orderRef],
        ['Client', email],
        ['Erreur', detail],
        ['Horodatage', new Date().toISOString()],
      ],
      'confirmation client non envoyée, référence ' + orderRef,
    )
  }
}

/**
 * Enregistrement de commande partage par les deux chemins de paiement (Checkout
 * classique et PaymentIntent express, voir plus bas) : meme insertion dans
 * `orders`, meme decrement de stock, meme alerting. Les deux chemins ne different
 * que par la facon dont Stripe leur presente l email/les articles/l adresse --
 * cette fonction ne voit plus que des valeurs deja normalisees.
 */
async function enregistrerCommande(params: {
  email: string
  rawItems: unknown
  total: number
  paymentIntentId: string | null
  shippingAddress: AdresseLivraison
  reference: string
  lienCommande: string
}): Promise<NextResponse> {
  let parsedItems: unknown[] = []
  try {
    parsedItems = JSON.parse(typeof params.rawItems === 'string' ? params.rawItems : '[]')
  } catch {}

  if (params.paymentIntentId === null) {
    // L'index unique orders_stripe_payment_intent_id_key est PARTIEL
    // (WHERE stripe_payment_intent_id IS NOT NULL) : sans payment intent, rien
    // n'empeche une redelivrance Stripe de creer un second enregistrement.
    console.warn('[webhook] evenement sans payment_intent, doublon possible:', params.reference)
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('orders')
    .insert({
      email: params.email,
      items: parsedItems,
      total: params.total,
      status: 'paid',
      stripe_payment_intent_id: params.paymentIntentId,
      shipping_address: params.shippingAddress,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  const ctx: ContexteAlerte = {
    reference: params.reference,
    email: params.email,
    paymentIntentId: params.paymentIntentId,
    montant: params.total,
  }

  if (error) {
    // 23505 = violation d'unicite. L'index partiel a mordu : ce paiement est
    // deja enregistre. C'est un succes, pas une panne -- repondre autre chose
    // que 2xx ferait retenter Stripe en boucle sur un evenement deja traite.
    if (error.code === '23505') {
      console.log('[webhook] evenement deja enregistre, ignore:', params.reference)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Tout le reste est une vraie panne. Le 500 est ce qui declenche la
    // reprise cote Stripe ; sans lui, le paiement est encaisse et la commande
    // perdue sans que personne ne l'apprenne.
    console.error('[webhook] echec insertion orders:', error.code, error.message)
    await alerterEchecInsertion(ctx, error)
    return NextResponse.json({ error: 'enregistrement impossible' }, { status: 500 })
  }

  // Decrement du stock -- on n'atteint ce point que sur un enregistrement
  // FRAIS : les deux branches ci-dessus (doublon 23505, echec reel) sont
  // deja revenues plus tot. Jamais deux fois pour le meme paiement.
  for (const brut of parsedItems) {
    const ligne = brut as { id?: unknown; variantId?: unknown; qty?: unknown }
    const produitId = typeof ligne.id === 'string' ? ligne.id : null
    const quantite = typeof ligne.qty === 'number' && Number.isInteger(ligne.qty) && ligne.qty > 0
      ? ligne.qty
      : null
    if (!produitId || !quantite) continue

    const base = PRODUCTS.find((p) => p.id === produitId)
    if (!base) continue

    // Dropshipping (tondeuses, dropshipping manuel ou non) est HORS de ce
    // systeme -- le fournisseur gere son propre stock, decision actee
    // separement de ce correctif.
    if (base.is_dropshipping) continue

    const { data: nouveauStock, error: erreurStock } = await supabaseAdmin.rpc('decrementer_stock', {
      p_id: produitId,
      p_quantite: quantite,
      p_stock_par_defaut: base.stock,
    })

    if (erreurStock) {
      // Incident d'infrastructure sur le decrement, pas un probleme de stock
      // -- la commande reste valide, on le journalise pour investigation.
      console.error('[webhook] decrement de stock impossible pour', produitId, ':', erreurStock.message)
      continue
    }
    if (nouveauStock === null) {
      console.warn(
        '[webhook] stock insuffisant au decrement pour', produitId,
        '(qte', quantite, ') -- commande conservee, alerte envoyee',
      )
      await alerterStockInsuffisant(ctx, produitId, quantite)
    }
  }

  const orderId = typeof inserted?.id === 'string' ? inserted.id : params.reference
  await envoyerConfirmationClient(orderId.slice(0, 8), params.email, params.total, params.shippingAddress, parsedItems as LigneCommande[], params.lienCommande)
  await envoyerNotificationEquipe(orderId, params.email, params.total, params.shippingAddress, parsedItems as LigneCommande[])

  return NextResponse.json({ received: true })
}

export async function POST(req: Request) {
  const body = await req.text()
  const headerStore = await headers()
  const sig = headerStore.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Un secret absent et une signature invalide sont deux pannes OPPOSEES, que
  // l ancienne version confondait en 400. Or 400 dit a Stripe 'ne retente pas' :
  // apres une bascule en live sans avoir pose le nouveau secret, chaque paiement
  // aurait ete encaisse sans qu aucune commande ne soit enregistree, sans reprise
  // et sans alerte -- l insertion n etant jamais atteinte.
  const secretWebhook = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretWebhook) {
    console.error(
      '[webhook] STRIPE_WEBHOOK_SECRET absente : signature invérifiable. On repond 500',
      'pour que Stripe retente, plutot que 400 qui lui ferait abandonner l evenement.',
    )
    return NextResponse.json({ error: 'Webhook non configure' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secretWebhook)
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Un evenement live recu par une cle de test (ou l inverse) signale un cablage
  // croise entre le tableau de bord Stripe et les variables Vercel.
  const modeEvenement = event.livemode ? 'live' : 'test'
  if (modeEvenement !== MODE_STRIPE) {
    console.error(
      '[webhook] INCOHERENCE DE MODE : evenement ' + modeEvenement +
        ' recu alors que la cle Stripe est en mode ' + MODE_STRIPE + '.',
    )
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const shippingInfo = session.collected_information?.shipping_details ?? null
    const telephone = session.customer_details?.phone ?? null
    const prenom = champPersonnalise(session, 'prenom')
    const nom = champPersonnalise(session, 'nom')
    const shipping = shippingInfo
      ? { name: shippingInfo.name, address: shippingInfo.address, phone: telephone, prenom, nom }
      : session.customer_details?.address
        ? { name: session.customer_details.name ?? null, address: session.customer_details.address, phone: telephone, prenom, nom }
        : null

    const rembourse = await remboursementSiDomTom(
      idPaiement(session),
      shipping,
      session.id,
      session.amount_total ?? 0,
      session.customer_details?.email ?? '',
    )
    if (rembourse) return NextResponse.json({ received: true, refunded: 'dom-tom' })

    return await enregistrerCommande({
      email: session.customer_details?.email ?? '',
      rawItems: session.metadata?.items ?? '[]',
      total: session.amount_total ?? 0,
      paymentIntentId: idPaiement(session),
      shippingAddress: shipping,
      reference: session.id,
      lienCommande: `${getBaseUrl()}/commande-confirmee?session_id=${session.id}`,
    })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent

    // Une Checkout Session en mode 'payment' cree TOUJOURS un PaymentIntent
    // sous-jacent, qui declenche lui aussi cet evenement -- sans ce garde-fou,
    // chaque achat panier classique serait traite ICI *en plus* du bloc
    // checkout.session.completed ci-dessus. Seul le paiement express (voir
    // /api/stripe/payment-intent) pose cette metadonnee a la creation.
    if (paymentIntent.metadata?.source !== 'express_checkout') {
      return NextResponse.json({ received: true, ignored: true })
    }

    const shippingExpress = paymentIntent.shipping
      ? {
          name: paymentIntent.shipping.name,
          address: paymentIntent.shipping.address,
          phone: paymentIntent.metadata?.phone ?? null,
          prenom: paymentIntent.metadata?.firstName ?? null,
          nom: paymentIntent.metadata?.lastName ?? null,
        }
      : null

    // Filet de securite seulement -- le PATCH de /api/stripe/payment-intent
    // bloque deja ce cas AVANT la confirmation de paiement. Ce point-ci ne
    // couvre qu'un contournement du PATCH (appel direct a confirmCardPayment).
    const rembourseExpress = await remboursementSiDomTom(
      paymentIntent.id,
      shippingExpress,
      paymentIntent.id,
      paymentIntent.amount,
      paymentIntent.receipt_email ?? '',
    )
    if (rembourseExpress) return NextResponse.json({ received: true, refunded: 'dom-tom' })

    return await enregistrerCommande({
      email: paymentIntent.receipt_email ?? '',
      rawItems: paymentIntent.metadata?.items ?? '[]',
      total: paymentIntent.amount,
      paymentIntentId: paymentIntent.id,
      shippingAddress: shippingExpress,
      reference: paymentIntent.id,
      lienCommande: `${getBaseUrl()}/commande-confirmee?payment_intent=${paymentIntent.id}`,
    })
  }

  return NextResponse.json({ received: true })
}
