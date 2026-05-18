'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { EVENT_TYPES } from '@/lib/eventTypes'

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
  coords: { lat: number; lng: number } | null
  editEvent?: Event | null
  onClose: () => void
  onSaved: () => void
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block font-notes text-xs uppercase tracking-widest mb-1.5"
    style={{ color: 'hsl(25 15% 50%)' }}>
    {children}
  </label>
)

const inputCls = "w-full px-4 py-2.5 rounded-xl font-notes text-sm outline-none transition-colors"
const inputStyle = {
  background: '#f9f9f9',
  border: '1px solid hsl(30 25% 80%)',
  color: 'hsl(25 30% 15%)',
}

export default function AddEventModal({ coords, editEvent, onClose, onSaved }: Props) {
  const isEdit = !!editEvent
  const [title, setTitle] = useState(editEvent?.title ?? '')
  const [locationName, setLocationName] = useState((editEvent as any)?.location_name ?? '')
  const [description, setDescription] = useState(editEvent?.description ?? '')
  const [date, setDate] = useState(editEvent?.date ?? new Date().toISOString().split('T')[0])
  const [type, setType] = useState((editEvent as any)?.type ?? 'rande')
  const [manualLat, setManualLat] = useState(
    editEvent ? String(editEvent.lat) : coords ? String(parseFloat(coords.lat.toFixed(4))) : ''
  )
  const [manualLng, setManualLng] = useState(
    editEvent ? String(editEvent.lng) : coords ? String(parseFloat(coords.lng.toFixed(4))) : ''
  )
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string }[]>([])
  // primaryUrl = přímo URL náhledové fotky (nebo null)
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(editEvent?.photo_url ?? null)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [geoQuery, setGeoQuery] = useState('')
  const [geoResults, setGeoResults] = useState<{ name: string; lat: number; lng: number }[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const geoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const searchAddress = useCallback((q: string) => {
    setGeoQuery(q)
    if (geoTimeout.current) clearTimeout(geoTimeout.current)
    if (q.trim().length < 2) { setGeoResults([]); return }
    geoTimeout.current = setTimeout(async () => {
      setGeoLoading(true)
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&language=cs&limit=5`
        )
        const data = await res.json()
        setGeoResults(
          (data.features ?? []).map((f: any) => ({
            name: f.place_name,
            lat: f.center[1],
            lng: f.center[0],
          }))
        )
      } finally {
        setGeoLoading(false)
      }
    }, 350)
  }, [])

  const pickGeoResult = (r: { name: string; lat: number; lng: number }) => {
    setManualLat(r.lat.toFixed(6))
    setManualLng(r.lng.toFixed(6))
    if (!locationName) setLocationName(r.name.split(',')[0])
    setGeoQuery('')
    setGeoResults([])
  }

  useEffect(() => {
    if (isEdit && editEvent) {
      supabase.from('event_photos').select('*').eq('event_id', editEvent.id).then(({ data }) => {
        if (data) {
          setExistingPhotos(data)
          // Nastav primary na první fotku pokud ještě není nastavena
          if (data.length > 0 && !primaryUrl) {
            setPrimaryUrl(data[0].url)
          }
        }
      })
    }
  }, [editEvent?.id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selected])
    const newPreviews = selected.map(f => URL.createObjectURL(f))
    setPreviews(prev => {
      // Pokud zatím žádná primary, nastav první přidanou fotku
      if (!primaryUrl && prev.length === 0 && existingPhotos.length === 0) {
        setPrimaryUrl(newPreviews[0])
      }
      return [...prev, ...newPreviews]
    })
  }

  const removeNewFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const removeExistingPhoto = async (id: string) => {
    await supabase.from('event_photos').delete().eq('id', id)
    setExistingPhotos(prev => prev.filter(p => p.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) { setSaveError('Neplatné souřadnice'); return }
    setLoading(true)

    try {
      let eventId = editEvent?.id

      // 1. Ulož základní data události včetně location_name
      if (isEdit) {
        const { error } = await supabase.from('events')
          .update({ title, description, date, type, location_name: locationName })
          .eq('id', editEvent!.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('events')
          .insert({ title, description, date, type, lat, lng, photo_url: null, location_name: locationName })
          .select().single()
        if (error) throw error
        eventId = data?.id
      }

      if (!eventId) throw new Error('Nepodařilo se získat ID události')

      // 3. Nahraj nové fotky a zmapuj blob URL → finální Supabase URL
      const uploadedUrls: string[] = []
      const previewToFinal: Record<string, string> = {}
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { data: storData, error: storErr } = await supabase.storage.from('photos').upload(filename, file)
        if (storErr) { console.error('Upload error:', storErr); continue }
        if (storData) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filename)
          await supabase.from('event_photos').insert({ event_id: eventId, url: urlData.publicUrl })
          uploadedUrls.push(urlData.publicUrl)
          previewToFinal[previews[i]] = urlData.publicUrl
        }
      }

      // 4. Urči thumbnail URL — hvězdička → přelož blob na finální, fallback na první dostupnou
      const resolvedPrimary = primaryUrl
        ? (previewToFinal[primaryUrl] ?? (primaryUrl.startsWith('blob:') ? null : primaryUrl))
        : null
      const thumbnailUrl = resolvedPrimary ?? uploadedUrls[0] ?? existingPhotos[0]?.url ?? null

      // 5. Vždy ulož photo_url (i null pro reset)
      const { error: thumbErr } = await supabase.from('events')
        .update({ photo_url: thumbnailUrl })
        .eq('id', eventId)
      if (thumbErr) throw thumbErr

      setLoading(false)
      onSaved()
      onClose()
    } catch (err: any) {
      setLoading(false)
      setSaveError(err?.message ?? 'Neznámá chyba')
    }
  }

  const totalPhotos = existingPhotos.length + previews.length

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-md relative max-h-[90vh] overflow-y-auto"
        style={{ border: '1px solid hsl(30 25% 80%)', background: '#ffffff' }}>

        {/* Zavírací tlačítko */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-notes text-lg"
          style={{ color: 'hsl(25 15% 50%)', background: '#f0f0f0' }}>
          ✕
        </button>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Typ vzpomínky */}
            <div>
              <Label>Typ vzpomínky</Label>
              <div className="grid grid-cols-3 gap-2">
                {EVENT_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => setType(t.id)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: type === t.id ? t.color : '#e0e0e0',
                      background: type === t.id ? t.color + '18' : '#f9f9f9',
                    }}>
                    <img src={t.timelineImage} style={{ width: 24, height: 24, objectFit: 'contain', mixBlendMode: 'multiply' }} alt={t.label} />
                    <span className="font-notes text-xs"
                      style={{ color: type === t.id ? t.color : 'hsl(25 15% 50%)' }}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vyhledávání adresy */}
            <div className="relative">
              <Label>Hledat místo</Label>
              <div className="relative">
                <input
                  type="text"
                  value={geoQuery}
                  onChange={e => searchAddress(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="Strážné, Dolomity, Praha..."
                  autoComplete="off"
                />
                {geoLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-notes text-xs"
                    style={{ color: 'hsl(25 15% 55%)' }}>hledám…</span>
                )}
              </div>
              {geoResults.length > 0 && (
                <ul className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
                  style={{ border: '1px solid hsl(30 25% 80%)', background: '#fff' }}>
                  {geoResults.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => pickGeoResult(r)}
                        className="w-full text-left px-4 py-2.5 font-notes text-sm transition-colors"
                        style={{ color: 'hsl(25 30% 15%)', borderBottom: i < geoResults.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f9f5f0')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span className="font-semibold">{r.name.split(',')[0]}</span>
                        <span style={{ color: 'hsl(25 15% 55%)' }}>{r.name.includes(',') ? ', ' + r.name.split(',').slice(1).join(',') : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Souřadnice — vložení GPS nebo DMS */}
            <div>
              <Label>GPS souřadnice</Label>
              <input
                type="text"
                className={inputCls} style={inputStyle}
                placeholder={"47°25'54.5\"N 12°32'28.0\"E nebo 50.0755, 14.4378"}
                onChange={e => {
                  const val = e.target.value.trim()
                  // DMS formát: 47°25'54.5"N 12°32'28.0"E
                  const dms = val.match(/(\d+)°(\d+)'([\d.]+)"([NS])\s+(\d+)°(\d+)'([\d.]+)"([EW])/i)
                  if (dms) {
                    const lat = parseFloat(dms[1]) + parseFloat(dms[2])/60 + parseFloat(dms[3])/3600
                    const lng = parseFloat(dms[5]) + parseFloat(dms[6])/60 + parseFloat(dms[7])/3600
                    setManualLat(String((dms[4].toUpperCase() === 'S' ? -lat : lat).toFixed(6)))
                    setManualLng(String((dms[8].toUpperCase() === 'W' ? -lng : lng).toFixed(6)))
                    return
                  }
                  // Decimal formát: 50.0755, 14.4378
                  const dec = val.match(/([-\d.]+)[,\s]+([-\d.]+)/)
                  if (dec) {
                    setManualLat(dec[1])
                    setManualLng(dec[2])
                  }
                }}
              />
              <div className="flex gap-3 mt-2">
                <div className="flex-1">
                  <Label>Šířka</Label>
                  <input type="number" step="any" value={manualLat}
                    onChange={e => setManualLat(e.target.value)}
                    className={inputCls} style={inputStyle}
                    placeholder="50.0755" required />
                </div>
                <div className="flex-1">
                  <Label>Délka</Label>
                  <input type="number" step="any" value={manualLng}
                    onChange={e => setManualLng(e.target.value)}
                    className={inputCls} style={inputStyle}
                    placeholder="14.4378" required />
                </div>
              </div>
            </div>

            {/* Název */}
            <div>
              <Label>Název</Label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className={inputCls} style={inputStyle}
                placeholder="Výlet do hor..." required />
            </div>

            {/* Místo */}
            <div>
              <Label>Místo</Label>
              <input type="text" value={locationName} onChange={e => setLocationName(e.target.value)}
                className={inputCls} style={inputStyle}
                placeholder="Sněžka, Dolomity..." />
            </div>

            {/* Datum */}
            <div>
              <Label>Datum</Label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className={inputCls} style={inputStyle} required />
            </div>

            {/* Popis */}
            <div>
              <Label>Popis</Label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className={inputCls + ' resize-none'} style={inputStyle}
                placeholder="Co jsme zažili..." rows={3} />
            </div>

            {/* Fotky */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Fotky{totalPhotos > 0 ? ` (${totalPhotos})` : ''}</Label>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="font-notes text-xs px-3 py-1 rounded-lg transition-colors"
                  style={{ background: '#f0f0f0', border: '1px solid #e0e0e0', color: 'hsl(25 30% 15%)' }}>
                  + Přidat fotky
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />

              {totalPhotos > 0 ? (
                <div>
                  <p className="font-notes text-xs mb-1.5" style={{ color: 'hsl(25 15% 55%)' }}>
                    ★ = náhledová fotka
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingPhotos.map(photo => {
                      const isPrimary = primaryUrl === photo.url
                      return (
                        <div key={photo.id} className="relative group rounded-xl overflow-hidden" style={{ height: 90 }}>
                          <img src={photo.url} className="w-full h-full object-cover" alt="" />
                          <button type="button" onClick={() => setPrimaryUrl(photo.url)}
                            className="absolute bottom-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all"
                            style={{ background: isPrimary ? '#f59e0b' : 'rgba(0,0,0,0.4)', color: 'white' }}>
                            ★
                          </button>
                          {/* Smazat */}
                          <button type="button" onClick={() => removeExistingPhoto(photo.id)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        </div>
                      )
                    })}
                    {previews.map((src, i) => {
                      // Pro nové fotky porovnáváme index — uložíme url po uploadu přes pořadí
                      const isPrimary = primaryUrl === src
                      return (
                        <div key={i} className="relative group rounded-xl overflow-hidden" style={{ height: 90 }}>
                          <img src={src} className="w-full h-full object-cover" alt="" />
                          <button type="button" onClick={() => setPrimaryUrl(src)}
                            className="absolute bottom-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all"
                            style={{ background: isPrimary ? '#f59e0b' : 'rgba(0,0,0,0.4)', color: 'white' }}>
                            ★
                          </button>
                          {/* Smazat */}
                          <button type="button" onClick={() => removeNewFile(i)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 rounded-xl font-notes text-sm transition-colors flex items-center justify-center"
                  style={{ border: '2px dashed hsl(30 25% 75%)', color: 'hsl(25 15% 55%)' }}>
                  Klikni pro přidání fotek
                </button>
              )}
            </div>

            {/* Chyba */}
            {saveError && (
              <p className="font-notes text-sm text-center" style={{ color: 'hsl(0 60% 48%)' }}>
                Chyba: {saveError}
              </p>
            )}

            {/* Uložit */}
            <button type="submit" disabled={loading}
              className="mt-1 w-full py-3.5 rounded-xl font-hand text-2xl transition-colors disabled:opacity-50"
              style={{ background: 'hsl(25 30% 15%)', color: 'hsl(40 35% 95%)' }}>
              {loading ? 'Ukládám…' : isEdit ? 'Uložit změny' : 'Uložit vzpomínku'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
