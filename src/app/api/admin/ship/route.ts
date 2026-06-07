import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'

async function isAdmin() {
  const store = await cookies()
  return store.get('spbarber_admin')?.value === 'authenticated'
}

function shipEmailHtml(email: string, tracking: string): string {
  const trackingUrl = `https://www.laposte.fr/outils/track-a-parcel?code=${tracking}`
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
            <p style="color:#9a9590;font-size:14px;line-height:1.6;margin:0 0 28px;">
              Bonjour, votre commande SP Barber a été expédiée via Colissimo et est en chemin vers vous.
            </p>
            <!-- Tracking box -->
            <div style="background:#0c0c0c;border:1px solid #2a2a2a;border-radius:6px;padding:20px 24px;margin-bottom:28px;">
              <div style="font-size:11px;color:#9a9590;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Numéro de suivi</div>
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
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, tracking_number } = await req.json()
  if (!id || !tracking_number?.trim()) {
    return NextResponse.json({ error: 'id et tracking_number requis' }, { status: 400 })
  }

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('email')
    .eq('id', id)
    .single()
  if (fetchErr || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status: 'shipped', tracking_number: tracking_number.trim(), shipped_at: new Date().toISOString() })
    .eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey && order.email) {
    try {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: 'SP Barber <noreply@spbarber.fr>',
        to: [order.email],
        subject: `Votre commande SP Barber est expédiée — ${tracking_number.trim()}`,
        html: shipEmailHtml(order.email, tracking_number.trim()),
      })
    } catch (e) {
      console.error('[Resend ship email]', e)
    }
  }

  return NextResponse.json({ ok: true })
}
