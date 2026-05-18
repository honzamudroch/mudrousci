'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'

interface PhotoGroup {
  date: string
  title: string
  photos: string[]
}

const formatDateLabel = (d: string) =>
  new Date(d).toLocaleDateString('cs-CZ', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })

export default function FotoPage() {
  const [groups, setGroups] = useState<PhotoGroup[]>([])
  const [loading, setLoading] = useState(true)
  // lightbox: [groupIdx, photoIdx]
  const [lightbox, setLightbox] = useState<[number, number] | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: events } = await supabase
        .from('events')
        .select('id, title, date')
        .order('date', { ascending: false })

      if (!events) { setLoading(false); return }

      const { data: photos } = await supabase
        .from('event_photos')
        .select('url, event_id')

      const grouped: PhotoGroup[] = events
        .map(event => ({
          date: event.date,
          title: event.title,
          photos: (photos ?? [])
            .filter(p => p.event_id === event.id)
            .map(p => p.url),
        }))
        .filter(g => g.photos.length > 0)

      setGroups(grouped)
      setLoading(false)
    }
    load()
  }, [])

  const moveLightbox = (dir: 1 | -1) => {
    if (!lightbox) return
    const [gi, pi] = lightbox
    const newPi = pi + dir
    if (newPi >= 0 && newPi < groups[gi].photos.length) {
      setLightbox([gi, newPi])
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#ffffff' }}>
      <Header />

      <main className="flex-1 w-full px-2 md:px-6 py-4">

        {loading && (
          <p className="mt-12 text-center font-notes" style={{ color: 'hsl(25 15% 40%)' }}>
            Načítám fotky…
          </p>
        )}

        {!loading && groups.length === 0 && (
          <div className="mt-24 text-center">
            <p className="font-hand text-3xl" style={{ color: 'hsl(25 30% 15%)' }}>Zatím žádné fotky</p>
            <p className="font-notes mt-2 text-sm" style={{ color: 'hsl(25 15% 40%)' }}>
              Přidej fotky k vzpomínkám na mapě nebo v časové ose
            </p>
          </div>
        )}

        <div className="space-y-6">
          {groups.map((group, gi) => (
            <section key={gi}>

              {/* Datum + název */}
              <div className="flex items-baseline gap-3 mb-2 pb-2"
                style={{ borderBottom: '1px solid hsl(25 30% 15% / 0.12)' }}>
                <span className="font-hand" style={{ fontSize: '1.25rem', color: 'hsl(25 30% 15%)' }}>
                  {formatDateLabel(group.date)}
                </span>
                <span className="font-notes text-sm" style={{ color: 'hsl(25 15% 50%)' }}>
                  {group.title}
                </span>
              </div>

              {/* Grid — počet sloupců přesně odpovídá počtu fotek (max 5)
                  → vždy zaplní celou šířku, žádné prázdné buňky */}
              <div
                className="grid"
                style={{
                  gap: '2px',
                  gridTemplateColumns: `repeat(${Math.min(group.photos.length, 5)}, 1fr)`,
                }}
              >
                {group.photos.map((url, pi) => (
                  <div
                    key={pi}
                    className="cursor-pointer overflow-hidden"
                    style={{ height: '220px' }}
                    onClick={() => setLightbox([gi, pi])}
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ display: 'block', transition: 'opacity 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    />
                  </div>
                ))}
              </div>

            </section>
          ))}
        </div>
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.93)' }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-5 text-white font-notes text-2xl z-10 w-10 h-10 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}
            onClick={e => { e.stopPropagation(); setLightbox(null) }}
          >✕</button>

          {lightbox[1] > 0 && (
            <button
              className="absolute left-3 md:left-6 text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full z-10"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              onClick={e => { e.stopPropagation(); moveLightbox(-1) }}
            >‹</button>
          )}

          <img
            src={groups[lightbox[0]]?.photos[lightbox[1]]}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={e => e.stopPropagation()}
          />

          {lightbox[1] < groups[lightbox[0]]?.photos.length - 1 && (
            <button
              className="absolute right-3 md:right-6 text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full z-10"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              onClick={e => { e.stopPropagation(); moveLightbox(1) }}
            >›</button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-notes text-xs"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            {lightbox[1] + 1} / {groups[lightbox[0]]?.photos.length}
          </div>
        </div>
      )}
    </div>
  )
}
