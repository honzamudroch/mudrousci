'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { parseEstimate, formatEstimate } from '@/lib/estimateFormat'

interface Task {
  id: string; person: string; nazev: string; poznamka: string | null
  status: string; priorita: string; projekt_id: string | null
  due_date: string | null; planned_date: string | null; planned_start: string | null
  estimate_minutes: number | null; completed_at: string | null
  pinned: boolean; order_idx: number; archived: boolean
}

interface Projekt {
  id: string; person: string; nazev: string; emoji: string | null; barva: string | null
}

interface Props {
  projekty: Projekt[]
  editTask: Task | null
  defaultDate?: string
  onClose: () => void
  onSaved: () => void
}

const BARVY = ['#6b8cba', '#e8a87c', '#7bc57e', '#f5c642', '#c47bb5', '#e87c7c', '#87c0bf', '#b0ac9e']

const INPUT = {
  border: '1px solid hsl(30 25% 80%)',
  background: '#f9f7f4',
  color: 'hsl(25 30% 15%)',
  borderRadius: 12,
  padding: '10px 12px',
  width: '100%',
  fontFamily: 'var(--font-notes)',
  fontSize: '0.9rem',
  outline: 'none',
} as React.CSSProperties

const LABEL = {
  fontFamily: 'var(--font-notes)',
  fontSize: '0.72rem',
  color: 'hsl(25 15% 52%)',
  display: 'block',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
} as React.CSSProperties

export default function AddTaskModal({ projekty, editTask, defaultDate, onClose, onSaved }: Props) {
  const supabase = createClient()

  const [person, setPerson] = useState(editTask?.person ?? 'honza')
  const [nazev, setNazev] = useState(editTask?.nazev ?? '')
  const [poznamka, setPoznamka] = useState(editTask?.poznamka ?? '')
  const [status, setStatus] = useState(editTask?.status ?? 'todo')
  const [priorita, setPriority] = useState(editTask?.priorita ?? 'none')
  const [projektId, setProjektId] = useState(editTask?.projekt_id ?? '')
  const [dueDate, setDueDate] = useState(editTask?.due_date ?? '')
  const [plannedDate, setPlannedDate] = useState(editTask?.planned_date ?? defaultDate ?? '')
  const [plannedStart, setPlannedStart] = useState(editTask?.planned_start?.slice(0, 5) ?? '')
  const [estimateInput, setEstimateInput] = useState(
    editTask?.estimate_minutes ? formatEstimate(editTask.estimate_minutes) : ''
  )
  const [estimateError, setEstimateError] = useState<string | null>(null)
  const [pinned, setPinned] = useState(editTask?.pinned ?? false)
  const [saving, setSaving] = useState(false)

  const [creatingProj, setCreatingProj] = useState(false)
  const [newProjNazev, setNewProjNazev] = useState('')
  const [newProjEmoji, setNewProjEmoji] = useState('')
  const [newProjBarva, setNewProjBarva] = useState(BARVY[0])
  const [localProjekty, setLocalProjekty] = useState<Projekt[]>(projekty)

  const filteredProjekty = localProjekty.filter(p => p.person === person)

  const estimatePreview = useMemo(() => {
    if (estimateError || !estimateInput.trim()) return ''
    try {
      const m = parseEstimate(estimateInput)
      return m ? `= ${formatEstimate(m)}` : ''
    } catch { return '' }
  }, [estimateInput, estimateError])

  const onEstimateChange = (val: string) => {
    setEstimateInput(val)
    if (!val.trim()) { setEstimateError(null); return }
    try { parseEstimate(val); setEstimateError(null) }
    catch (e) { setEstimateError(e instanceof Error ? e.message : 'Neplatny format') }
  }

  const createProj = async () => {
    if (!newProjNazev.trim()) return
    const { data: maxData } = await supabase.from('ukoly_projekty')
      .select('order_idx').order('order_idx', { ascending: false }).limit(1)
    const maxOrder = (maxData?.[0]?.order_idx as number | undefined) ?? -1
    const { data: proj } = await supabase.from('ukoly_projekty').insert({
      person, nazev: newProjNazev.trim(),
      emoji: newProjEmoji || null, barva: newProjBarva,
      order_idx: maxOrder + 1,
    }).select().single()
    if (proj) {
      const p = proj as Projekt
      setLocalProjekty(prev => [...prev, p])
      setProjektId(p.id)
      setCreatingProj(false)
      setNewProjNazev(''); setNewProjEmoji('')
    }
  }

  const save = async () => {
    if (!nazev.trim()) return
    let estimate_minutes: number | null = null
    if (estimateInput.trim()) {
      try { estimate_minutes = parseEstimate(estimateInput) }
      catch (e) { setEstimateError(e instanceof Error ? e.message : 'Chyba'); return }
    }
    setSaving(true)
    const nowStr = new Date().toISOString()
    const completed_at = status === 'done'
      ? (editTask?.status === 'done' ? editTask.completed_at : nowStr)
      : null
    const payload = {
      person, nazev: nazev.trim(), poznamka: poznamka.trim() || null,
      status, priorita, projekt_id: projektId || null,
      due_date: dueDate || null, planned_date: plannedDate || null,
      planned_start: plannedStart || null, estimate_minutes,
      completed_at, pinned,
    }
    if (editTask) {
      await supabase.from('ukoly').update(payload).eq('id', editTask.id)
    } else {
      const { data: maxData } = await supabase.from('ukoly')
        .select('order_idx').order('order_idx', { ascending: false }).limit(1)
      const maxOrder = (maxData?.[0]?.order_idx as number | undefined) ?? -1
      await supabase.from('ukoly').insert({ ...payload, order_idx: maxOrder + 1 })
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  const canSave = nazev.trim() && !estimateError && !saving

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}>
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-md"
        style={{ border: '1px solid #e0dbd4', background: '#fff', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Hlavicka */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid #f0ede8' }}>
          <h2 className="font-hand" style={{ fontSize: '1.8rem', color: 'hsl(25 30% 15%)' }}>
            {editTask ? 'Upravit ukol' : 'Novy ukol'}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#f0ede8', color: 'hsl(25 30% 15%)' }}>✕</button>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4">

          {/* Pro koho */}
          <div>
            <label style={LABEL}>Pro koho</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #e0dbd4' }}>
              {(['honza', 'lucka'] as const).map((p, i) => (
                <button key={p} onClick={() => setPerson(p)}
                  className="flex-1 py-2.5 font-notes text-sm transition-colors"
                  style={{
                    background: person === p ? 'hsl(25 30% 15%)' : '#f9f7f4',
                    color: person === p ? 'hsl(40 35% 95%)' : 'hsl(25 30% 15%)',
                    borderRight: i === 0 ? '1px solid #e0dbd4' : undefined,
                    fontFamily: 'var(--font-notes)',
                  }}>
                  {p === 'honza' ? '🧔 Honza' : '👩 Lucka'}
                </button>
              ))}
            </div>
          </div>

          {/* Nazev */}
          <div>
            <label style={LABEL}>Nazev *</label>
            <input value={nazev} onChange={e => setNazev(e.target.value)}
              style={INPUT} placeholder="Nazev ukolu..." autoFocus
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && save()} />
          </div>

          {/* Poznamka */}
          <div>
            <label style={LABEL}>Poznamka</label>
            <textarea value={poznamka} onChange={e => setPoznamka(e.target.value)}
              style={{ ...INPUT, resize: 'vertical', minHeight: 68 } as React.CSSProperties}
              placeholder="Volitelna poznamka..." rows={2} />
          </div>

          {/* Stav + Priorita */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={LABEL}>Stav</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                style={{ ...INPUT, appearance: 'auto' } as React.CSSProperties}>
                <option value="todo">Todo</option>
                <option value="in-progress">Probiha</option>
                <option value="done">Hotovo</option>
              </select>
            </div>
            <div>
              <label style={LABEL}>Priorita</label>
              <select value={priorita} onChange={e => setPriority(e.target.value)}
                style={{ ...INPUT, appearance: 'auto' } as React.CSSProperties}>
                <option value="none">Zadna</option>
                <option value="low">Nizka</option>
                <option value="medium">Stredni</option>
                <option value="high">Vysoka</option>
              </select>
            </div>
          </div>

          {/* Projekt */}
          <div>
            <label style={LABEL}>Projekt</label>
            <select
              value={projektId}
              onChange={e => {
                if (e.target.value === '__new__') { setCreatingProj(true); setProjektId('') }
                else { setProjektId(e.target.value); setCreatingProj(false) }
              }}
              style={{ ...INPUT, appearance: 'auto' } as React.CSSProperties}>
              <option value="">Bez projektu</option>
              {filteredProjekty.map(p => (
                <option key={p.id} value={p.id}>{p.emoji} {p.nazev}</option>
              ))}
              <option value="__new__">+ novy projekt...</option>
            </select>

            {creatingProj && (
              <div className="mt-2 p-3 rounded-xl flex flex-col gap-2"
                style={{ background: '#f9f7f4', border: '1px solid #e0dbd4' }}>
                <div className="flex gap-2">
                  <input value={newProjEmoji} onChange={e => setNewProjEmoji(e.target.value)}
                    placeholder="🎯" maxLength={4}
                    style={{ ...INPUT, width: 64, padding: '10px 8px', textAlign: 'center' } as React.CSSProperties} />
                  <input value={newProjNazev} onChange={e => setNewProjNazev(e.target.value)}
                    placeholder="Nazev projektu"
                    style={{ ...INPUT, flex: 1 } as React.CSSProperties}
                    onKeyDown={e => e.key === 'Enter' && createProj()} />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {BARVY.map(b => (
                    <button key={b} onClick={() => setNewProjBarva(b)}
                      style={{
                        width: 22, height: 22, borderRadius: 11,
                        background: b, border: 'none', cursor: 'pointer',
                        outline: newProjBarva === b ? '2px solid hsl(25 30% 15%)' : '2px solid transparent',
                        outlineOffset: 2,
                      }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={createProj} disabled={!newProjNazev.trim()}
                    className="font-notes text-sm px-3 py-1.5 rounded-lg"
                    style={{
                      background: 'hsl(25 30% 15%)', color: 'hsl(40 35% 95%)',
                      opacity: newProjNazev.trim() ? 1 : 0.4,
                    }}>
                    Vytvorit
                  </button>
                  <button onClick={() => { setCreatingProj(false); setNewProjNazev('') }}
                    className="font-notes text-sm px-3 py-1.5 rounded-lg"
                    style={{ background: '#f0ede8', color: 'hsl(25 30% 15%)' }}>
                    Zrusit
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Terminy */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={LABEL}>Deadline (due)</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Planovany den</label>
              <input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} style={INPUT} />
            </div>
          </div>

          {/* Cas na ose */}
          <div>
            <label style={LABEL}>Cas na ose (HH:MM)</label>
            <input type="time" value={plannedStart} onChange={e => setPlannedStart(e.target.value)}
              style={{ ...INPUT, opacity: plannedDate ? 1 : 0.45 } as React.CSSProperties}
              disabled={!plannedDate} />
            {!plannedDate && (
              <p className="font-notes text-xs mt-1" style={{ color: 'hsl(25 15% 55%)' }}>
                Nastav planovany den pro umisteni na osu
              </p>
            )}
          </div>

          {/* Odhad */}
          <div>
            <label style={LABEL}>Odhad (pr. 2h 30m, 1.5d, 90m)</label>
            <input value={estimateInput} onChange={e => onEstimateChange(e.target.value)}
              style={{ ...INPUT, borderColor: estimateError ? 'hsl(0 62% 60%)' : 'hsl(30 25% 80%)' } as React.CSSProperties}
              placeholder="2h 30m" />
            {estimateError && (
              <p className="font-notes text-xs mt-1" style={{ color: 'hsl(0 62% 48%)' }}>{estimateError}</p>
            )}
            {estimatePreview && (
              <p className="font-notes text-xs mt-1" style={{ color: 'hsl(145 45% 32%)' }}>{estimatePreview}</p>
            )}
          </div>

          {/* Pin */}
          <label className="flex items-center gap-3 cursor-pointer select-none"
            style={{ fontFamily: 'var(--font-notes)', fontSize: '0.9rem', color: 'hsl(25 30% 15%)' }}>
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer' }} />
            📌 Pripnout nahoru
          </label>

          {/* Tlacitka */}
          <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid #f0ede8' }}>
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-notes text-sm"
              style={{ border: '1px solid #e0dbd4', background: '#f9f7f4', color: 'hsl(25 30% 15%)' }}>
              Zrusit
            </button>
            <button onClick={save} disabled={!canSave}
              className="flex-1 py-2.5 rounded-xl font-notes text-sm"
              style={{ background: canSave ? 'hsl(25 30% 15%)' : '#ccc', color: 'hsl(40 35% 95%)' }}>
              {saving ? '...' : editTask ? 'Ulozit' : 'Pridat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
