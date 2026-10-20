import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { estAdmin } from '@/lib/admin-auth'
import { EXPEDITEUR_EMAIL } from '@/lib/email'
import { PRODUCTS } from '@/lib/products'

type Transporteur = 'colissimo' | 'chronopost'
type Colis = 'standard' | 'tondeuse'

type LigneCommande = { id?: unknown; variantId?: unknown; qty?: unknown }

/**
 * Lien de suivi + nom affiche par transporteur.
 *
 * Chronopost : le site officiel (chronopost.fr) bloque les clients non-
 * navigateur (403 constate en verifiant cette URL), impossible donc de
 * confirmer avec certitude un parametre d'URL qui pre-remplirait le numero.
 * Plutot que parier sur un format non verifie (un lien casse serait pire
 * qu'un lien generique), on renvoie vers la page de suivi officielle et le
 * client y colle lui-meme le numero, affiche en gros dans l'e-mail -- exactement
 * comme Colissimo l'affiche deja. A ajuster si Hedi confirme un format direct.
 */
const TRANSPORTEURS: Record<Transporteur, { nom: string; lienSuivi: (tracking: string) => string }> = {
  colissimo: {
    nom: 'Colissimo',
    lienSuivi: (tracking) => `https://www.laposte.fr/outils/track-a-parcel?code=${tracking}`,
  },
  chronopost: {
    nom: 'Chronopost',
    lienSuivi: () => 'https://www.chronopost.fr/fr/tracking-no-id',
  },
}

type ArticleAffiche = { nom: string; qty: number }

/** Resout les noms d'articles depuis PRODUCTS -- memes conventions que OrderItemsList (admin). */
function nomsArticles(items: LigneCommande[]): ArticleAffiche[] {
  return items.map((ligne) => {
    const produitId = typeof ligne.id === 'string' ? ligne.id : null
    const base = produitId ? PRODUCTS.find((p) => p.id === produitId) : undefined
    const variantId = typeof ligne.variantId === 'string' ? ligne.variantId : null
    const variante = variantId ? base?.variants?.find((v) => v.id === variantId) : undefined
    const qty = typeof ligne.qty === 'number' ? ligne.qty : 1
    const nom = base ? base.name + (variante ? ` — ${variante.name}` : '') : 'Article'
    return { nom, qty }
  })
}

/**
 * Repartit les lignes d'une commande entre les deux colis possibles --
 * tondeuse (fournisseur, expediee a part) et standard (tout le reste). Une
 * commande sans tondeuse n'a jamais que des lignes "standard".
 */
function lignesDuColis(items: LigneCommande[], colis: Colis): LigneCommande[] {
  return items.filter((ligne) => {
    const produitId = typeof ligne.id === 'string' ? ligne.id : null
    // Meme critere que commandeContientDropshipping (admin/page.tsx) :
    // is_dropshipping, pas "categorie tondeuse" -- les deux coincident
    // aujourd'hui mais le premier reste juste si un futur produit
    // dropshipping n'est pas une tondeuse.
    const estDropshipping = produitId ? PRODUCTS.find((p) => p.id === produitId)?.is_dropshipping === true : false
    return colis === 'tondeuse' ? estDropshipping : !estDropshipping
  })
}

function shipEmailHtml(tracking: string, transporteur: Transporteur, articles: ArticleAffiche[]): string {
  const { nom, lienSuivi } = TRANSPORTEURS[transporteur]
  const trackingUrl = lienSuivi(tracking)
  // Bloc "Contenu de ce colis" (2026-10-20, retour Hedi) : aussi visible que
  // le bloc numero de suivi juste en dessous -- meme traitement (encadre,
  // fond noir), pas une simple liste a puces discrete dans le paragraphe.
  // Table, pas flex/grid : les clients mail (Outlook desktop en tete) ne
  // fiabilisent que les mises en page a base de <table> en HTML email.
  const listeArticles = articles.length
    ? `<div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:11px;color:#9a9590;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Contenu de ce colis</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${articles
            .map(
              (a, i) => `<tr>
                <td style="font-size:15px;color:#f8f6f3;font-weight:500;padding:8px 0;${i < articles.length - 1 ? 'border-bottom:1px solid #2a2a2a;' : ''}">${a.nom}</td>
                <td align="right" style="font-size:13px;color:#9a9590;white-space:nowrap;padding:8px 0;${i < articles.length - 1 ? 'border-bottom:1px solid #2a2a2a;' : ''}">× ${a.qty}</td>
              </tr>`,
            )
            .join('')}
        </table>
      </div>`
    : ''
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#0c0c0c;padding:28px 40px;border-bottom:1px solid #2a2a2a;text-align:center;">
            <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:6px;color:#f8f6f3;">
              SP<span style="color:#b8903a;">.</span>BARBER
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="color:#f8f6f3;font-size:20px;font-weight:600;margin:0 0 8px;">Votre commande est en route !</h1>
            <p style="color:#9a9590;font-size:14px;line-height:1.6;margin:0 0 20px;">
              Bonjour, le colis ci-dessous a été expédié via ${nom} et est en chemin vers vous.
            </p>
            ${listeArticles}
            <!-- Tracking box -->
            <div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;padding:20px 24px;margin-bottom:28px;">
              <div style="font-size:11px;color:#9a9590;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Numéro de suivi ${nom}</div>
              <div style="font-size:22px;font-weight:700;color:#b8903a;letter-spacing:2px;font-family:monospace;">${tracking}</div>
            </div>
            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="border-radius:4px;background:#b8903a;">
                  <a href="${trackingUrl}" target="_blank"
                    style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">
                    Suivre mon colis →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#9a9590;font-size:13px;line-height:1.6;margin:0;">
              Délai de livraison estimé : <strong style="color:#f8f6f3;">2 à 3 jours ouvrés</strong>.
              Si vous avez la moindre question, répondez simplement à cet e-mail.
            </p>
          </td>
        </tr>
        <!-- Footer -->
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

export async function POST(req: NextRequest) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, tracking_number, carrier, parcel } = await req.json()
  if (!id || !tracking_number?.trim()) {
    return NextResponse.json({ error: 'id et tracking_number requis' }, { status: 400 })
  }
  // Transporteur obligatoire a l'expedition -- defaut 'colissimo' uniquement
  // pour les commandes deja expediees AVANT ce champ (carrier NULL en base),
  // jamais pour une nouvelle expedition : un choix explicite evite qu'un oubli
  // cote formulaire admin n'envoie silencieusement le mauvais nom de
  // transporteur au client.
  if (carrier !== 'colissimo' && carrier !== 'chronopost') {
    return NextResponse.json({ error: 'transporteur invalide (colissimo ou chronopost attendu)' }, { status: 400 })
  }
  const transporteur: Transporteur = carrier
  // 'standard' par defaut : toute commande sans tondeuse (l'immense majorite)
  // n'a jamais qu'un seul colis, et n'a donc pas besoin de preciser ce champ --
  // comportement inchange pour elles.
  const colis: Colis = parcel === 'tondeuse' ? 'tondeuse' : 'standard'

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('email, items')
    .eq('id', id)
    .single()
  if (fetchErr || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const items = Array.isArray(order.items) ? (order.items as LigneCommande[]) : []
  const articlesDeCeColis = lignesDuColis(items, colis)

  // Deux jeux de colonnes independants selon le colis -- jamais le meme
  // paiement de commande ecrase par deux expeditions differentes (voir
  // schema.sql : tracking_number_fournisseur/carrier_fournisseur/
  // shipped_at_fournisseur pour le colis tondeuse).
  const patch: Record<string, unknown> =
    colis === 'tondeuse'
      ? { status: 'shipped', tracking_number_fournisseur: tracking_number.trim(), carrier_fournisseur: transporteur, shipped_at_fournisseur: new Date().toISOString() }
      : { status: 'shipped', tracking_number: tracking_number.trim(), carrier: transporteur, shipped_at: new Date().toISOString() }

  const { error: updateErr } = await supabase.from('orders').update(patch).eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey && order.email) {
    try {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: EXPEDITEUR_EMAIL,
        to: [order.email],
        subject: `Votre commande SP Barber est expédiée — ${tracking_number.trim()}`,
        html: shipEmailHtml(tracking_number.trim(), transporteur, nomsArticles(articlesDeCeColis)),
      })
    } catch (e) {
      console.error('[Resend ship email]', e)
    }
  }

  return NextResponse.json({ ok: true })
}
