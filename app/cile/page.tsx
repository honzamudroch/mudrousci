'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

const TILES = [
  { person: 'honza', year: 2026, label: 'Honza', rotate: -2 },
  { person: 'lucka', year: 2026, label: 'Lucka', rotate: 1.5 },
]

export default function CilePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 md:px-8 py-10">
        <h1 className="font-hand text-center mb-2" style={{ fontSize: '3.5rem', color: 'hsl(25 30% 15%)' }}>
          Cíle
        </h1>
        <p className="font-notes text-center mb-12" style={{ color: 'hsl(25 15% 45%)', fontSize: '1rem' }}>
          Co si přejeme stihnout
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          {TILES.map(tile => (
            <div
              key={`${tile.person}-${tile.year}`}
              className="paper-card border cursor-pointer transition-transform hover:scale-[1.03] hover:-translate-y-1"
              style={{
                borderColor: '#e0e0e0',
                transform: `rotate(${tile.rotate}deg)`,
                borderRadius: '16px',
                overflow: 'hidden',
              }}
              onClick={() => router.push(`/cile/${tile.person}/${tile.year}`)}
            >
              <div style={{ height: 180, overflow: 'hidden', background: '#fff' }}>
                <img
                  src={tile.person === 'honza' ? '/honza-header.png' : '/lucka-header.png'}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%' }}
                />
              </div>

              {/* Polaroid popisek */}
              <div className="px-5 pt-4 pb-6">
                <h2 className="font-hand" style={{ fontSize: '2.4rem', color: 'hsl(25 30% 15%)' }}>
                  {tile.label}
                </h2>
                <p className="font-notes text-sm mt-1" style={{ color: 'hsl(25 15% 50%)' }}>
                  cíle pro rok {tile.year}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
