import type { Metadata } from 'next'
import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Boutique — Produits Capillaires Premium',
  description: 'Découvrez toute la gamme SP Barber : cire, shampooing, crème, accessoires et tondeuse professionnelle.',
}

export default function ProductsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-20">
      <h1 className="text-5xl text-center mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>La Boutique</h1>
      <p className="text-center text-sm tracking-widest uppercase mb-12" style={{ color: 'var(--gold)' }}>Collection complète</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {PRODUCTS.map((product) => (
          <Link key={product.id} href={`/products/${product.slug}`} className="group block border rounded-sm overflow-hidden transition-all hover:border-yellow-500" style={{ background: 'var(--black-card)', borderColor: 'var(--black-border)' }}>
            <div className="aspect-square flex items-center justify-center relative" style={{ background: 'var(--black-soft)' }}>
              <span className="text-8xl opacity-10" style={{ color: 'var(--gold)' }}>SP</span>
              {product.is_dropshipping && (
                <span className="absolute top-3 right-3 text-xs px-2 py-1 tracking-widest uppercase" style={{ background: 'var(--gold)', color: 'var(--black)' }}>
                  Dropshipping
                </span>
              )}
            </div>
            <div className="p-5">
              <h2 className="text-xl mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{product.name}</h2>
              <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--white-muted)' }}>{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold" style={{ color: 'var(--gold)' }}>
                  {product.variants ? `À partir de ${formatPrice(Math.min(...product.variants.map(v => v.price)))}` : formatPrice(product.price)}
                </span>
                <span className="text-xs tracking-widest uppercase px-3 py-1 border" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                  Voir
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
