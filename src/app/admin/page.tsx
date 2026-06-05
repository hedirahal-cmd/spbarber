'use client'
import { useState, useEffect, useCallback } from 'react'
import { PRODUCTS } from '@/lib/products'

type Tab = 'produits' | 'commandes' | 'legal' | 'avis'

const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

const LEGAL_SLUGS = [
  { slug: 'cgv', title: 'CGV (Conditions Générales de Vente)' },
  { slug: 'mentions-legales', title: 'Mentions Légales' },
  { slug: 'politique-confidentialite', title: 'Politique de Confidentialité (RGPD)' },
]

function formatEur(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: 'En attente', paid: 'Payé', shipped: 'Expédié',
    delivered: 'Livré', cancelled: 'Annulé',
  }
  return map[s] ?? s
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    pending: '#b8903a', paid: '#2563eb', shipped: '#7c3aed',
    delivered: '#16a34a', cancelled: '#dc2626',
  }
  return map[s] ?? '#666'
}

// ─── Login ───
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      })
      if (res.ok) {
        onLogin()
      } else {
        const d = await res.json()
        setErr(d.error || 'Erreur')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={submit} style={{ background: '#141210', border: '1px solid rgba(255,255,255,.08)', padding: '40px 36px', width: 360, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--fd)', fontSize: 28, letterSpacing: 4, color: '#f8f6f3', marginBottom: 6 }}>
          SP<span style={{ color: '#b8903a' }}>.</span>BARBER
        </div>
        <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(248,246,243,.3)', textTransform: 'uppercase', marginBottom: 32 }}>
          Administration
        </div>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Mot de passe"
          autoFocus
          style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', color: '#f8f6f3', fontSize: 14, marginBottom: 14, outline: 'none' }}
        />
        {err && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 12 }}>{err}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '13px', background: '#b8903a', color: '#fff', border: 'none', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}
        >
          {loading ? '...' : 'Connexion'}
        </button>
      </form>
    </div>
  )
}

// ─── Tab Produits ───
function TabProduits() {
  const [overrides, setOverrides] = useState<Record<string, Record<string, unknown>>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((rows: Array<Record<string, unknown>>) => {
        const map: Record<string, Record<string, unknown>> = {}
        if (Array.isArray(rows)) rows.forEach((r) => { map[r.id as string] = r })
        setOverrides(map)
      })
      .catch(() => {})
  }, [])

  function startEdit(id: string) {
    const base = PRODUCTS.find((p) => p.id === id)!
    const ov = overrides[id] ?? {}
    setForm({
      name: String(ov.name ?? base.name),
      price: String(ov.price !== undefined && ov.price !== null ? ov.price : base.price),
      description: String(ov.description ?? base.description),
      stock: String(ov.stock !== undefined && ov.stock !== null ? ov.stock : base.stock),
      benefit: String(ov.benefit ?? base.benefit ?? ''),
    })
    setEditing(id)
  }

  async function save() {
    if (!editing) return
    setSaving(true)
    const res = await fetch('/api/admin/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing, ...form }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Sauvegardé ✓')
      setEditing(null)
      const rows: Array<Record<string, unknown>> = await fetch('/api/admin/products').then((r) => r.json())
      const map: Record<string, Record<string, unknown>> = {}
      if (Array.isArray(rows)) rows.forEach((r) => { map[r.id as string] = r })
      setOverrides(map)
      setTimeout(() => setMsg(''), 2000)
    }
  }

  return (
    <div>
      {msg && <div style={{ background: '#16a34a', color: '#fff', padding: '10px 16px', marginBottom: 16, fontSize: 13 }}>{msg}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            {['ID', 'Nom', 'Prix', 'Stock', 'Actions'].map((h) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(248,246,243,.5)', fontWeight: 600, letterSpacing: 1, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PRODUCTS.map((p) => {
            const ov = overrides[p.id]
            const name = ov?.name ? String(ov.name) : p.name
            const price = ov?.price !== undefined && ov?.price !== null ? Number(ov.price) : p.price
            const stock = ov?.stock !== undefined && ov?.stock !== null ? Number(ov.stock) : p.stock
            return (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <td style={{ padding: '10px 14px', color: '#b8903a', fontWeight: 700 }}>{p.id}</td>
                <td style={{ padding: '10px 14px', color: '#f8f6f3' }}>
                  {name}
                  {ov && <span style={{ color: '#b8903a', fontSize: 10, marginLeft: 6 }}>modifié</span>}
                </td>
                <td style={{ padding: '10px 14px', color: '#f8f6f3' }}>{formatEur(price)}</td>
                <td style={{ padding: '10px 14px', color: stock <= 5 ? '#dc2626' : '#f8f6f3' }}>{stock}</td>
                <td style={{ padding: '10px 14px' }}>
                  <button
                    onClick={() => startEdit(p.id)}
                    style={{ background: 'rgba(184,144,58,.15)', color: '#b8903a', border: '1px solid rgba(184,144,58,.3)', padding: '5px 14px', fontSize: 11, cursor: 'pointer', letterSpacing: 1 }}
                  >
                    Modifier
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {editing && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setEditing(null)}
        >
          <div
            style={{ background: '#1c1816', border: '1px solid rgba(255,255,255,.1)', padding: 32, width: 460, maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'var(--fd)', fontSize: 18, letterSpacing: 3, color: '#f8f6f3', marginBottom: 22 }}>
              MODIFIER LE PRODUIT #{editing}
            </div>
            {[
              { k: 'name', label: 'Nom', type: 'text' },
              { k: 'price', label: 'Prix (centimes, ex: 2990)', type: 'number' },
              { k: 'stock', label: 'Stock', type: 'number' },
              { k: 'benefit', label: 'Bénéfice (accroche)', type: 'text' },
            ].map(({ k, label, type }) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'rgba(248,246,243,.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>{label}</label>
                <input
                  type={type}
                  value={form[k] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 13px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#f8f6f3', fontSize: 13, outline: 'none' }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, color: 'rgba(248,246,243,.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Description</label>
              <textarea
                rows={3}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', padding: '10px 13px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#f8f6f3', fontSize: 13, outline: 'none', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={save}
                disabled={saving}
                style={{ flex: 1, padding: '12px', background: '#b8903a', color: '#fff', border: 'none', fontSize: 11, letterSpacing: 2, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
              >
                {saving ? '...' : 'Sauvegarder'}
              </button>
              <button
                onClick={() => setEditing(null)}
                style={{ padding: '12px 18px', background: 'transparent', color: 'rgba(248,246,243,.5)', border: '1px solid rgba(255,255,255,.12)', fontSize: 11, cursor: 'pointer' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Commandes ───
function TabCommandes() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/orders')
    if (res.ok) setOrders(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    await load()
    setUpdating(null)
  }

  if (loading) return <div style={{ color: 'rgba(248,246,243,.4)', padding: 24 }}>Chargement…</div>
  if (!orders.length) return <div style={{ color: 'rgba(248,246,243,.4)', padding: 24 }}>Aucune commande.</div>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            {['Date', 'E-mail', 'Total', 'Statut', 'Modifier statut'].map((h) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(248,246,243,.5)', fontWeight: 600, letterSpacing: 1, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={String(o.id)} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <td style={{ padding: '10px 14px', color: 'rgba(248,246,243,.55)' }}>
                {o.created_at ? new Date(String(o.created_at)).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td style={{ padding: '10px 14px', color: '#f8f6f3' }}>{String(o.email ?? '—')}</td>
              <td style={{ padding: '10px 14px', color: '#b8903a', fontWeight: 700 }}>{o.total ? formatEur(Number(o.total)) : '—'}</td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ color: statusColor(String(o.status ?? '')), fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {statusLabel(String(o.status ?? ''))}
                </span>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <select
                  value={String(o.status ?? 'pending')}
                  disabled={updating === String(o.id)}
                  onChange={(e) => updateStatus(String(o.id), e.target.value)}
                  style={{ background: '#1c1816', color: '#f8f6f3', border: '1px solid rgba(255,255,255,.12)', padding: '5px 10px', fontSize: 12, cursor: 'pointer', outline: 'none' }}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tab Textes Légaux ───
function TabLegal() {
  const [pages, setPages] = useState<Record<string, { title: string; content: string }>>({})
  const [active, setActive] = useState('cgv')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/legal')
      .then((r) => r.json())
      .then((rows: Array<{ slug: string; title: string; content: string }>) => {
        if (Array.isArray(rows)) {
          const map: Record<string, { title: string; content: string }> = {}
          rows.forEach((r) => { map[r.slug] = { title: r.title, content: r.content } })
          setPages(map)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setContent(pages[active]?.content ?? '')
  }, [active, pages])

  async function save() {
    setSaving(true)
    const info = LEGAL_SLUGS.find((l) => l.slug === active)!
    const res = await fetch('/api/admin/legal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: active, title: info.title, content }),
    })
    setSaving(false)
    if (res.ok) {
      setPages((p) => ({ ...p, [active]: { title: info.title, content } }))
      setMsg('Sauvegardé dans Supabase ✓')
      setTimeout(() => setMsg(''), 2000)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {LEGAL_SLUGS.map((l) => (
          <button
            key={l.slug}
            onClick={() => setActive(l.slug)}
            style={{
              padding: '8px 16px', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
              background: active === l.slug ? '#b8903a' : 'transparent',
              color: active === l.slug ? '#fff' : 'rgba(248,246,243,.5)',
              border: `1px solid ${active === l.slug ? '#b8903a' : 'rgba(255,255,255,.12)'}`,
              cursor: 'pointer',
            }}
          >
            {l.slug.replace(/-/g, ' ')}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'rgba(248,246,243,.3)', marginBottom: 12, lineHeight: 1.6 }}>
        Sauvegarde dans Supabase (référence admin). Les pages légales du site utilisent leur contenu statique intégré au code.
      </div>

      {msg && <div style={{ background: '#16a34a', color: '#fff', padding: '8px 14px', marginBottom: 12, fontSize: 12 }}>{msg}</div>}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        placeholder="Contenu de la page légale…"
        style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.1)', color: '#f8f6f3', fontSize: 13, lineHeight: 1.7, outline: 'none', resize: 'vertical' }}
      />
      <button
        onClick={save}
        disabled={saving}
        style={{ marginTop: 12, padding: '12px 28px', background: '#b8903a', color: '#fff', border: 'none', fontSize: 11, letterSpacing: 2, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
      >
        {saving ? '...' : 'Sauvegarder'}
      </button>
    </div>
  )
}

// ─── Tab Avis Clients ───
function TabAvis() {
  const [reviews, setReviews] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ author: '', avatar: '👤', rating: '5', text: '', product_name: '', verified: true, visible: true })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/reviews')
    if (res.ok) setReviews(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addReview(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Avis ajouté ✓')
      setShowForm(false)
      setForm({ author: '', avatar: '👤', rating: '5', text: '', product_name: '', verified: true, visible: true })
      await load()
      setTimeout(() => setMsg(''), 2000)
    }
  }

  async function toggleVisible(r: Record<string, unknown>) {
    await fetch('/api/admin/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, visible: !r.visible }),
    })
    await load()
  }

  async function deleteReview(id: unknown) {
    if (!confirm('Supprimer cet avis ?')) return
    await fetch('/api/admin/reviews', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await load()
  }

  if (loading) return <div style={{ color: 'rgba(248,246,243,.4)', padding: 24 }}>Chargement…</div>

  return (
    <div>
      {msg && <div style={{ background: '#16a34a', color: '#fff', padding: '8px 14px', marginBottom: 12, fontSize: 12 }}>{msg}</div>}
      <button
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 20, padding: '10px 20px', background: '#b8903a', color: '#fff', border: 'none', fontSize: 11, letterSpacing: 2, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
      >
        + Ajouter un avis
      </button>

      {showForm && (
        <form onSubmit={addReview} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {[
              { k: 'author', label: 'Nom' },
              { k: 'avatar', label: 'Avatar (emoji)' },
              { k: 'rating', label: 'Note (1-5)' },
              { k: 'product_name', label: 'Produit' },
            ].map(({ k, label }) => (
              <div key={k}>
                <label style={{ display: 'block', fontSize: 10, color: 'rgba(248,246,243,.4)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>{label}</label>
                <input
                  value={String(form[k as keyof typeof form])}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  required={k === 'author' || k === 'rating'}
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#f8f6f3', fontSize: 13, outline: 'none' }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, color: 'rgba(248,246,243,.4)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>Texte de l&apos;avis</label>
            <textarea
              rows={3}
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              required
              style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#f8f6f3', fontSize: 13, outline: 'none', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {[['verified', 'Vérifié'], ['visible', 'Visible']].map(([k, label]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#f8f6f3', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(form[k as keyof typeof form])}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
          <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: '#b8903a', color: '#fff', border: 'none', fontSize: 11, letterSpacing: 2, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
            {saving ? '...' : 'Ajouter'}
          </button>
        </form>
      )}

      {!reviews.length && <div style={{ color: 'rgba(248,246,243,.4)', padding: 16 }}>Aucun avis dans Supabase.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reviews.map((r) => (
          <div key={String(r.id)} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{String(r.avatar ?? '👤')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ color: '#f8f6f3', fontWeight: 600, fontSize: 13 }}>{String(r.author ?? '')}</span>
                <span style={{ color: '#b8903a', fontSize: 11 }}>{'★'.repeat(Number(r.rating ?? 5))}</span>
                {r.product_name && <span style={{ color: 'rgba(248,246,243,.4)', fontSize: 11 }}>{String(r.product_name)}</span>}
                {r.verified && <span style={{ color: '#16a34a', fontSize: 10, letterSpacing: 1 }}>✓ VÉRIFIÉ</span>}
              </div>
              <div style={{ color: 'rgba(248,246,243,.7)', fontSize: 13, lineHeight: 1.5 }}>{String(r.text ?? '')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => toggleVisible(r)}
                style={{
                  padding: '5px 12px', fontSize: 10, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
                  background: r.visible ? 'rgba(22,163,74,.15)' : 'rgba(220,38,38,.1)',
                  color: r.visible ? '#16a34a' : '#dc2626',
                  border: `1px solid ${r.visible ? 'rgba(22,163,74,.3)' : 'rgba(220,38,38,.3)'}`,
                }}
              >
                {r.visible ? 'Visible' : 'Masqué'}
              </button>
              <button
                onClick={() => deleteReview(r.id)}
                style={{ padding: '5px 12px', fontSize: 10, letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase', background: 'rgba(220,38,38,.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,.3)' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page principale ───
export default function AdminPage() {
  const [auth, setAuth] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('produits')

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((r) => r.json())
      .then((d) => setAuth(d.authenticated))
      .catch(() => setAuth(false))
  }, [])

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setAuth(false)
  }

  if (auth === null) return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(248,246,243,.4)' }}>
      Chargement…
    </div>
  )

  if (!auth) return <LoginForm onLogin={() => setAuth(true)} />

  const TABS: { id: Tab; label: string }[] = [
    { id: 'produits', label: 'Produits' },
    { id: 'commandes', label: 'Commandes' },
    { id: 'legal', label: 'Textes Légaux' },
    { id: 'avis', label: 'Avis Clients' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', color: '#f8f6f3', fontFamily: 'var(--fb)' }}>
      {/* Header */}
      <div style={{ background: '#141210', borderBottom: '1px solid rgba(255,255,255,.08)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 24, height: 56 }}>
        <span style={{ fontFamily: 'var(--fd)', fontSize: 20, letterSpacing: 3, color: '#f8f6f3' }}>
          SP<span style={{ color: '#b8903a' }}>.</span>BARBER
        </span>
        <span style={{ fontSize: 10, color: 'rgba(248,246,243,.3)', letterSpacing: 2, textTransform: 'uppercase' }}>Administration</span>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ fontSize: 11, color: 'rgba(248,246,243,.4)', letterSpacing: 1, textDecoration: 'none' }}>← Site</a>
        <button
          onClick={logout}
          style={{ fontSize: 11, color: 'rgba(248,246,243,.4)', background: 'none', border: '1px solid rgba(255,255,255,.1)', padding: '5px 14px', cursor: 'pointer', letterSpacing: 1 }}
        >
          Déconnexion
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: '#141210', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '0 24px', display: 'flex', gap: 0, overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '14px 22px', background: 'none', border: 'none',
              borderBottom: tab === t.id ? '2px solid #b8903a' : '2px solid transparent',
              color: tab === t.id ? '#f8f6f3' : 'rgba(248,246,243,.4)',
              fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
              fontWeight: tab === t.id ? 700 : 400, whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>
        {tab === 'produits' && <TabProduits />}
        {tab === 'commandes' && <TabCommandes />}
        {tab === 'legal' && <TabLegal />}
        {tab === 'avis' && <TabAvis />}
      </div>
    </div>
  )
}
