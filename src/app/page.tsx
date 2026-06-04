import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import { formatPrice } from '@/lib/utils'

export default function HomePage() {
  const featured = PRODUCTS.slice(0, 3)

  return (
    <>
      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16" style={{ background: 'linear-gradient(135deg, var(--black) 0%, var(--black-soft) 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--gold) 0, var(--gold) 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="text-center px-4 relative z-10">
          <p className="text-sm tracking-[0.4em] uppercase mb-4" style={{ color: 'var(--gold)', fontFamily: 'Rajdhani, sans-serif' }}>Collection Premium</p>
          <h1 className="text-6xl md:text-8xl font-light mb-6" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--white)' }}>
            SP<br /><span style={{ color: 'var(--gold)' }}>Barber</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-lg mx-auto" style={{ color: 'var(--white-muted)', fontFamily: 'Rajdhani, sans-serif' }}>
            L&apos;excellence capillaire pour l&apos;homme moderne. Des produits pensés par des professionnels.
          </p>
          <Link href="/products" className="inline-block px-10 py-4 text-sm tracking-widest uppercase font-semibold transition-all hover:scale-105" style={{ background: 'var(--gold)', color: 'var(--black)', fontFamily: 'Rajdhani, sans-serif' }}>
            Découvrir la collection
          </Link>
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl text-center mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Produits phares</h2>
        <p className="text-center text-sm tracking-widest uppercase mb-12" style={{ color: 'var(--gold)' }}>Sélection premium</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((product) => (
            <Link key={product.id} href={`/products/${product.slug}`} className="group block rounded-sm overflow-hidden border transition-all hover:border-yellow-500" style={{ background: 'var(--black-card)', borderColor: 'var(--black-border)' }}>
              <div className="aspect-square flex items-center justify-center" style={{ background: 'var(--black-soft)' }}>
                <span className="text-6xl opacity-20" style={{ color: 'var(--gold)' }}>SP</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{product.name}</h3>
                <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--white-muted)' }}>{product.description}</p>
                <p className="font-semibold" style={{ color: 'var(--gold)' }}>{formatPrice(product.price)}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/products" className="inline-block px-8 py-3 text-sm tracking-widest uppercase border transition-colors hover:bg-yellow-500 hover:text-black" style={{ borderColor: 'var(--gold)', color: 'var(--gold)', fontFamily: 'Rajdhani, sans-serif' }}>
            Voir tous les produits
          </Link>
        </div>
      </section>
    </>
  )
}
