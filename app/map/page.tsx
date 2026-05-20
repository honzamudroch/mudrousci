'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import Header from '@/components/Header'
import 'mapbox-gl/dist/mapbox-gl.css'

import { createClient } from '@/lib/supabase'
import AddEventModal from '@/components/AddEventModal'
import EventDetail from '@/components/EventDetail'
import { createMarkerHTML, getType, EVENT_TYPES } from '@/lib/eventTypes'

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

// Zaokrouhli souřadnice pro seskupení blízkých pinů
const roundCoord = (n: number) => Math.round(n * 1000) / 1000

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [clusterEvents, setClusterEvents] = useState<Event[] | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(EVENT_TYPES.map(t => t.id))
  )
  const [filtersOpen, setFiltersOpen] = useState(false)
  const supabase = createClient()

  const filteredEvents = events.filter(e => activeFilters.has(e.type ?? 'rande'))

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev // aspoň jeden musí zůstat
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const loadEvents = useCallback(async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: false })
    if (data) setEvents(data)
  }, [supabase])

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [15.4, 49.8],
      zoom: 6,
    })


    map.current.on('click', (e) => {
      setPendingCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      setShowModal(true)
    })

    loadEvents()
  }, [loadEvents])

  // Přidání markerů — seskupení na stejném místě
  useEffect(() => {
    if (!map.current) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Seskup eventy podle zaokrouhlených souřadnic
    const groups: Record<string, Event[]> = {}
    filteredEvents.forEach(event => {
      const key = `${roundCoord(event.lat)}_${roundCoord(event.lng)}`
      if (!groups[key]) groups[key] = []
      groups[key].push(event)
    })

    Object.values(groups).forEach(group => {
      const count = group.length
      const first = group[0]
      const el = document.createElement('div')
      el.className = 'custom-marker'

      const typeId = first.type ?? 'rande'
      el.innerHTML = createMarkerHTML(typeId, count)

      // Tooltip jako Mapbox popup
      const label = count === 1 ? first.title : `${count} vzpomínky`
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -62],
        anchor: 'bottom',
        className: 'marker-popup',
      }).setHTML(`<span style="font-size:12px;font-family:Inter,sans-serif;color:#1a2744;white-space:nowrap">${label}</span>`)

      el.addEventListener('mouseenter', () => {
        popup.setLngLat([first.lng, first.lat]).addTo(map.current!)
      })
      el.addEventListener('mouseleave', () => popup.remove())

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        popup.remove()
        if (count === 1) setSelectedEvent(first)
        else setClusterEvents(group)
      })

      // anchor: 'bottom' = špička pinu přesně na souřadnici
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([first.lng, first.lat])
        .addTo(map.current!)

      markersRef.current.push(marker)
    })
  }, [filteredEvents])

  const pluralVzpominka = (n: number) => {
    if (n === 1) return 'vzpomínka'
    if (n >= 2 && n <= 4) return 'vzpomínky'
    return 'vzpomínek'
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="flex flex-col w-full h-screen relative">

      <Header countLabel={`${events.length} ${pluralVzpominka(events.length)}`} />


      {/* Plovoucí tlačítko — pouze mobil */}
      <button
        onClick={() => { setPendingCoords(null); setShowModal(true) }}
        title="Přidat vzpomínku"
        className="md:hidden fixed bottom-8 right-6 z-20 w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110"
        style={{ background: 'hsl(40 35% 95%)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
        <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="heart-clip-map">
              <path d="M50 85 C50 85 10 60 10 32 C10 20 20 12 30 12 C37 12 44 17 50 25 C56 17 63 12 70 12 C80 12 90 20 90 32 C90 60 50 85 50 85Z"/>
            </clipPath>
          </defs>
          <path d="M50 85 C50 85 10 60 10 32 C10 20 20 12 30 12 C37 12 44 17 50 25 C56 17 63 12 70 12 C80 12 90 20 90 32 C90 60 50 85 50 85Z" stroke="hsl(25 30% 15%)" strokeWidth="3" strokeLinejoin="round"/>
          <line x1="50" y1="28" x2="50" y2="44" stroke="hsl(25 30% 15%)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="42" y1="36" x2="58" y2="36" stroke="hsl(25 30% 15%)" strokeWidth="3" strokeLinecap="round"/>
          <g clipPath="url(#heart-clip-map)">
            <polyline points="14,80 30,55 42,68 54,50 70,68 86,80" stroke="hsl(25 30% 15%)" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
            <line x1="22" y1="80" x2="22" y2="70" stroke="hsl(25 30% 15%)" strokeWidth="2" strokeLinecap="round"/>
            <polyline points="22,60 16,72 28,72" stroke="hsl(25 30% 15%)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
          </g>
        </svg>
      </button>

      {/* Filtrační lišta — pravý dolní roh */}
      <div className="absolute z-10 flex flex-col items-end gap-2"
        style={{ bottom: '100px', right: '12px' }}>

        {/* Ikonky filtrů — desktop vždy, mobil jen po rozkliku */}
        {EVENT_TYPES.map(t => {
          const active = activeFilters.has(t.id)
          return (
            <button
              key={t.id}
              onClick={() => toggleFilter(t.id)}
              title={t.label}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 md:flex ${filtersOpen ? 'flex' : 'hidden'}`}
              style={{
                background: active ? t.color : 'rgba(255,255,255,0.92)',
                border: `1.5px solid ${active ? t.color : 'rgba(0,0,0,0.12)'}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}
            >
              <img
                src={t.timelineImage}
                style={{
                  width: 20, height: 20, objectFit: 'contain',
                  filter: active ? 'brightness(10)' : 'contrast(1.4) brightness(0.3)',
                }}
                alt={t.label}
              />
            </button>
          )
        })}

        {/* Toggle tlačítko — pouze mobil */}
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{
            background: filtersOpen ? 'hsl(25 30% 15%)' : 'rgba(255,255,255,0.92)',
            border: '1.5px solid rgba(0,0,0,0.12)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            color: filtersOpen ? 'white' : 'hsl(25 30% 15%)',
            fontSize: '16px',
          }}
        >
          {filtersOpen ? '✕' : '⚙'}
        </button>

      </div>

      <div ref={mapContainer} className="flex-1 w-full" />

      {/* Modal přidání */}
      {showModal && (
        <AddEventModal
          coords={pendingCoords}
          editEvent={editEvent}
          onClose={() => { setShowModal(false); setPendingCoords(null); setEditEvent(null) }}
          onSaved={loadEvents}
        />
      )}

      {/* Detail jedné vzpomínky */}
      <EventDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={(event) => { setEditEvent(event); setShowModal(true) }}
        onDeleted={loadEvents}
      />

      {/* Výběr ze skupiny vzpomínek */}
      {clusterEvents && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setClusterEvents(null)}
              className="absolute top-4 right-4 text-[#8a8070] hover:text-[#1a2744] text-xl"
            >✕</button>
            <h2 className="text-lg mb-1" style={{fontFamily: 'Playfair Display, serif', color: '#1a2744'}}>
              {clusterEvents.length} vzpomínky na tomto místě
            </h2>
            <p className="text-xs text-[#8a8070] mb-4">Vyber kterou chceš zobrazit</p>
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {clusterEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => { setSelectedEvent(event); setClusterEvents(null) }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[#e8e4da] hover:bg-[#fafaf8] transition-colors text-left"
                >
                  {event.photo_url
                    ? <img src={event.photo_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                    : <div className="w-10 h-10 rounded-lg bg-[#f1f0eb] flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="14" viewBox="0 0 48 44" fill="none">
                          <path d="M24 40C24 40 4 27 4 14C4 8 8.5 4 13.5 4C18 4 21.5 7 24 11C26.5 7 30 4 34.5 4C39.5 4 44 8 44 14C44 27 24 40 24 40Z" fill="#c4bfaa"/>
                        </svg>
                      </div>
                  }
                  <div>
                    <p className="text-sm font-medium text-[#1a2744]">{event.title}</p>
                    <p className="text-xs text-[#8a8070]">{formatDate(event.date)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
