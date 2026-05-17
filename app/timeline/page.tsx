'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import EventDetail from '@/components/EventDetail'
import AddEventModal from '@/components/AddEventModal'
import Header from '@/components/Header'
import { getType } from '@/lib/eventTypes'

interface Event {
  id: string
  title: string
  description: string
  date: string
  lat: number
  lng: number
  photo_url: string | null
  type?: string
  location_name?: string
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })

// Polaroid foto komponenta — přesně jako v Lovable
const PolaroidPhoto = ({ src, rotate = 0 }: { src?: string | null; rotate?: number }) => (
  <div
    className="polaroid inline-block w-44 shrink-0 self-center md:self-auto"
    style={{ transform: `rotate(${rotate}deg)` }}
  >
    <div className="aspect-square w-full overflow-hidden flex items-center justify-center"
      style={{ background: '#f0f0f0' }}>
      {src
        ? <img src={src} alt="" className="h-full w-full object-cover" />
        : <span className="font-notes text-sm" style={{ color: 'hsl(25 15% 40%)' }}>foto sem</span>
      }
    </div>
  </div>
)

export default function TimelinePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const supabase = createClient()

  const loadEvents = async () => {
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false })

    if (!eventsData) { setLoading(false); return }

    // Pro každou vzpomínku načti první fotku z event_photos
    const { data: photosData } = await supabase
      .from('event_photos')
      .select('event_id, url')

    const firstPhoto: Record<string, string> = {}
    photosData?.forEach(p => {
      if (!firstPhoto[p.event_id]) firstPhoto[p.event_id] = p.url
    })

    // Slouč — preferuj event_photos, fallback na photo_url z events
    const merged = eventsData.map(e => ({
      ...e,
      photo_url: firstPhoto[e.id] ?? e.photo_url ?? null,
    }))

    setEvents(merged)
    setLoading(false)
  }

  useEffect(() => { loadEvents() }, [])

  // Seskup podle roku, nejnovější první
  const byYear: Record<number, Event[]> = {}
  events.forEach(e => {
    const y = new Date(e.date).getFullYear()
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(e)
  })
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  // Globální index pro střídání levo/pravo přes celý timeline
  let globalIdx = 0


  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 md:px-8 py-4 md:py-6">
        <div className="flex items-center justify-between">
          <h1 className="font-hand" style={{ fontSize: '3.5rem', color: 'hsl(25 30% 15%)' }}>
            Jak roky plynou..
          </h1>
          <div
            onClick={() => { setEditEvent(null); setShowEdit(true) }}
            className="shrink-0 hover:scale-105 transition-transform flex flex-col items-center gap-1 mr-32 cursor-pointer"
          >
            <svg width="52" height="52" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="heart-clip">
                  <path d="M50 85 C50 85 10 60 10 32 C10 20 20 12 30 12 C37 12 44 17 50 25 C56 17 63 12 70 12 C80 12 90 20 90 32 C90 60 50 85 50 85Z"/>
                </clipPath>
              </defs>
              {/* Srdce outline */}
              <path d="M50 85 C50 85 10 60 10 32 C10 20 20 12 30 12 C37 12 44 17 50 25 C56 17 63 12 70 12 C80 12 90 20 90 32 C90 60 50 85 50 85Z" stroke="hsl(25 30% 15%)" strokeWidth="3" strokeLinejoin="round"/>
              {/* Plus — horní část srdce */}
              <line x1="50" y1="28" x2="50" y2="44" stroke="hsl(25 30% 15%)" strokeWidth="3" strokeLinecap="round"/>
              <line x1="42" y1="36" x2="58" y2="36" stroke="hsl(25 30% 15%)" strokeWidth="3" strokeLinecap="round"/>
              {/* Krajina uvnitř srdce */}
              <g clipPath="url(#heart-clip)">
                {/* Hory */}
                <polyline points="14,80 30,55 42,68 54,50 70,68 86,80" stroke="hsl(25 30% 15%)" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
                {/* Stromek vlevo */}
                <line x1="22" y1="80" x2="22" y2="70" stroke="hsl(25 30% 15%)" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="22,60 16,72 28,72" stroke="hsl(25 30% 15%)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
              </g>
            </svg>
            <span className="font-hand" style={{ fontSize: '1.2rem', color: 'hsl(25 30% 15%)', marginTop: '-8px' }}>nový zážitek</span>
          </div>
        </div>

        {loading && (
          <p className="mt-12 text-center font-notes" style={{ color: 'hsl(25 15% 40%)' }}>
            Načítám vzpomínky…
          </p>
        )}

        {!loading && events.length === 0 && (
          <div className="mt-24 text-center">
            <p className="font-hand text-3xl" style={{ color: 'hsl(25 30% 15%)' }}>
              Zatím žádné vzpomínky
            </p>
            <p className="font-notes mt-2 text-sm" style={{ color: 'hsl(25 15% 40%)' }}>
              Přidej první kliknutím na mapu
            </p>
          </div>
        )}

        <div className="mt-8 space-y-8 md:space-y-10">
          {years.map(year => (
            <section key={year}>

              {/* Rok — velký nadpis + čára */}
              <div className="flex items-center gap-6 mb-6">
                <h2 className="font-hand leading-none"
                  style={{ fontSize: '5rem', fontWeight: 800, color: 'hsl(25 30% 15%)' }}>
                  {year}
                </h2>
                <div className="flex-1 h-px" style={{ background: 'hsl(25 30% 15% / 0.3)' }} />
              </div>

              {/* Karty */}
              <div className="relative">
                {byYear[year].map((event, i) => {
                  const isLeft = globalIdx % 2 === 0
                  const rotate = isLeft ? -1.5 : 1.8
                  globalIdx++

                  const typeInfo = getType(event.type ?? 'rande')
                  return (
                    <div key={event.id} className="mb-6">

                      {/* Karta */}
                      <div className={`flex w-full ${isLeft ? 'md:justify-start' : 'md:justify-end'}`}>
                        <div
                          className="paper-card border cursor-pointer p-4 md:p-5 flex flex-col gap-4 max-w-xl w-full md:w-auto transition-transform hover:scale-[1.02] hover:-translate-y-1 relative"
                          style={{
                            borderColor: '#e0e0e0',
                            transform: `rotate(${rotate}deg)`,
                            flexDirection: undefined,
                          }}
                          onClick={() => setSelectedEvent(event)}
                        >
                          {/* Ikonka pro levé karty — vpravo nahoře */}
                          {isLeft && (
                            <img src={typeInfo.timelineImage} alt="" style={{
                              position: 'absolute', top: 10, right: 40,
                              width: 75 - (typeInfo.iconPadding ?? 0), height: 75 - (typeInfo.iconPadding ?? 0), objectFit: 'contain', mixBlendMode: 'multiply', filter: 'contrast(1.5)',
                            }} />
                          )}

                          <div className={`flex flex-col ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-4`}>
                            {/* Pro pravé karty — ikonka vedle fotky */}
                            {isLeft
                              ? <PolaroidPhoto src={event.photo_url} rotate={-rotate * 2} />
                              : <div className="flex items-start gap-2 shrink-0">
                                  <img src={typeInfo.timelineImage} alt="" style={{ width: 75 - (typeInfo.iconPadding ?? 0), height: 75 - (typeInfo.iconPadding ?? 0), objectFit: 'contain', mixBlendMode: 'multiply', filter: 'contrast(1.5)', marginTop: 8 }} />
                                  <PolaroidPhoto src={event.photo_url} rotate={-rotate * 2} />
                                </div>
                            }

                            <div className="flex-1 min-w-0">
                              <h3 className="font-hand leading-tight"
                                style={{ fontSize: '1.6rem', color: 'hsl(25 30% 15%)' }}>
                                {event.title}
                              </h3>
                              <div className="font-hand leading-tight mt-1"
                                style={{ fontSize: '1.6rem', fontWeight: 700, color: 'hsl(25 30% 15%)' }}>
                                {formatDate(event.date)}
                              </div>
                              {(event as any).location_name && (
                                <div className="font-notes text-sm mt-1" style={{ color: 'hsl(0 65% 50%)' }}>
                                  {(event as any).location_name}
                                </div>
                              )}
                              {event.description && (
                                <p className="font-notes mt-1.5 text-sm leading-relaxed line-clamp-2"
                                  style={{ color: 'hsl(25 20% 40%)' }}>
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>


                    </div>
                  )
                })}
              </div>

            </section>
          ))}
        </div>

        {!loading && events.length > 0 && (
          <div className="mt-16 text-center font-hand text-3xl" style={{ color: 'hsl(25 15% 40%)' }}>
            …a takhle to všechno začalo.
          </div>
        )}
      </main>

      <EventDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={(event) => { setEditEvent(event); setShowEdit(true); setSelectedEvent(null) }}
        onDeleted={loadEvents}
      />

      {showEdit && (
        <AddEventModal
          coords={null}
          editEvent={editEvent}
          onClose={() => { setShowEdit(false); setEditEvent(null) }}
          onSaved={loadEvents}
        />
      )}
    </div>
  )
}
