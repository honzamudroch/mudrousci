'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
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

interface Props {
  event: Event | null
  onClose: () => void
  onEdit: (event: Event) => void
  onDeleted?: () => void
}

export default function EventDetail({ event, onClose, onEdit, onDeleted }: Props) {
  const [photos, setPhotos] = useState<string[]>([])
  const [photoIdx, setPhotoIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPhotoIdx(i => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setPhotoIdx(i => (i - 1 + photos.length) % photos.length)
      if (e.key === 'Escape') setLightbox(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, photos.length])

  useEffect(() => {
    if (!event) return
    setPhotoIdx(0)
    setLightbox(false)
    setConfirmDelete(false)
    supabase.from('event_photos').select('url').eq('event_id', event.id).order('created_at').then(({ data }) => {
      if (data && data.length > 0) setPhotos(data.map(p => p.url))
      else if (event.photo_url) setPhotos([event.photo_url])
      else setPhotos([])
    })
  }, [event?.id])

  if (!event) return null

  const typeInfo = getType((event as any).type ?? 'rande')
  const formatDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
  const prev = () => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)
  const next = () => setPhotoIdx(i => (i + 1) % photos.length)

  const handleDeletePhoto = async () => {
    if (!event) return
    setDeletingPhoto(true)
    const urlToDelete = photos[photoIdx]
    // Smaž z event_photos
    await supabase.from('event_photos').delete().eq('url', urlToDelete)
    // Pokud to byl náhled (photo_url), resetuj na další dostupnou
    const remaining = photos.filter((_, i) => i !== photoIdx)
    if (event.photo_url === urlToDelete) {
      await supabase.from('events').update({ photo_url: remaining[0] ?? null }).eq('id', event.id)
    }
    setPhotos(remaining)
    setPhotoIdx(i => Math.min(i, Math.max(0, remaining.length - 1)))
    setDeletingPhoto(false)
    onDeleted?.()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('events').delete().eq('id', event.id)
    setDeleting(false)
    onClose()
    onDeleted?.()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
        style={{ border: '1px solid #e0e0e0', background: '#ffffff' }}>

        {/* Zavřít */}
        <button onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-notes text-lg"
          style={{ background: '#f0f0f0', color: 'hsl(25 15% 50%)' }}>
          ✕
        </button>

        {/* Fotogalerie */}
        {photos.length > 0 ? (
          <div className="relative">
            <img
              src={photos[photoIdx]} alt=""
              className="w-full object-contain cursor-zoom-in"
              style={{ maxHeight: '420px', background: '#111' }}
              onClick={() => setLightbox(true)}
            />

            {/* Smazat aktuální fotku */}
            <button
              onClick={handleDeletePhoto}
              disabled={deletingPhoto}
              className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full font-notes text-xs transition-colors disabled:opacity-50"
              style={{ background: 'rgba(0,0,0,0.45)', color: 'white' }}
            >
              {deletingPhoto ? '…' : '🗑 smazat'}
            </button>

            {photos.length > 1 && (
              <>
                <button onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center text-xl hover:bg-black/50 transition-colors">
                  ‹
                </button>
                <button onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center text-xl hover:bg-black/50 transition-colors">
                  ›
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className={`h-1.5 rounded-full transition-all ${i === photoIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
                  ))}
                </div>
                <div className="absolute top-3 left-3 font-notes text-xs bg-black/30 text-white px-2 py-0.5 rounded-full">
                  {photoIdx + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full h-28 flex items-center justify-center"
            style={{ background: '#f0f0f0' }}>
            <svg width="40" height="36" viewBox="0 0 48 44" fill="none">
              <path d="M24 40C24 40 4 27 4 14C4 8 8.5 4 13.5 4C18 4 21.5 7 24 11C26.5 7 30 4 34.5 4C39.5 4 44 8 44 14C44 27 24 40 24 40Z"
                fill="hsl(30 25% 70%)" />
            </svg>
          </div>
        )}

        {/* Obsah */}
        <div className="p-6">

          {/* Typ + datum */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 font-notes text-xs px-2.5 py-1 rounded-full"
              style={{ background: typeInfo.color + '20', color: typeInfo.color }}>
              <img src={typeInfo.timelineImage} style={{ width: 14, height: 14, objectFit: 'contain', mixBlendMode: 'multiply' }} alt="" />
              {typeInfo.label}
            </span>
            <span className="font-notes text-xs uppercase tracking-widest"
              style={{ color: 'hsl(25 15% 50%)' }}>
              {formatDate(event.date)}
            </span>
          </div>

          {/* Název */}
          <h2 className="font-hand leading-tight mb-1" style={{ fontSize: '1.9rem', color: 'hsl(25 30% 15%)' }}>
            {event.title}
          </h2>

          {/* Místo */}
          {(event as any).location_name && (
            <p className="font-notes text-sm mb-2" style={{ color: 'hsl(25 15% 50%)' }}>
              📍 {(event as any).location_name}
            </p>
          )}

          {/* Popis */}
          {event.description && (
            <p className="font-notes text-sm leading-relaxed mt-2" style={{ color: 'hsl(25 20% 32%)' }}>
              {event.description}
            </p>
          )}

          {/* Souřadnice — malé, diskrétní */}
          <p className="font-notes text-xs mt-3" style={{ color: 'hsl(25 15% 65%)' }}>
            {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
          </p>

          {/* Akce */}
          <div className="flex gap-2 mt-5">
            <button onClick={() => { onClose(); onEdit(event) }}
              className="flex-1 py-2.5 rounded-xl font-notes text-sm transition-colors"
              style={{ border: '1px solid #e0e0e0', background: '#f9f9f9', color: 'hsl(25 30% 15%)' }}>
              Upravit
            </button>
            <button onClick={() => setConfirmDelete(true)}
              className="flex-1 py-2.5 rounded-xl font-notes text-sm transition-colors"
              style={{ border: '1px solid #fca5a5', background: '#fff5f5', color: 'hsl(0 60% 45%)' }}>
              Smazat
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen lightbox */}
      {lightbox && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightbox(false)}
        >
          {/* Zavřít */}
          <button
            className="absolute top-4 right-5 z-10 w-10 h-10 rounded-full flex items-center justify-center font-notes text-xl text-white"
            style={{ background: 'rgba(255,255,255,0.12)' }}
            onClick={e => { e.stopPropagation(); setLightbox(false) }}
          >✕</button>

          {/* Šipka vlevo */}
          {photos.length > 1 && (
            <button
              className="absolute left-3 md:left-8 z-10 w-12 h-12 rounded-full flex items-center justify-center text-white text-3xl"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i - 1 + photos.length) % photos.length) }}
            >‹</button>
          )}

          {/* Fotka */}
          <img
            src={photos[photoIdx]}
            alt=""
            className="max-h-[92vh] max-w-[92vw] object-contain select-none"
            onClick={e => e.stopPropagation()}
          />

          {/* Šipka vpravo */}
          {photos.length > 1 && (
            <button
              className="absolute right-3 md:right-8 z-10 w-12 h-12 rounded-full flex items-center justify-center text-white text-3xl"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i + 1) % photos.length) }}
            >›</button>
          )}

          {/* Počítadlo */}
          {photos.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-notes text-xs text-white/50">
              {photoIdx + 1} / {photos.length}
            </div>
          )}
        </div>
      )}

      {/* Potvrzení smazání */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-60 px-4">
          <div className="paper-card rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center"
            style={{ border: '1px solid #e0e0e0', background: '#ffffff' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'hsl(0 60% 95%)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(0 60% 50%)" strokeWidth="2" strokeLinecap="round">
                <polyline points="3,6 5,6 21,6" /><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4h6v2"/>
              </svg>
            </div>
            <h3 className="font-hand mb-1" style={{ fontSize: '1.5rem', color: 'hsl(25 30% 15%)' }}>
              Smazat vzpomínku?
            </h3>
            <p className="font-notes text-sm mb-6" style={{ color: 'hsl(25 15% 50%)' }}>
              „{event.title}" bude nenávratně smazána včetně všech fotek.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl font-notes text-sm transition-colors"
                style={{ border: '1px solid hsl(30 25% 70%)', background: 'hsl(38 40% 92%)', color: 'hsl(25 15% 50%)' }}>
                Zrušit
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl font-notes text-sm transition-colors disabled:opacity-50"
                style={{ background: 'hsl(0 60% 48%)', color: 'white' }}>
                {deleting ? 'Mažu…' : 'Smazat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
