import type { Metadata } from 'next'
import { PRODUCTS } from '@/lib/products'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin — SP Barber' }

export default function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 pt-24 pb-20">
      <h1 className="text-4xl mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Administration</h1>
      <p className="text-sm tracking-widest uppercase mb-10" style={{ color: 'var(--gold)' }}>Gestion des produits & commandes</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Produits', value: PRODUCTS.length },
          { label: 'En stock', value: PRODUCTS.filter(p => p.stock > 0).length },
          { label: 'Dropshipping', value: PRODUCTS.filter(p => p.is_dropshipping).length },
          { label: 'CA (simulé)', value: '—' },
        ].map(({ label, value }) => (
          <div key={label} className="p-5 border" style={{ background: 'var(--black-card)', borderColor: 'var(--black-border)' }}>
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--white-muted)' }}>{label}</p>
            <p className="text-3xl" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--gold)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Products table */}
      <h2 className="text-2xl mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Produits</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--black-border)' }}>
              {['Produit', 'Catégorie', 'Prix', 'Stock', 'Type'].map((h) => (
                <th key={h} className="text-left py-3 px-4 text-xs tracking-widest uppercase" style={{ color: 'var(--white-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((p) => (
              <tr key={p.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: 'var(--black-border)' }}>
                <td className="py-4 px-4 font-medium">{p.name}</td>
                <td className="py-4 px-4 capitalize" style={{ color: 'var(--white-muted)' }}>{p.category}</td>
                <td className="py-4 px-4" style={{ color: 'var(--gold)' }}>{p.variants ? `${formatPrice(Math.min(...p.variants.map(v => v.price)))}+` : formatPrice(p.price)}</td>
                <td className="py-4 px-4">{p.is_dropshipping ? '∞' : p.stock}</td>
                <td className="py-4 px-4">
                  <span className="px-2 py-1 text-xs" style={{ background: p.is_dropshipping ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)', color: p.is_dropshipping ? 'var(--gold)' : 'var(--white-muted)' }}>
                    {p.is_dropshipping ? 'DSers' : 'Stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
