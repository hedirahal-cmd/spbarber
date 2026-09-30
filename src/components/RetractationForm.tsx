'use client'
import { useState } from 'react'

/**
 * Formulaire public de demande de retractation -- accessible sans compte ni
 * connexion (obligation legale depuis le 19/06/2026 d'un parcours en ligne,
 * pas seulement par e-mail). Anti-abus : meme piege a robots que ReviewForm.
 * Declaratif : aucune verification automatique contre la table orders (pas
 * de compte client sur ce site), le numero de commande sert juste a aider
 * le traitement manuel.
 */
export function RetractationForm() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [numeroCommande, setNumeroCommande] = useState('')
  const [dateCommande, setDateCommande] = useState('')
  const [produits, setProduits] = useState('')
  const [motif, setMotif] = useState('')
  const [piege, setPiege] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErr('')
    try {
      const res = await fetch('/api/retractation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom, email, produits,
          numero_commande: numeroCommande,
          date_commande: dateCommande,
          motif,
          site_web: piege,
        }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const d = await res.json().catch(() => ({}))
        setErr(d.error ?? 'Une erreur est survenue, réessayez.')
      }
    } catch {
      setErr('Erreur réseau, réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rtn-done">
        ✓ Votre demande de rétractation a bien été enregistrée. Un e-mail de confirmation vient de vous être envoyé, et notre équipe reviendra vers vous si besoin.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rtn-form">
      {/* Piege a robots -- invisible et inaccessible au clavier pour un humain */}
      <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
        <label>
          Laisser ce champ vide
          <input type="text" tabIndex={-1} autoComplete="off" value={piege} onChange={(e) => setPiege(e.target.value)} />
        </label>
      </div>

      <div className="rtn-row">
        <div>
          <label className="rtn-label">Votre nom</label>
          <input className="rtn-input" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={120} required />
        </div>
        <div>
          <label className="rtn-label">Votre e-mail</label>
          <input className="rtn-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} required />
        </div>
      </div>

      <div className="rtn-row">
        <div>
          <label className="rtn-label">Numéro de commande <span className="rtn-optional">(facultatif)</span></label>
          <input className="rtn-input" value={numeroCommande} onChange={(e) => setNumeroCommande(e.target.value)} maxLength={60} placeholder="Ex. AB12CD34" />
        </div>
        <div>
          <label className="rtn-label">Date de commande <span className="rtn-optional">(facultatif)</span></label>
          <input className="rtn-input" type="date" value={dateCommande} onChange={(e) => setDateCommande(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="rtn-label">Produit(s) concerné(s)</label>
        <input className="rtn-input" value={produits} onChange={(e) => setProduits(e.target.value)} maxLength={500} required placeholder="Ex. Pack Barbe Complet" />
      </div>

      <div>
        <label className="rtn-label">Motif <span className="rtn-optional">(facultatif — aucune justification n&apos;est exigée par la loi)</span></label>
        <textarea className="rtn-textarea" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={1000} />
      </div>

      {err && <div className="rtn-err">{err}</div>}

      <button type="submit" className="rtn-btn" disabled={submitting}>
        {submitting ? 'Envoi…' : 'Envoyer ma demande de rétractation'}
      </button>
    </form>
  )
}
