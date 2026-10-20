'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { getProductFAQ } from '@/lib/product-faq'
import type { Product } from '@/types'

/**
 * FAQ generique en accordeon sur la fiche produit (2026-10-02, decision Hedi) --
 * plusieurs questions peuvent rester ouvertes en meme temps, pas de mode
 * "une seule a la fois" impose.
 */
export function ProductFAQ({ product }: { product: Product }) {
  const items = getProductFAQ(product)
  const [ouvertes, setOuvertes] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setOuvertes((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <section className="sn-faq">
      <div className="sn-faq-inner">
        <div className="sn-faq-eyebrow">— Questions fréquentes —</div>
        <h2 className="sn-faq-title">BESOIN D&apos;UNE INFO ?</h2>
        <div className="sn-faq-list">
          {items.map((item, i) => {
            const ouvert = ouvertes.has(i)
            return (
              <div key={item.q} className={`sn-faq-item${ouvert ? ' sn-faq-item-open' : ''}`}>
                <button
                  type="button"
                  className="sn-faq-q"
                  onClick={() => toggle(i)}
                  aria-expanded={ouvert}
                  aria-controls={`sn-faq-a-${i}`}
                >
                  <span>{item.q}</span>
                  <ChevronDown size={16} strokeWidth={2} className="sn-faq-chevron" aria-hidden="true" />
                </button>
                {ouvert && (
                  <p id={`sn-faq-a-${i}`} className="sn-faq-a">{item.a}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
