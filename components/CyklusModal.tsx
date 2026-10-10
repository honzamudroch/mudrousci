'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ds } from '@/lib/cyklus'

export interface CyklusRow {
  id: string
  person: string
  date_start: string
  date_end: string | null
  note: string | null
}

const INPUT: React.CSSProperties = {
  border: '1px solid hsl(30 25% 80%)', background: '#f9f7f4', borderRadius: 12,
  padding: '10px 12px', fontFamily: 'var(--font-notes)', fontSize: '0.95rem',
  color: 'hsl(25 30% 15%)', outline: 'none', width: '100%',
}

export default function CyklusModal({ init, onClose, onSaved }: {
  init: { cyklus?: CyklusRow; date_start?: string }
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const isEdit = !!init.cyklus
  const today = ds(new Date())

  const [dateStart, setDateStart] = useState(init.cyklus?.date_start ?? init.date_start ?? today)
  const [dateEnd,   setDateEnd]   = useState(init.cyklus?.date_end ?? '')
  const [note,      setNote]      = useState(init.cyklus?.note ?? '')
  const [saving,    setSaving]    = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const valid = !!dateStart && (!dateEnd || dateEnd >= dateStart)

  const save = async () => {
    if (!valid) return
    setSaving(true)
    const payload = { person: 'lucka', date_start: dateStart, date_end: dateEnd || null, note: note.trim() || null }
    if (isEdit) await supabase.from('cyklus').update(payload).eq('id', init.cyklus!.id)
    else        await supabase.from('cyklus').insert(payload)
    setSaving(false); onSaved(); onClose()
  }

  const remove = async () => {
    await supabase.from('cyklus').delete().eq('id', init.cyklus!.id)
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-sm"
        style={{ background: '#fff', border: '1px solid #e0dbd4' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #f0ede8' }}>
          <h2 className="font-hand" style={{ fontSize: '1.8rem', color: 'hsl(25 30% 15%)' }}>
            {isEdit ? 'Upravit záznam' : 'Nový záznam'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#f0ede8', color: 'hsl(25 30% 15%)' }}>✕</button>
        </div>

        <div className="px-6 py-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-notes text-xs uppercase tracking-widest" style={{ color: 'hsl(25 15% 55%)' }}>Začala</label>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} style={INPUT} autoFocus />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-notes text-xs uppercase tracking-widest" style={{ color: 'hsl(25 15% 55%)' }}>Skončila</label>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} style={INPUT} />
            </div>
          </div>
          {dateEnd && dateEnd < dateStart && (
            <p className="font-notes text-xs" style={{ color: 'hsl(0 60% 48%)' }}>Konec nemůže být před začátkem.</p>
          )}
          <p className="font-notes text-xs" style={{ color: 'hsl(25 15% 55%)' }}>
            {'Konec nech prázdný, když ještě probíhá. Doplní se tlačítkem „Skončila dnes".'}
          </p>

          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Poznámka (volitelné)…" rows={2} style={{ ...INPUT, resize: 'none' }} />

          <div className="flex gap-2 pt-1">
            {isEdit && !confirmDel && (
              <button onClick={() => setConfirmDel(true)}
                className="py-2.5 px-4 rounded-xl font-notes text-sm"
                style={{ border: '1px solid #fca5a5', background: '#fff5f5', color: 'hsl(0 60% 48%)' }}>
                Smazat
              </button>
            )}
            {isEdit && confirmDel && (
              <button onClick={remove}
                className="py-2.5 px-4 rounded-xl font-notes text-sm"
                style={{ background: 'hsl(0 60% 48%)', color: 'white' }}>
                Opravdu?
              </button>
            )}
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-notes text-sm"
              style={{ border: '1px solid #e0dbd4', background: '#f9f7f4', color: 'hsl(25 30% 15%)' }}>
              Zrušit
            </button>
            <button onClick={save} disabled={!valid || saving}
              className="flex-1 py-2.5 rounded-xl font-notes text-sm"
              style={{ background: valid ? 'hsl(25 30% 15%)' : '#ccc', color: 'hsl(40 35% 95%)' }}>
              {saving ? '...' : isEdit ? 'Uložit' : 'Přidat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
