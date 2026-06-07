'use client'
import { useState, useEffect, useCallback } from 'react'
import { PRODUCTS } from '@/lib/products'

type NavSection = 'produits' | 'commandes' | 'legal' | 'avis' | 'salons'

const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']
const LEGAL_SLUGS = [
  { slug: 'cgv', title: 'CGV' },
  { slug: 'mentions-legales', title: 'Mentions légales' },
  { slug: 'politique-confidentialite', title: 'Politique de confidentialité' },
]

const CAT_LABELS: Record<string, string> = {
  coiffant: 'Coiffant', soin: 'Soin', barbe: 'Barbe', accessoire: 'Accessoire',
}
const CAT_COLORS: Record<string, string> = {
  coiffant: '#2563eb', soin: '#7c3aed', barbe: '#b8903a', accessoire: '#16a34a',
}

function eur(c: number) { return (c / 100).toFixed(2).replace('.', ',') + ' €' }
function statusLabel(s: string) {
  return ({ pending: 'En attente', paid: 'Payé', shipped: 'Expédié', delivered: 'Livré', cancelled: 'Annulé' })[s] ?? s
}
function statusBadge(s: string): { bg: string; color: string } {
  const m: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fff7ed', color: '#c2410c' },
    paid: { bg: '#eff6ff', color: '#1d4ed8' },
    shipped: { bg: '#f5f3ff', color: '#6d28d9' },
    delivered: { bg: '#f0fdf4', color: '#15803d' },
    cancelled: { bg: '#fef2f2', color: '#b91c1c' },
  }
  return m[s] ?? { bg: '#f4f4f5', color: '#71717a' }
}

// ─── Tokens de style ─────────────────────────────────────────────
const S = {
  sidebar: '#1c1c1c',
  sidebarBorder: 'rgba(255,255,255,.08)',
  sidebarText: 'rgba(255,255,255,.6)',
  sidebarActive: '#ffffff',
  sidebarActiveBg: 'rgba(255,255,255,.1)',
  bg: '#f6f6f7',
  card: '#ffffff',
  border: '#e1e3e5',
  text: '#202223',
  muted: '#6d7175',
  gold: '#b8903a',
  input: { border: '1px solid #ababab', borderRadius: 4, padding: '8px 12px', fontSize: 14, width: '100%', color: '#202223', outline: 'none', background: '#fff', boxSizing: 'border-box' as const },
  btnPrimary: { background: '#b8903a', color: '#fff', border: 'none', padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 4 },
  btnSecondary: { background: '#fff', color: '#202223', border: '1px solid #ababab', padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 4 },
  card_: { background: '#fff', border: '1px solid #e1e3e5', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
}

// ─── Login ─────────────────────────────────────────────────────
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr('')
    try {
      const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) })
      if (res.ok) { onLogin() } else { const d = await res.json(); setErr(d.error || 'Mot de passe incorrect') }
    } finally { setLoading(false) }
  }
  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...S.card_, padding: '40px 36px', width: 380 }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 24, letterSpacing: 4, color: S.text, marginBottom: 4 }}>
            SP<span style={{ color: S.gold }}>.</span>BARBER
          </div>
          <div style={{ fontSize: 13, color: S.muted }}>Connexion à l&apos;administration</div>
        </div>
        <form onSubmit={submit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 6 }}>Mot de passe</label>
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoFocus style={{ ...S.input, marginBottom: err ? 8 : 16 }} />
          {err && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <button type="submit" disabled={loading} style={{ ...S.btnPrimary, width: '100%', padding: '11px 20px', fontSize: 14 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────
function Sidebar({ active, setActive, logout }: { active: NavSection; setActive: (s: NavSection) => void; logout: () => void }) {
  const sections = [
    { label: 'CATALOGUE', items: [{ id: 'produits' as NavSection, label: 'Produits' }] },
    { label: 'VENTES', items: [{ id: 'commandes' as NavSection, label: 'Commandes' }] },
    { label: 'SALONS', items: [{ id: 'salons' as NavSection, label: 'Salons' }] },
    { label: 'CONTENU', items: [{ id: 'legal' as NavSection, label: 'Textes légaux' }, { id: 'avis' as NavSection, label: 'Avis clients' }] },
  ]
  return (
    <div style={{ width: 232, background: S.sidebar, height: '100vh', position: 'fixed', top: 0, left: 0, display: 'flex', flexDirection: 'column', zIndex: 10 }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 16px', borderBottom: `1px solid ${S.sidebarBorder}` }}>
        <div style={{ fontFamily: 'var(--fd)', fontSize: 18, letterSpacing: 3, color: '#fff' }}>
          SP<span style={{ color: S.gold }}>.</span>BARBER
        </div>
        <div style={{ fontSize: 10, color: S.sidebarText, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>Administration</div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {sections.map((sec) => (
          <div key={sec.label} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: 2, textTransform: 'uppercase', padding: '8px 20px 4px', fontWeight: 600 }}>{sec.label}</div>
            {sec.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 20px', background: active === item.id ? S.sidebarActiveBg : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 0,
                  color: active === item.id ? S.sidebarActive : S.sidebarText,
                  fontSize: 14, fontWeight: active === item.id ? 600 : 400,
                  borderLeft: active === item.id ? `2px solid ${S.gold}` : '2px solid transparent',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${S.sidebarBorder}`, padding: '8px 0' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', color: S.sidebarText, fontSize: 14, textDecoration: 'none' }}>
          ← Voir le site
        </a>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 20px', background: 'none', border: 'none', cursor: 'pointer', color: S.sidebarText, fontSize: 14, textAlign: 'left' }}>
          Déconnexion
        </button>
      </div>
    </div>
  )
}

// ─── Produit: image placeholder ─────────────────────────────────
function ProductThumb({ category }: { category: string }) {
  const icons: Record<string, string> = { coiffant: '◈', soin: '◉', barbe: '◆', accessoire: '◇' }
  return (
    <div style={{ width: 44, height: 44, borderRadius: 6, background: '#f4f4f5', border: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: CAT_COLORS[category] ?? '#71717a', flexShrink: 0 }}>
      {icons[category] ?? '◈'}
    </div>
  )
}

// ─── Tab Produits ──────────────────────────────────────────────
function TabProduits() {
  const [overrides, setOverrides] = useState<Record<string, Record<string, unknown>>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/products').then(r => r.json()).then((rows: Array<Record<string, unknown>>) => {
      if (!Array.isArray(rows)) return
      const map: Record<string, Record<string, unknown>> = {}
      rows.forEach(r => { map[r.id as string] = r })
      setOverrides(map)
    }).catch(() => {})
  }, [])

  function startEdit(id: string) {
    const base = PRODUCTS.find(p => p.id === id)!
    const ov = overrides[id] ?? {}
    setForm({
      name: String(ov.name ?? base.name),
      price: String(ov.price != null ? ov.price : base.price),
      description: String(ov.description ?? base.description),
      stock: String(ov.stock != null ? ov.stock : base.stock),
      benefit: String(ov.benefit ?? base.benefit ?? ''),
    })
    setEditing(id)
    setSaved(false)
  }

  async function save() {
    if (!editing) return
    setSaving(true)
    const res = await fetch('/api/admin/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, ...form }) })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      const rows: Array<Record<string, unknown>> = await fetch('/api/admin/products').then(r => r.json())
      const map: Record<string, Record<string, unknown>> = {}
      if (Array.isArray(rows)) rows.forEach(r => { map[r.id as string] = r })
      setOverrides(map)
    }
  }

  const selectedProduct = editing ? PRODUCTS.find(p => p.id === editing) : null
  const ov = editing ? overrides[editing] : null

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%' }}>
      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: S.text, margin: 0 }}>Produits</h1>
            <p style={{ fontSize: 13, color: S.muted, margin: '2px 0 0' }}>{PRODUCTS.length} produits</p>
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ ...S.card_, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: S.muted, width: 60 }}></th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: S.muted }}>Produit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: S.muted }}>Catégorie</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: S.muted }}>Prix</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: S.muted }}>Stock</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: S.muted }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTS.map(p => {
                  const o = overrides[p.id]
                  const price = o?.price != null ? Number(o.price) : p.price
                  const stock = o?.stock != null ? Number(o.stock) : p.stock
                  const name = o?.name ? String(o.name) : p.name
                  const isActive = editing === p.id
                  return (
                    <tr
                      key={p.id}
                      onClick={() => startEdit(p.id)}
                      style={{ borderBottom: `1px solid ${S.border}`, cursor: 'pointer', background: isActive ? '#fdf8f0' : 'transparent', transition: 'background .15s' }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = S.bg }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <td style={{ padding: '14px 8px 14px 16px' }}>
                        <ProductThumb category={p.category} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500, color: S.text }}>{name}</div>
                        <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>ID #{p.id}{o && <span style={{ color: S.gold, marginLeft: 6 }}>• modifié</span>}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 10px', background: `${CAT_COLORS[p.category] ?? '#71717a'}18`, color: CAT_COLORS[p.category] ?? '#71717a', borderRadius: 20, fontWeight: 500 }}>
                          {CAT_LABELS[p.category] ?? p.category}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: S.text }}>{eur(price)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: stock <= 10 ? '#b91c1c' : S.text, fontWeight: stock <= 10 ? 600 : 400 }}>{stock}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: p.is_dropshipping ? '#eff6ff' : '#f0fdf4', color: p.is_dropshipping ? '#1d4ed8' : '#15803d' }}>
                          {p.is_dropshipping ? 'Dropshipping' : 'En stock'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Panel d'édition */}
      {editing && selectedProduct && (
        <div style={{ width: 400, background: S.card, borderLeft: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', flexShrink: 0 }}>
          {/* Panel header */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: S.text }}>{selectedProduct.name}</div>
              <div style={{ fontSize: 12, color: S.muted }}>Produit #{editing}</div>
            </div>
            <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: S.muted, padding: 4, lineHeight: 1 }}>×</button>
          </div>

          <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
            {saved && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d', fontWeight: 500 }}>Modifications sauvegardées</div>}
            {ov && !saved && <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>Ce produit a des modifications actives dans Supabase.</div>}

            {/* Photo */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.text, marginBottom: 8 }}>Photo produit</div>
              <div style={{ border: '2px dashed #e1e3e5', borderRadius: 6, padding: '24px 16px', textAlign: 'center', background: S.bg }}>
                <ProductThumb category={selectedProduct.category} />
                <div style={{ fontSize: 12, color: S.muted, marginTop: 8 }}>Upload via Supabase Storage (à configurer)</div>
              </div>
            </div>

            {/* Titre */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 6 }}>Titre</label>
              <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={S.input} />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 6 }}>Description</label>
              <textarea rows={4} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...S.input, resize: 'vertical' }} />
            </div>

            {/* Bénéfice */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 4 }}>Accroche bénéfice</label>
              <div style={{ fontSize: 12, color: S.muted, marginBottom: 6 }}>Affiché sur les cartes produits</div>
              <input value={form.benefit ?? ''} onChange={e => setForm(f => ({ ...f, benefit: e.target.value }))} style={S.input} />
            </div>

            {/* Prix & Stock */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 4 }}>Prix (centimes)</label>
                <div style={{ fontSize: 11, color: S.muted, marginBottom: 6 }}>2490 = 24,90 €</div>
                <input type="number" value={form.price ?? ''} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={S.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 4 }}>Stock</label>
                <div style={{ fontSize: 11, color: S.muted, marginBottom: 6 }}>&nbsp;</div>
                <input type="number" value={form.stock ?? ''} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} style={S.input} />
              </div>
            </div>

            {/* Variants */}
            {selectedProduct.variants && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: S.text, marginBottom: 8 }}>Variantes</div>
                <div style={{ border: `1px solid ${S.border}`, borderRadius: 6, overflow: 'hidden' }}>
                  {selectedProduct.variants.map((v, i) => (
                    <div key={v.id} style={{ padding: '10px 14px', borderBottom: i < (selectedProduct.variants?.length ?? 0) - 1 ? `1px solid ${S.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: S.text }}>{v.name}</span>
                      <span style={{ fontWeight: 600, color: S.muted }}>{eur(v.price)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>Les variantes sont gérées dans le code (lib/products.ts)</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${S.border}`, display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={save} disabled={saving} style={{ ...S.btnPrimary, flex: 1 }}>
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
            <button onClick={() => setEditing(null)} style={S.btnSecondary}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Salons (table salons) ─────────────────────────────────
type SalonRow = {
  slug: string; nom: string; adresse: string; ville: string; code_postal: string
  telephone: string; horaires: string; note_google: string; nombre_avis: string
  lien_planity: string; lien_google_maps: string; actif: boolean
}

const SALON_DISPLAY: Record<string, { title: string; btn: string; confirm: string }> = {
  fougeres: { title: 'SP Barber Shop — Fougères', btn: 'Enregistrer Fougères', confirm: '✓ Salon Fougères mis à jour' },
  ernee: { title: 'SP Barbershop — Ernée', btn: 'Enregistrer Ernée', confirm: '✓ Salon Ernée mis à jour' },
}

const FALLBACK_SALONS: SalonRow[] = [
  { slug: 'fougeres', nom: 'SP Barber Shop', adresse: '48 Boulevard Jean Jaurès', ville: 'Fougères', code_postal: '35300', telephone: '', horaires: 'Lun–Sam 9h–19h', note_google: '4.9', nombre_avis: '47', lien_planity: 'https://www.planity.com/sp-barber-shop-35300-fougeres', lien_google_maps: '', actif: true },
  { slug: 'ernee', nom: 'SP Barbershop Ernée', adresse: '', ville: 'Ernée', code_postal: '53500', telephone: '', horaires: '', note_google: '', nombre_avis: '', lien_planity: '', lien_google_maps: 'https://www.google.com/search?q=Sp+barbershop+ernee', actif: true },
]

function makeForms(rows: SalonRow[]): Record<string, SalonRow> {
  const map: Record<string, SalonRow> = {}
  rows.forEach(r => { map[r.slug] = { ...r } })
  return map
}

function SalonFormCard({
  salon, form, isSaving, isSaved, err,
  onField, onSave,
}: {
  salon: SalonRow; form: SalonRow; isSaving: boolean; isSaved: boolean; err: string
  onField: (key: keyof SalonRow, val: string | boolean) => void
  onSave: () => void
}) {
  const display = SALON_DISPLAY[salon.slug] ?? { title: form.nom || salon.slug, btn: 'Enregistrer', confirm: '✓ Salon mis à jour' }
  return (
    <div style={S.card_}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: S.text }}>{display.title}</div>
          <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{form.ville}{form.code_postal ? `, ${form.code_postal}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isSaved && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>{display.confirm}</span>}
          {err && <span style={{ fontSize: 13, color: '#b91c1c' }}>{err}</span>}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: S.muted, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.actif} onChange={e => onField('actif', e.target.checked)} />
            Actif
          </label>
          <button onClick={onSave} disabled={isSaving} style={S.btnPrimary}>
            {isSaving ? 'Sauvegarde…' : display.btn}
          </button>
        </div>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Nom du salon</label>
          <input value={form.nom ?? ''} onChange={e => onField('nom', e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Adresse</label>
          <input value={form.adresse ?? ''} onChange={e => onField('adresse', e.target.value)} placeholder="48 Boulevard Jean Jaurès" style={S.input} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Ville</label>
            <input value={form.ville ?? ''} onChange={e => onField('ville', e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Code postal</label>
            <input value={form.code_postal ?? ''} onChange={e => onField('code_postal', e.target.value)} style={S.input} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Téléphone</label>
            <input value={form.telephone ?? ''} onChange={e => onField('telephone', e.target.value)} placeholder="02 99 00 00 00" style={S.input} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Horaires</label>
            <input value={form.horaires ?? ''} onChange={e => onField('horaires', e.target.value)} placeholder="Lun–Sam 9h–19h" style={S.input} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Note Google</label>
            <input value={form.note_google ?? ''} onChange={e => onField('note_google', e.target.value)} placeholder="4.9" style={S.input} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Nombre d&apos;avis</label>
            <input value={form.nombre_avis ?? ''} onChange={e => onField('nombre_avis', e.target.value)} placeholder="47" style={S.input} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Lien Planity</label>
          <input value={form.lien_planity ?? ''} onChange={e => onField('lien_planity', e.target.value)} placeholder="https://www.planity.com/…" style={S.input} />
          <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>Si vide → bouton &quot;Réserver en ligne&quot; masqué</div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Lien Google Maps (itinéraire)</label>
          <input value={form.lien_google_maps ?? ''} onChange={e => onField('lien_google_maps', e.target.value)} placeholder="https://www.google.com/maps/dir/…" style={S.input} />
        </div>
      </div>
    </div>
  )
}

function TabSalons() {
  const [salons, setSalons] = useState<SalonRow[]>(FALLBACK_SALONS)
  const [forms, setForms] = useState<Record<string, SalonRow>>(makeForms(FALLBACK_SALONS))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [errs, setErrs] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/salons')
      .then(r => r.json())
      .then((rows: SalonRow[]) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setSalons(rows)
          setForms(makeForms(rows))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function setField(slug: string, key: keyof SalonRow, val: string | boolean) {
    setForms(f => ({ ...f, [slug]: { ...f[slug], [key]: val } }))
    setSaved(null)
  }

  async function save(slug: string) {
    setSaving(slug)
    setErrs(e => ({ ...e, [slug]: '' }))
    const res = await fetch('/api/admin/salons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forms[slug]),
    })
    setSaving(null)
    if (res.ok) {
      setSaved(slug)
      setTimeout(() => setSaved(s => s === slug ? null : s), 2500)
    } else {
      const data = await res.json().catch(() => ({}))
      setErrs(e => ({ ...e, [slug]: `Erreur ${res.status}${data?.error ? ` — ${data.error}` : ''}` }))
    }
  }

  const fougeres = salons.find(s => s.slug === 'fougeres') ?? FALLBACK_SALONS[0]
  const ernee = salons.find(s => s.slug === 'ernee') ?? FALLBACK_SALONS[1]

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: S.text, margin: 0 }}>Salons</h1>
          <p style={{ fontSize: 13, color: S.muted, margin: '2px 0 0' }}>Informations affichées sur le site — chargement {loading ? 'en cours…' : 'terminé'}</p>
        </div>
      </div>

      <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 860 }}>

        <SalonFormCard
          salon={fougeres}
          form={forms['fougeres'] ?? fougeres}
          isSaving={saving === 'fougeres'}
          isSaved={saved === 'fougeres'}
          err={errs['fougeres'] ?? ''}
          onField={(key, val) => setField('fougeres', key, val)}
          onSave={() => save('fougeres')}
        />

        <div style={{ margin: '32px 0', position: 'relative' }}>
          <div style={{ borderTop: `1px solid ${S.border}` }} />
          <span style={{
            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
            background: S.bg, padding: '0 20px', fontSize: 11, color: S.muted,
            letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            Deuxième salon
          </span>
        </div>

        <SalonFormCard
          salon={ernee}
          form={forms['ernee'] ?? ernee}
          isSaving={saving === 'ernee'}
          isSaved={saved === 'ernee'}
          err={errs['ernee'] ?? ''}
          onField={(key, val) => setField('ernee', key, val)}
          onSave={() => save('ernee')}
        />

      </div>
    </div>
  )
}

// ─── Tab Salon ─────────────────────────────────────────────────
type GReview = { text: string; name: string; initials: string; color: string; date: string }
type SalonCfg = { phone: string; google_rating: string; google_reviews_count: number; google_reviews_url: string; google_reviews: GReview[] }

const EMPTY_REVIEW: GReview = { text: '', name: '', initials: '', color: '#1a3a5a', date: '' }
const DEFAULT_CFG: SalonCfg = {
  phone: '', google_rating: '4,9', google_reviews_count: 47,
  google_reviews_url: 'https://www.google.com/maps/search/SP+Barber+Foug%C3%A8res',
  google_reviews: [{ ...EMPTY_REVIEW }, { ...EMPTY_REVIEW, color: '#3a1a5a' }, { ...EMPTY_REVIEW, color: '#1a5a3a' }],
}
const PHOTOS = [
  { slot: 1, file: 'salon-1.jpg', label: 'Photo principale' },
  { slot: 2, file: 'salon-2.jpg', label: 'Intérieur salon' },
  { slot: 3, file: 'salon-3.jpg', label: 'Ambiance / détail' },
]

function TabSalon() {
  const [cfg, setCfg] = useState<SalonCfg>(DEFAULT_CFG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/admin/salon').then(r => r.json()).then((d: SalonCfg) => {
      if (d && !('error' in d)) {
        const reviews = Array.isArray(d.google_reviews) && d.google_reviews.length === 3
          ? d.google_reviews
          : DEFAULT_CFG.google_reviews
        setCfg({ ...DEFAULT_CFG, ...d, google_reviews: reviews })
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function setField(key: keyof SalonCfg, val: string | number) {
    setCfg(c => ({ ...c, [key]: val }))
    setSaved(false)
  }
  function setReview(i: number, key: keyof GReview, val: string) {
    setCfg(c => {
      const reviews = [...c.google_reviews]
      reviews[i] = { ...reviews[i], [key]: val }
      return { ...c, google_reviews: reviews }
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true); setErr('')
    const res = await fetch('/api/admin/salon', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    setSaving(false)
    if (res.ok) { setSaved(true) } else { setErr('Erreur lors de la sauvegarde') }
  }

  if (loading) return <div style={{ padding: 40, color: S.muted, textAlign: 'center' }}>Chargement…</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: S.text, margin: 0 }}>Salon</h1>
          <p style={{ fontSize: 13, color: S.muted, margin: '2px 0 0' }}>Informations du salon, avis Google et photos</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>✓ Sauvegardé</span>}
          {err && <span style={{ fontSize: 13, color: '#b91c1c' }}>{err}</span>}
          <button onClick={save} disabled={saving} style={S.btnPrimary}>
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
          <a href="/" target="_blank" style={{ ...S.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Voir le site →
          </a>
        </div>
      </div>

      <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>

        {/* ─ Infos générales ─ */}
        <div style={S.card_}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, fontWeight: 600, fontSize: 14, color: S.text }}>
            Informations générales
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 6 }}>Téléphone</label>
              <input
                value={cfg.phone}
                onChange={e => setField('phone', e.target.value)}
                placeholder="ex : 02 99 00 00 00"
                style={S.input}
              />
              <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>Affiché sous les horaires sur la homepage et /salon</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 6 }}>Note Google</label>
                <input
                  value={cfg.google_rating}
                  onChange={e => setField('google_rating', e.target.value)}
                  placeholder="4,9"
                  style={S.input}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 6 }}>Nombre d&apos;avis Google</label>
                <input
                  type="number"
                  value={cfg.google_reviews_count}
                  onChange={e => setField('google_reviews_count', Number(e.target.value))}
                  style={S.input}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 6 }}>Lien Google Maps (page avis)</label>
              <input
                value={cfg.google_reviews_url}
                onChange={e => setField('google_reviews_url', e.target.value)}
                placeholder="https://g.page/r/…"
                style={S.input}
              />
              <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>Lien du bouton "Voir tous les avis sur Google →" en bas de la homepage</div>
            </div>
          </div>
        </div>

        {/* ─ Avis Google ─ */}
        <div style={S.card_}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, fontWeight: 600, fontSize: 14, color: S.text }}>
            Avis Google <span style={{ fontWeight: 400, fontSize: 12, color: S.muted, marginLeft: 8 }}>— affichés sur la homepage (fond noir)</span>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {cfg.google_reviews.map((r, i) => (
              <div key={i} style={{ border: `1px solid ${S.border}`, borderRadius: 8, overflow: 'hidden' }}>
                {/* Header avis */}
                <div style={{ padding: '10px 16px', background: S.bg, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: r.color || '#1a3a5a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {r.initials || '??'}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>Avis {i + 1}</span>
                  <span style={{ fontSize: 12, color: S.muted }}>{r.name || 'Nom non renseigné'}</span>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Texte de l'avis */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Texte de l&apos;avis</label>
                    <textarea
                      rows={3}
                      value={r.text}
                      onChange={e => setReview(i, 'text', e.target.value)}
                      placeholder={`Copiez-collez l'avis Google ici…`}
                      style={{ ...S.input, resize: 'vertical', lineHeight: 1.6 }}
                    />
                  </div>
                  {/* Nom, initiales, date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr 100px', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: S.text, marginBottom: 4 }}>Nom complet</label>
                      <input value={r.name} onChange={e => setReview(i, 'name', e.target.value)} placeholder="Thomas G." style={S.input} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: S.text, marginBottom: 4 }}>Initiales</label>
                      <input value={r.initials} onChange={e => setReview(i, 'initials', e.target.value.toUpperCase().slice(0, 2))} placeholder="TG" maxLength={2} style={S.input} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: S.text, marginBottom: 4 }}>Date</label>
                      <input value={r.date} onChange={e => setReview(i, 'date', e.target.value)} placeholder="Il y a 2 semaines" style={S.input} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: S.text, marginBottom: 4 }}>Couleur avatar</label>
                      <input type="color" value={r.color || '#1a3a5a'} onChange={e => setReview(i, 'color', e.target.value)} style={{ ...S.input, padding: '4px 6px', height: 36, cursor: 'pointer' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─ Photos du salon ─ */}
        <div style={S.card_}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, fontWeight: 600, fontSize: 14, color: S.text }}>
            Photos du salon
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
              <strong>Pour modifier une photo :</strong> déposez votre fichier dans{' '}
              <code style={{ background: '#dbeafe', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>/public/images/salon/</code>{' '}
              avec le nom exact ci-dessous, puis faites un git push.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {PHOTOS.map(p => (
                <div key={p.slot} style={{ border: `1px solid ${S.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '1 / 1', background: S.bg, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#d1d5db' }}>
                      <div style={{ fontSize: 32 }}>◨</div>
                      <div style={{ fontSize: 11 }}>Aucune photo</div>
                    </div>
                    <img
                      src={`/images/salon/${p.file}`}
                      alt={p.label}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                  <div style={{ padding: '10px 14px', borderTop: `1px solid ${S.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: S.text, marginBottom: 3 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: S.muted, fontFamily: 'monospace', background: S.bg, padding: '3px 8px', borderRadius: 4, display: 'inline-block' }}>{p.file}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Tab Commandes ─────────────────────────────────────────────
function TabCommandes() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/orders')
    if (res.ok) setOrders(await res.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    await load()
    setUpdating(null)
    if (selected && String(selected.id) === id) setSelected(s => s ? { ...s, status } : s)
  }

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 16px' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: S.text, margin: 0 }}>Commandes</h1>
          <p style={{ fontSize: 13, color: S.muted, margin: '2px 0 0' }}>{orders.length} commande{orders.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: S.muted, fontSize: 14 }}>Chargement…</div>
        ) : !orders.length ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12, color: '#d1d5db' }}>■</div>
            <div style={{ fontSize: 14, color: S.muted }}>Aucune commande pour le moment.</div>
          </div>
        ) : (
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ ...S.card_, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                    {['Commande', 'Date', 'Client', 'Total', 'Statut'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: S.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const badge = statusBadge(String(o.status ?? ''))
                    const isActive = selected && String(selected.id) === String(o.id)
                    return (
                      <tr key={String(o.id)} onClick={() => setSelected(o)} style={{ borderBottom: `1px solid ${S.border}`, cursor: 'pointer', background: isActive ? '#fdf8f0' : 'transparent' }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = S.bg }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 500, color: S.text }}>#{String(o.id ?? '').slice(0, 8)}</td>
                        <td style={{ padding: '14px 16px', color: S.muted, fontSize: 13 }}>{o.created_at ? new Date(String(o.created_at)).toLocaleDateString('fr-FR') : '—'}</td>
                        <td style={{ padding: '14px 16px', color: S.text }}>{String(o.email ?? '—')}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: S.text }}>{o.total ? eur(Number(o.total)) : '—'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: badge.bg, color: badge.color }}>
                            {statusLabel(String(o.status ?? ''))}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Détail commande */}
      {selected && (
        <div style={{ width: 360, background: S.card, borderLeft: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: S.text }}>Commande #{String(selected.id ?? '').slice(0, 8)}</div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: S.muted }}>×</button>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: S.muted, marginBottom: 4 }}>Client</div>
            <div style={{ fontWeight: 500, color: S.text, marginBottom: 16 }}>{String(selected.email ?? '—')}</div>

            <div style={{ fontSize: 12, color: S.muted, marginBottom: 4 }}>Total</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: S.text, marginBottom: 16 }}>{selected.total ? eur(Number(selected.total)) : '—'}</div>

            <div style={{ fontSize: 12, color: S.muted, marginBottom: 4 }}>Statut actuel</div>
            <select
              value={String(selected.status ?? 'pending')}
              disabled={updating === String(selected.id)}
              onChange={e => updateStatus(String(selected.id), e.target.value)}
              style={{ ...S.input, marginBottom: 16 }}
            >
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>

            {!!selected.shipping_address && (
              <>
                <div style={{ fontSize: 12, color: S.muted, marginBottom: 4 }}>Adresse de livraison</div>
                <div style={{ fontSize: 13, color: S.text, lineHeight: 1.6, background: S.bg, padding: '10px 14px', borderRadius: 6 }}>
                  {JSON.stringify(selected.shipping_address, null, 2).replace(/[{}"]/g, '').split('\n').filter(l => l.trim()).map((l, i) => <div key={i}>{l.replace(/,\s*$/, '').replace(/^\s+/, '')}</div>)}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Legal ─────────────────────────────────────────────────
function TabLegal() {
  const [pages, setPages] = useState<Record<string, { title: string; content: string }>>({})
  const [active, setActive] = useState('cgv')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/legal').then(r => r.json()).then((rows: Array<{ slug: string; title: string; content: string }>) => {
      if (!Array.isArray(rows)) return
      const map: Record<string, { title: string; content: string }> = {}
      rows.forEach(r => { map[r.slug] = { title: r.title, content: r.content } })
      setPages(map)
    }).catch(() => {})
  }, [])

  useEffect(() => { setContent(pages[active]?.content ?? ''); setSaved(false) }, [active, pages])

  async function save() {
    setSaving(true)
    const info = LEGAL_SLUGS.find(l => l.slug === active)!
    const res = await fetch('/api/admin/legal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: active, title: info.title, content }) })
    setSaving(false)
    if (res.ok) { setPages(p => ({ ...p, [active]: { title: info.title, content } })); setSaved(true) }
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 860 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: S.text, margin: '0 0 4px' }}>Textes légaux</h1>
      <p style={{ fontSize: 13, color: S.muted, margin: '0 0 20px' }}>Gérez le contenu des pages légales. Les modifications sont sauvegardées dans Supabase.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {LEGAL_SLUGS.map(l => (
          <button key={l.slug} onClick={() => setActive(l.slug)}
            style={{ padding: '7px 16px', fontSize: 13, fontWeight: active === l.slug ? 600 : 400, borderRadius: 6, cursor: 'pointer', background: active === l.slug ? S.gold : '#fff', color: active === l.slug ? '#fff' : S.text, border: `1px solid ${active === l.slug ? S.gold : S.border}` }}>
            {l.title}
          </button>
        ))}
      </div>

      {saved && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#15803d', fontWeight: 500 }}>Sauvegardé dans Supabase</div>}

      <div style={S.card_}>
        <textarea value={content} onChange={e => { setContent(e.target.value); setSaved(false) }} rows={22} placeholder="Contenu de la page légale…"
          style={{ ...S.input, border: 'none', resize: 'vertical', borderRadius: 8, padding: '16px', lineHeight: 1.7 }} />
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} style={S.btnPrimary}>
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

// ─── Tab Avis ──────────────────────────────────────────────────
function TabAvis() {
  const [reviews, setReviews] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ author: '', avatar: '👤', rating: '5', text: '', product_name: '', verified: true, visible: true })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/reviews')
    if (res.ok) setReviews(await res.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function addReview(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch('/api/admin/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { setSaved(true); setShowForm(false); setForm({ author: '', avatar: '👤', rating: '5', text: '', product_name: '', verified: true, visible: true }); await load() }
  }

  async function toggleVisible(r: Record<string, unknown>) {
    await fetch('/api/admin/reviews', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, visible: !r.visible }) })
    await load()
  }

  async function del(id: unknown) {
    if (!confirm('Supprimer cet avis ?')) return
    await fetch('/api/admin/reviews', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await load(); setSaved(false)
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 860 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: S.text, margin: '0 0 4px' }}>Avis clients</h1>
          <p style={{ fontSize: 13, color: S.muted, margin: 0 }}>{reviews.length} avis dans Supabase</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={S.btnPrimary}>+ Ajouter un avis</button>
      </div>

      {saved && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d', fontWeight: 500 }}>Avis sauvegardé</div>}

      {showForm && (
        <div style={{ ...S.card_, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: S.text, marginBottom: 16 }}>Nouvel avis</div>
          <form onSubmit={addReview}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[{ k: 'author', label: 'Nom' }, { k: 'avatar', label: 'Avatar (emoji)' }, { k: 'rating', label: 'Note (1-5)' }, { k: 'product_name', label: 'Produit' }].map(({ k, label }) => (
                <div key={k}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>{label}</label>
                  <input value={String(form[k as keyof typeof form])} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required={k === 'author'} style={S.input} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 5 }}>Texte de l&apos;avis</label>
              <textarea rows={3} value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} required style={{ ...S.input, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {[['verified', 'Achat vérifié'], ['visible', 'Visible sur le site']].map(([k, label]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: S.text, cursor: 'pointer' }}>
                  <input type="checkbox" checked={Boolean(form[k as keyof typeof form])} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={S.btnPrimary}>{saving ? 'Ajout…' : 'Ajouter'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={S.btnSecondary}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: S.muted }}>Chargement…</div>
      ) : !reviews.length ? (
        <div style={{ ...S.card_, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: S.muted }}>Aucun avis dans Supabase.</div>
        </div>
      ) : (
        <div style={S.card_}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {['Auteur', 'Note', 'Extrait', 'Produit', 'Statut', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: S.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={String(r.id)} style={{ borderBottom: `1px solid ${S.border}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{String(r.avatar ?? '👤')}</span>
                      <div>
                        <div style={{ fontWeight: 500, color: S.text, fontSize: 13 }}>{String(r.author ?? '')}</div>
                        {!!r.verified && <div style={{ fontSize: 11, color: '#15803d' }}>Vérifié</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#b8903a', fontWeight: 700 }}>{'★'.repeat(Number(r.rating ?? 5))}</td>
                  <td style={{ padding: '12px 16px', color: S.muted, fontSize: 13, maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(r.text ?? '')}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: S.muted }}>{String(r.product_name ?? '—')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: r.visible ? '#f0fdf4' : '#f4f4f5', color: r.visible ? '#15803d' : '#71717a' }}>
                      {r.visible ? 'Visible' : 'Masqué'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleVisible(r)} style={{ ...S.btnSecondary, padding: '5px 10px', fontSize: 12 }}>{r.visible ? 'Masquer' : 'Afficher'}</button>
                      <button onClick={() => del(r.id)} style={{ ...S.btnSecondary, padding: '5px 10px', fontSize: 12, color: '#b91c1c', borderColor: '#fca5a5' }}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────
export default function AdminPage() {
  const [auth, setAuth] = useState<boolean | null>(null)
  const [nav, setNav] = useState<NavSection>('produits')

  useEffect(() => {
    fetch('/api/admin/auth').then(r => r.json()).then(d => setAuth(d.authenticated)).catch(() => setAuth(false))
  }, [])

  async function logout() { await fetch('/api/admin/auth', { method: 'DELETE' }); setAuth(false) }

  if (auth === null) return <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.muted }}>Chargement…</div>
  if (!auth) return <LoginForm onLogin={() => setAuth(true)} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14, color: S.text }}>
      <Sidebar active={nav} setActive={setNav} logout={logout} />

      {/* Main */}
      <div style={{ marginLeft: 232, flex: 1, background: S.bg, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar */}
        <div style={{ height: 52, background: '#fff', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: S.muted }}>SP Barber</span>
          <span style={{ color: S.border }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: S.text, textTransform: 'capitalize' }}>{nav}</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {nav === 'produits' && <TabProduits />}
          {nav === 'commandes' && <TabCommandes />}
          {nav === 'legal' && <TabLegal />}
          {nav === 'avis' && <TabAvis />}
          {nav === 'salons' && <TabSalons />}
        </div>
      </div>
    </div>
  )
}
