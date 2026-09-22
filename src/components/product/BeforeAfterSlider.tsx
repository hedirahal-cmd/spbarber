'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

export interface BeforeAfterImage {
  url: string
  alt: string
}

interface Props {
  bare?: boolean
  className?: string
  before?: BeforeAfterImage | null
  after?: BeforeAfterImage | null
}

export function BeforeAfterSlider({ bare = false, className = '', before = null, after = null }: Props) {
  const [pct, setPct] = useState(50)
  const [dragging, setDragging] = useState(false)
  const [wrapWidth, setWrapWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasPhotos = !!before && !!after

  // La photo "avant" doit garder la largeur du conteneur ENTIER, jamais celle
  // de son calque decoupe (qui retrecit avec le curseur) -- sinon elle se
  // deformerait au lieu d'etre simplement revelee derriere le cache. Mesuree
  // de la meme facon que updatePct calcule le pourcentage.
  useEffect(() => {
    if (!hasPhotos) return
    const el = containerRef.current
    if (!el) return
    const mesurer = () => setWrapWidth(el.getBoundingClientRect().width)
    mesurer()
    const observer = new ResizeObserver(mesurer)
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasPhotos])

  const updatePct = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setPct(Math.round((x / rect.width) * 100))
  }, [])

  const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); setDragging(true); updatePct(e.clientX) }
  const onMouseMove = (e: React.MouseEvent) => { if (!dragging) return; updatePct(e.clientX) }
  const onMouseUp = () => setDragging(false)
  const onTouchStart = (e: React.TouchEvent) => { setDragging(true); updatePct(e.touches[0].clientX) }
  const onTouchMove = (e: React.TouchEvent) => { if (!dragging) return; e.preventDefault(); updatePct(e.touches[0].clientX) }
  const onTouchEnd = () => setDragging(false)

  const sliderEl = (
    <div
      ref={containerRef}
      className={`aas-wrap${className ? ' ' + className : ''}`}
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
      <div className="aas-after">
        {hasPhotos ? (
          <img src={after.url} alt={after.alt} className="aas-photo" />
        ) : (
          <div className="aas-hair-wrap">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="aas-strand aas-strand-dark" style={{ height: `${72 + (i % 3) * 12}%`, animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
        )}
        <div className="aas-label-after">APRÈS</div>
        <div className="aas-badge">Couleur restaurée</div>
        <div className="aas-glow" />
      </div>

      <div className="aas-before" style={{ width: `${pct}%` }}>
        {hasPhotos ? (
          <img src={before.url} alt={before.alt} className="aas-photo" style={{ width: wrapWidth || '100%' }} />
        ) : (
          <div className="aas-hair-wrap">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className={`aas-strand ${i % 3 === 0 ? 'aas-strand-white' : i % 3 === 1 ? 'aas-strand-grey' : 'aas-strand-mixed'}`}
                style={{ height: `${72 + (i % 3) * 12}%`, animationDelay: `${i * 0.07}s` }}
              />
            ))}
          </div>
        )}
        <div className="aas-label-before">AVANT</div>
        <div className="aas-badge aas-badge-before">Cheveux grisonnants</div>
      </div>

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

      <p className="aas-hint">&#8592; Glisser pour comparer &#8594;</p>
    </div>
  )

  if (bare) return sliderEl

  return (
    <div className="aa-sec">
      <div className="aa-inner">
        <div className="aa-head">
          <div className="aa-eyebrow">Résultat constaté</div>
          <h2 className="aa-title">RÉSULTAT VISIBLE DÈS LE 1<sup>ER</sup> LAVAGE</h2>
          <p className="aa-sub">Sans ammoniaque · Formule douce · Tient jusqu&apos;à 4 semaines</p>
        </div>

        {sliderEl}

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
