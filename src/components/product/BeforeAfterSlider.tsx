'use client'
import { useRef, useState, useCallback } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function BeforeAfterSlider() {
  const [pct, setPct] = useState(50)
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const updatePct = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setPct(Math.round((x / rect.width) * 100))
  }, [])

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    updatePct(e.clientX)
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    updatePct(e.clientX)
  }
  const onMouseUp = () => setDragging(false)

  const onTouchStart = (e: React.TouchEvent) => {
    setDragging(true)
    updatePct(e.touches[0].clientX)
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    e.preventDefault()
    updatePct(e.touches[0].clientX)
  }
  const onTouchEnd = () => setDragging(false)

  return (
    <div className="aa-sec">
      <div className="aa-inner">

        <div className="aa-head">
          <div className="aa-eyebrow">Résultat constaté</div>
          <h2 className="aa-title">RÉSULTAT VISIBLE DÈS LE 1<sup>ER</sup> LAVAGE</h2>
          <p className="aa-sub">Sans ammoniaque · Formule douce · Tient jusqu&apos;à 4 semaines</p>
        </div>

        {/* Slider interactif */}
        <div
          ref={containerRef}
          className="aas-wrap"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ cursor: dragging ? 'grabbing' : 'ew-resize', userSelect: 'none' }}
          role="slider"
          aria-label="Glisser pour comparer avant/après"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Côté APRÈS (fond complet) */}
          <div className="aas-after">
            <div className="aas-hair-wrap">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="aas-strand aas-strand-dark" style={{ height: `${72 + (i % 3) * 12}%`, animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
            <div className="aas-label-after">APRÈS</div>
            <div className="aas-badge">Couleur restaurée</div>
            <div className="aas-glow" />
          </div>

          {/* Côté AVANT (clip à gauche selon pct) */}
          <div className="aas-before" style={{ width: `${pct}%` }}>
            <div className="aas-hair-wrap">
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  className={`aas-strand ${i % 3 === 0 ? 'aas-strand-white' : i % 3 === 1 ? 'aas-strand-grey' : 'aas-strand-mixed'}`}
                  style={{ height: `${72 + (i % 3) * 12}%`, animationDelay: `${i * 0.07}s` }}
                />
              ))}
            </div>
            <div className="aas-label-before">AVANT</div>
            <div className="aas-badge aas-badge-before">Cheveux grisonnants</div>
          </div>

          {/* Ligne de division */}
          <div className="aas-divider" style={{ left: `${pct}%` }}>
            <div className="aas-handle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: 'scaleX(-1)' }}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </div>
          </div>

          <p className="aas-hint">← Glisser pour comparer →</p>
        </div>

        {/* Checks */}
        <div className="aa-checks">
          <div className="aa-check"><CheckCircle2 size={14} strokeWidth={2} />Colorant naturel à la kératine</div>
          <div className="aa-check"><CheckCircle2 size={14} strokeWidth={2} />Résultat durable 3–4 semaines</div>
          <div className="aa-check"><CheckCircle2 size={14} strokeWidth={2} />Sans ammoniaque ni oxydant</div>
          <div className="aa-check"><CheckCircle2 size={14} strokeWidth={2} />Utilisable seul, sans préparation</div>
        </div>

      </div>
    </div>
  )
}
