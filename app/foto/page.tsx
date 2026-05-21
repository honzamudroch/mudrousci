'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'
import { thumbUrl } from '@/lib/imageUtils'

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
  const [lightbox, setLightbox] = useState<{ url: string; idx: number; groupIdx: number } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [{ data: events }, { data: photos }] = await Promise.all([
        supabase.from('events').select('id, title, date').order('date', { ascending: false }),
        supabase.from('event_photos').select('url, event_id'),
      ])

      if (!events) { setLoading(false); return }

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

  const openLightbox = (groupIdx: number, idx: number) =>
    setLightbox({ url: groups[groupIdx].photos[idx], idx, groupIdx })

  const moveLightbox = (dir: 1 | -1) => {
    if (!lightbox) return
    const group = groups[lightbox.groupIdx]
    const newIdx = lightbox.idx + dir
    if (newIdx >= 0 && newIdx < group.photos.length) {
      setLightbox({ url: group.photos[newIdx], idx: newIdx, groupIdx: lightbox.groupIdx })
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#ffffff' }}>
      <Header />

      <main className="flex-1 w-full px-4 md:px-8 py-6 max-w-screen-2xl mx-auto">

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

        <div className="space-y-8">
          {groups.map((group, groupIdx) => (
            <section key={group.date + groupIdx}>

              {/* Datum + název eventu */}
              <div className="flex items-baseline gap-3 mb-2 py-1"
                style={{ borderBottom: '1px solid hsl(25 30% 15% / 0.12)' }}>
                <span className="font-hand" style={{ fontSize: '1.35rem', color: 'hsl(25 30% 15%)' }}>
                  {formatDateLabel(group.date)}
                </span>
                <span className="font-notes text-sm" style={{ color: 'hsl(25 15% 50%)' }}>
                  {group.title}
                </span>
              </div>

              {/* Fotky — Google Photos styl */}
              <div
                className="grid"
                style={{ gap: '2px', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
              >
                {group.photos.map((url, i) => (
                  <div
                    key={i}
                    className="cursor-pointer overflow-hidden flex items-center justify-center"
                    style={{ aspectRatio: '1 / 1', background: '#f0f0f0' }}
                    onClick={() => openLightbox(groupIdx, i)}
                    onMouseEnter={e => (e.currentTarget.querySelector('img')!.style.opacity = '0.88')}
                    onMouseLeave={e => (e.currentTarget.querySelector('img')!.style.opacity = '1')}
                  >
                    <img
                      src={thumbUrl(url, 400)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="transition-opacity"
                      style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
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
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(null)}
        >
          {/* Zavřít */}
          <button
            className="absolute top-4 right-5 text-white font-notes text-2xl z-10 w-10 h-10 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            onClick={e => { e.stopPropagation(); setLightbox(null) }}
          >✕</button>

          {/* Předchozí */}
          {lightbox.idx > 0 && (
            <button
              className="absolute left-3 md:left-6 text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full z-10"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              onClick={e => { e.stopPropagation(); moveLightbox(-1) }}
            >‹</button>
          )}

          {/* Foto */}
          <div onClick={e => e.stopPropagation()}>
            <img
              src={lightbox.url}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain"
              style={{ borderRadius: '2px' }}
            />
          </div>

          {/* Další */}
          {lightbox.idx < groups[lightbox.groupIdx].photos.length - 1 && (
            <button
              className="absolute right-3 md:right-6 text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full z-10"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              onClick={e => { e.stopPropagation(); moveLightbox(1) }}
            >›</button>
          )}

          {/* Počítadlo */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-notes text-xs text-white/60">
            {lightbox.idx + 1} / {groups[lightbox.groupIdx].photos.length}
          </div>
        </div>
      )}
    </div>
  )
}
