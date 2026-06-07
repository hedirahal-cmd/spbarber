'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react'

export function SalonCarousel({ photos, label }: { photos: string[]; label: string }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const count = photos.length

  const next = useCallback(() => setCurrent(c => (c + 1) % count), [count])
  const prev = useCallback(() => setCurrent(c => (c - 1 + count) % count), [count])

  useEffect(() => {
    if (count <= 1 || paused) return
    const t = setInterval(next, 4000)
    return () => clearInterval(t)
  }, [count, paused, next])

  if (!count) {
    return (
      <div className="sc-placeholder">
        <Camera size={32} strokeWidth={1.2} />
        <span>Photos à venir</span>
      </div>
    )
  }

  return (
    <div
      className="sc-wrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (dx < -40) next()
        else if (dx > 40) prev()
        touchStartX.current = null
      }}
    >
      <div className="sc-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {photos.map((src, i) => (
          <div key={i} className="sc-slide">
            <img src={src} alt={`${label} — photo ${i + 1}`} className="sc-img" />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button className="sc-arrow sc-arrow-l" onClick={prev} aria-label="Photo précédente">
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <button className="sc-arrow sc-arrow-r" onClick={next} aria-label="Photo suivante">
            <ChevronRight size={20} strokeWidth={2} />
          </button>
          <div className="sc-dots">
            {photos.map((_, i) => (
              <button
                key={i}
                className={`sc-dot${i === current ? ' sc-dot-active' : ''}`}
                onClick={() => setCurrent(i)}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
