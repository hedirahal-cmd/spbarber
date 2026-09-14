'use client'
import { useState } from 'react'

/**
 * Formulaire public de depot d'avis, integre sur chaque fiche produit (le
 * produit est implicite, pas de selecteur). Anti-abus v1 : piege a robots
 * (champ cache -- un bot qui le remplit recoit un faux succes, rien n'est
 * enregistre) + validation stricte cote serveur. Rien ne se publie sans
 * moderation : /api/reviews force visible/verified a false quoi qu'on envoie.
 */
export function ReviewForm({ productId }: { productId: string }) {
  const [author, setAuthor] = useState('')
  const [rating, setRating] = useState('5')
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [piege, setPiege] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErr('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, rating, text, email, product_id: productId, site_web: piege }),
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
      <div className="rf-done">✓ Merci pour votre avis ! Il sera publié après vérification.</div>
    )
  }

  return (
    <form onSubmit={submit} className="rf-form">
      <div className="rf-title">Laisser un avis sur ce produit</div>

      {/* Piege a robots -- invisible et inaccessible au clavier pour un humain */}
      <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
        <label>
          Laisser ce champ vide
          <input type="text" tabIndex={-1} autoComplete="off" value={piege} onChange={(e) => setPiege(e.target.value)} />
        </label>
      </div>

      <div className="rf-row">
        <div>
          <label className="rf-label">Votre nom</label>
          <input className="rf-input" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={80} required />
        </div>
        <div>
          <label className="rf-label">Note</label>
          <select className="rf-select" value={rating} onChange={(e) => setRating(e.target.value)} required>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="rf-label">Votre avis</label>
        <textarea className="rf-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} minLength={10} maxLength={1000} required />
      </div>

      <div>
        <label className="rf-label">Email (facultatif, jamais affiché)</label>
        <input className="rf-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
      </div>

      {err && <div className="rf-err">{err}</div>}

      <button type="submit" className="rf-btn" disabled={submitting}>
        {submitting ? 'Envoi…' : 'Publier mon avis'}
      </button>
    </form>
  )
}
