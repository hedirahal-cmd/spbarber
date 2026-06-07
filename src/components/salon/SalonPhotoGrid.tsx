'use client'
import { Camera } from 'lucide-react'

export function SalonPhotoGrid() {
  return (
    <div className="salon-photos-grid">
      {(['salon-1.jpg', 'salon-2.jpg', 'salon-3.jpg'] as const).map((file, i) => (
        <div key={file} className="salon-photo-card">
          <img
            src={`/images/salon/${file}`}
            alt={`SP Barber Fougères — photo ${i + 1}`}
            className="salon-photo-img"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0' }}
          />
          <div className="salon-photo-ph">
            <Camera size={24} strokeWidth={1.2} />
            <span>Photo {i + 1}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
