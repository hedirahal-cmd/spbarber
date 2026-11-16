import { NextResponse, after } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { EXPEDITEUR_EMAIL } from '@/lib/email'
import { lignesDuColis, nomsArticles, shipEmailHtml, type LigneCommande, type Transporteur } from '@/lib/shipping-email'
import { analyserWebhook, verifierSignatureWebhook } from '@/lib/boxtal'
import { envoyerAlerteOperationnelle } from '@/lib/alerte-operationnelle'

export const runtime = 'nodejs'

/**
 * Webhook Boxtal -- deux evenements possibles (voir src/lib/boxtal.ts) :
 *
 * DOCUMENT_CREATED : l'etiquette (PDF) est prete. On la telecharge (l'URL
 * Boxtal est signee et EXPIRE) et on la re-heberge dans notre propre stockage
 * -- boxtal_label_url pointe desormais vers une URL permanente, a l'usage de
 * Hedi (impression), jamais montree au client. Ce travail est differe via
 * after() (voir plus bas) : la reponse HTTP a Boxtal part sans l'attendre.
 *
 * TRACKING_CHANGED : le numero de suivi existe (ou son statut a change). On ne
 * l'avait pas a la creation de l'etiquette (Boxtal le genere de facon
 * asynchrone) -- des qu'il apparait pour la premiere fois, on l'enregistre ET
 * on envoie le MEME e-mail "commande expediee" que le flux manuel (voir
 * /api/admin/ship), avec le lien de suivi fourni directement par Boxtal
 * (packageTrackingUrl) : fiable d'office, plus besoin du lien generique utilise
 * pour Chronopost en saisie manuelle. Les mises a jour suivantes (statut
 * "livre", etc.) ne redeclenchent pas l'e-mail.
 *
 * Le colis tondeuse (fournisseur) n'a jamais de boxtal_order_id -- aucun risque
 * qu'un evenement Boxtal touche par erreur ses propres colonnes _fournisseur.
 */

export async function POST(req: Request) {
  const corpsBrut = await req.text()
  const signature = req.headers.get('x-bxt-signature')

  if (!verifierSignatureWebhook(corpsBrut, signature)) {
    console.error('[webhook boxtal] signature invalide ou BOXTAL_WEBHOOK_SECRET absente')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let evenement: ReturnType<typeof analyserWebhook>
  try {
    evenement = analyserWebhook(corpsBrut)
  } catch (e) {
    console.error('[webhook boxtal] corps illisible:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  if (!evenement.shippingOrderId) {
    return NextResponse.json({ received: true, ignored: true })
  }

  const { data: order, error: fetchErr } = await supabaseAdmin
    .from('orders')
    .select('id, email, items, tracking_number, carrier')
    .eq('boxtal_order_id', evenement.shippingOrderId)
    .maybeSingle()

  if (fetchErr) {
    console.error('[webhook boxtal] lecture commande impossible:', fetchErr.message)
    return NextResponse.json({ error: 'Lecture impossible' }, { status: 500 })
  }
  if (!order) {
    // Commande deja annulee cote nous, ou evenement de bac a sable orphelin --
    // pas une panne : on l'acquitte pour que Boxtal ne retente pas en boucle.
    console.warn('[webhook boxtal] aucune commande pour shippingOrderId', evenement.shippingOrderId)
    return NextResponse.json({ received: true, ignored: true })
  }

  if (evenement.type === 'DOCUMENT_CREATED') {
    const etiquette = evenement.documents.find((d) => d.type === 'LABEL')
    // Telechargement + hebergement differes via after() (2026-11-13, demande
    // Hedi) : Boxtal attend un accuse de reception rapide, or le telechargement
    // du PDF + l'upload Supabase Storage n'ont aucune limite de temps propre et
    // pouvaient depasser 2s selon le reseau. La reponse HTTP part donc AVANT ce
    // travail -- after() continue de s'executer meme si la reponse est deja
    // envoyee (supporte sur Vercel via waitUntil). Idempotence inchangee :
    // l'upload reste upsert:true, le update reste rejouable sans effet de bord.
    if (etiquette?.url) {
      const urlEtiquette = etiquette.url
      const orderId = order.id
      after(async () => {
        try {
          const reponsePdf = await fetch(urlEtiquette)
          if (!reponsePdf.ok) throw new Error(`telechargement etiquette -> ${reponsePdf.status}`)
          const pdf = await reponsePdf.arrayBuffer()

          const chemin = `labels/${orderId}.pdf`
          const { error: uploadErr } = await supabaseAdmin.storage
            .from('products')
            .upload(chemin, pdf, { contentType: 'application/pdf', upsert: true })
          if (uploadErr) throw new Error(uploadErr.message)

          const { data: urlData } = supabaseAdmin.storage.from('products').getPublicUrl(chemin)
          await supabaseAdmin.from('orders').update({ boxtal_label_url: urlData.publicUrl }).eq('id', orderId)
        } catch (e) {
          // L'etiquette reste recuperable manuellement depuis le tableau de bord
          // Boxtal -- on journalise plutot que de faire planter ce travail
          // differe (plus personne n'attend sa reponse HTTP a ce stade).
          console.error('[webhook boxtal] etiquette non recuperee pour la commande', orderId, ':', e instanceof Error ? e.message : String(e))
        }
      })
    }
  }

  if (evenement.type === 'TRACKING_CHANGED') {
    const suivi = evenement.trackings[0]
    if (suivi?.trackingNumber && !order.tracking_number) {
      await supabaseAdmin.from('orders').update({ tracking_number: suivi.trackingNumber }).eq('id', order.id)

      const apiKey = process.env.RESEND_API_KEY
      if (apiKey && order.email) {
        try {
          const transporteur: Transporteur = order.carrier === 'chronopost' ? 'chronopost' : 'colissimo'
          const items = Array.isArray(order.items) ? (order.items as LigneCommande[]) : []
          // Toujours le colis "standard" -- Boxtal ne gere jamais le colis
          // fournisseur (tondeuse dropshippee), voir lignesDuColis.
          const articlesDeCeColis = lignesDuColis(items, 'standard')
          const resend = new Resend(apiKey)
          // resend.emails.send() ne rejette jamais sur une erreur API, elle
          // revient dans { error } sans exception (voir src/lib/alerte-
          // operationnelle.ts) -- controle explicite indispensable.
          const { error: erreurResend } = await resend.emails.send({
            from: EXPEDITEUR_EMAIL,
            to: [order.email],
            subject: `Votre commande SP Barber est expédiée — ${suivi.trackingNumber}`,
            html: shipEmailHtml(suivi.trackingNumber, transporteur, nomsArticles(articlesDeCeColis)),
          })
          if (erreurResend) throw new Error(erreurResend.message ?? JSON.stringify(erreurResend))
        } catch (e) {
          const detail = e instanceof Error ? e.message : String(e)
          console.error('[webhook boxtal] e-mail de suivi non envoye:', detail)
          await envoyerAlerteOperationnelle(
            'E-mail d\'expédition non envoyé',
            'Le numéro de suivi Boxtal a bien été enregistré, mais l&rsquo;e-mail "commande expédiée" au client n&rsquo;a pas pu partir.',
            [
              ['Commande', order.id],
              ['Client', order.email],
              ['Numéro de suivi', suivi.trackingNumber],
              ['Erreur', detail],
              ['Horodatage', new Date().toISOString()],
            ],
            'e-mail expédition (Boxtal) non envoyé, commande ' + order.id,
          )
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
