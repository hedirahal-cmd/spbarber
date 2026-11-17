import { NextResponse, after } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { EXPEDITEUR_EMAIL } from '@/lib/email'
import { lignesDuColis, nomsArticles, shipEmailHtml, type LigneCommande, type Transporteur } from '@/lib/shipping-email'
import { analyserWebhook, trouverPriseEnCharge, verifierSignatureWebhook } from '@/lib/boxtal'
import { envoyerAlerteOperationnelle } from '@/lib/alerte-operationnelle'

export const runtime = 'nodejs'

/**
 * Webhook Boxtal -- deux evenements possibles (voir src/lib/boxtal.ts) :
 *
 * DOCUMENT_CREATED : l'etiquette (PDF) est prete. On la telecharge (l'URL
 * Boxtal est signee et EXPIRE) et on la re-heberge dans notre propre stockage
 * -- bucket PRIVE "etiquettes" (2026-11-17, demande Hedi : le PDF porte nom/
 * adresse/telephone du client, jamais dans un bucket public -- l'ancien bucket
 * "products" etait non seulement public mais, de plus, n'autorisait meme pas
 * application/pdf, d'ou l'echec systematique observe en production). On
 * stocke le CHEMIN dans boxtal_label_url, pas une URL : /api/admin/boxtal/
 * label-url genere un lien signe de courte duree a la demande, jamais montre
 * au client. Ce travail est differe via after() (voir plus bas) : la reponse
 * HTTP a Boxtal part sans l'attendre.
 *
 * TRACKING_CHANGED : le numero de suivi existe (ou son statut a change). On ne
 * l'avait pas a la creation de l'etiquette (Boxtal le genere de facon
 * asynchrone) -- des qu'il apparait pour la premiere fois, on l'enregistre.
 * L'e-mail "commande expediee" (meme gabarit que le flux manuel, voir
 * /api/admin/ship) et le passage du statut a "shipped", eux, n'ont lieu
 * qu'au premier evenement dont le statut correspond a une VRAIE prise en
 * charge transporteur (2026-11-17, demande Hedi -- voir
 * STATUTS_PRISE_EN_CHARGE/trouverPriseEnCharge dans boxtal.ts, confirme par
 * la specification officielle). Avant cela, la commande reste "label_ready"
 * (etiquette prete, en attente de depot). Transition ATOMIQUE (update
 * conditionne sur status='label_ready') : un rejeu du meme evenement, un
 * evenement de secours arrivant apres que la transition a deja eu lieu
 * (IN_TRANSIT apres SHIPPED, etc.), ou un evenement arrive apres une
 * annulation (cote nous -- voir cancel-label, qui remet status a 'paid'), ne
 * trouve plus 'label_ready' et ne fait donc ni le passage a "shipped" ni
 * l'e-mail -- un seul e-mail au total, quel que soit le nombre d'evenements
 * de prise en charge recus pour une meme commande.
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
    .select('id, email, items, tracking_number, carrier, status')
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
            .from('etiquettes')
            .upload(chemin, pdf, { contentType: 'application/pdf', upsert: true })
          if (uploadErr) throw new Error(uploadErr.message)

          // boxtal_label_url contient desormais un CHEMIN dans le bucket prive
          // "etiquettes", pas une URL publique -- voir /api/admin/boxtal/label-url
          // pour la resolution en lien signe de courte duree, a la demande.
          await supabaseAdmin.from('orders').update({ boxtal_label_url: chemin }).eq('id', orderId)
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
    // Journalise les VRAIS statuts recus (2026-11-17, demande Hedi) -- aucune
    // donnee personnelle ici (status/message sont des champs Boxtal, pas les
    // notres), utile pour confirmer en production que STATUTS_PRISE_EN_CHARGE
    // (voir boxtal.ts) couvre bien ce que Boxtal envoie reellement.
    console.log('[webhook boxtal] TRACKING_CHANGED commande', order.id, '-- statuts recus :', evenement.trackings.map((t) => t.status).join(', '))
    // Enregistre le numero de suivi des qu'il apparait, independamment du
    // statut (visible dans l'admin meme avant la prise en charge reelle) --
    // inchange, mais desormais DECOUPLE de l'envoi de l'e-mail ci-dessous.
    if (suivi?.trackingNumber && !order.tracking_number) {
      await supabaseAdmin.from('orders').update({ tracking_number: suivi.trackingNumber }).eq('id', order.id)
    }

    const priseEnCharge = trouverPriseEnCharge(evenement.trackings)
    if (priseEnCharge) {
      // Transition ATOMIQUE label_ready -> shipped : conditionnee sur le
      // statut ACTUEL en base, pas sur la valeur lue plus haut (qui peut etre
      // perimee) -- 0 ligne modifiee si la commande n'est plus 'label_ready'
      // (deja expediee par un rejeu de ce meme evenement -- idempotence -- ou
      // annulee entre-temps, voir cancel-label). Dans les deux cas, aucun
      // e-mail ne doit repartir.
      const { data: miseAJour, error: majErr } = await supabaseAdmin
        .from('orders')
        .update({ status: 'shipped', shipped_at: new Date().toISOString() })
        .eq('id', order.id)
        .eq('status', 'label_ready')
        .select('id')

      if (majErr) {
        console.error('[webhook boxtal] passage à "shipped" impossible:', majErr.message)
      } else if (!miseAJour || miseAJour.length === 0) {
        console.log('[webhook boxtal] prise en charge ignorée pour la commande', order.id, '— statut actuel :', order.status, '(déjà expédiée ou annulée, pas de nouvel e-mail)')
      } else {
        const numeroSuivi = priseEnCharge.trackingNumber || order.tracking_number || suivi?.trackingNumber || ''
        const apiKey = process.env.RESEND_API_KEY
        if (apiKey && order.email && numeroSuivi) {
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
              subject: `Votre commande SP Barber est expédiée — ${numeroSuivi}`,
              html: shipEmailHtml(numeroSuivi, transporteur, nomsArticles(articlesDeCeColis)),
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
                ['Numéro de suivi', numeroSuivi],
                ['Erreur', detail],
                ['Horodatage', new Date().toISOString()],
              ],
              'e-mail expédition (Boxtal) non envoyé, commande ' + order.id,
            )
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
