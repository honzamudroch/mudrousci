'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'

interface Udalost {
  id: string; person: string; nazev: string
  date_start: string; date_end: string; barva: string; note: string | null
  typ: string | null
}

const TYPY: { key: string; label: string; icon: string }[] = [
  { key: 'prace',     label: 'Práce',  icon: '💼' },
  { key: 'spolecne',  label: 'Spolu',  icon: '👫' },
]

type View = 'days' | 'weeks' | 'months'

const LEFT_W = 140
const ROW_H  = 72

const COL_W: Record<View, number> = { days: 56, weeks: 100, months: 120 }
const COL_N: Record<View, number> = { days: 28, weeks: 26, months: 18 }

const BARVY = ['#e8a87c','#c47bb5','#7bc57e','#6b8cba','#f5c642','#e87c7c','#87c0bf','#b0ac9e','#a3c4f3','#f9c784','#84dcc6','#c9b1ff']

function addDays(d: Date, n: number)   { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function monday(d: Date) { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); r.setDate(r.getDate() - ((r.getDay()+6)%7)); return r }
function ds(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

const CS_D  = ['Ne','Po','Út','St','Čt','Pá','So']
const CS_MS = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro']
const CS_ML = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec']
const TODAY  = ds(new Date())

interface Col { date: Date; label: string; key: string; isToday: boolean; isWeekend: boolean }

function getRangeStart(sel: Date, view: View): Date {
  if (view === 'days')  return monday(new Date(sel.getFullYear(), sel.getMonth(), 1))
  if (view === 'weeks') return monday(new Date(sel.getFullYear(), sel.getMonth(), 1))
  return new Date(sel.getFullYear(), 0, 1)
}

function buildCols(start: Date, view: View, n = COL_N[view]): Col[] {
  return Array.from({ length: n }, (_, i) => {
    let date: Date, label: string, isWeekend = false
    if (view === 'days') {
      date = addDays(start, i)
      const dow = date.getDay(); isWeekend = dow === 0 || dow === 6
      label = `${CS_D[dow]} ${date.getDate()}`
    } else if (view === 'weeks') {
      date = addDays(start, i * 7)
      label = `${date.getDate()}.${date.getMonth()+1}`
    } else {
      date = new Date(start.getFullYear(), start.getMonth() + i, 1)
      label = CS_MS[date.getMonth()]
    }
    return { date, label, key: ds(date), isToday: ds(date) === TODAY, isWeekend }
  })
}

function diffUnits(from: Date, to: Date, unit: 'day'|'week'|'month'): number {
  if (unit === 'day')   return Math.round((to.getTime() - from.getTime()) / 86400000)
  if (unit === 'week')  return Math.round((to.getTime() - from.getTime()) / (86400000 * 7))
  return (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth()
}

const ROWS = [
  { key: 'honza', label: '🧔 Honza', defaultColor: '#e8a87c' },
  { key: 'lucka', label: '👩 Lucka',  defaultColor: '#c47bb5' },
  { key: 'plan',  label: '📋 Plány',  defaultColor: '#7bc57e' },
]

// ── Modal přidání/editace ──────────────────────────────────
function UdalostModal({ init, onClose, onSaved, onDeleted }: {
  init: { person: string; date_start?: string; udalost?: Udalost }
  onClose: () => void; onSaved: () => void; onDeleted?: () => void
}) {
  const supabase = createClient()
  const isEdit   = !!init.udalost
  const [person,    setPerson]    = useState(init.udalost?.person    ?? init.person)
  const [nazev,     setNazev]     = useState(init.udalost?.nazev     ?? '')
  const [dateStart, setDateStart] = useState(init.udalost?.date_start ?? init.date_start ?? TODAY)
  const [dateEnd,   setDateEnd]   = useState(init.udalost?.date_end   ?? init.date_start ?? TODAY)
  const [barva,     setBarva]     = useState(init.udalost?.barva     ?? ROWS.find(r => r.key === (init.udalost?.person ?? init.person))?.defaultColor ?? '#e8a87c')
  const [note,      setNote]      = useState(init.udalost?.note      ?? '')
  const [typ,       setTyp]       = useState<string | null>(init.udalost?.typ ?? null)
  const [saving,    setSaving]    = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const INPUT: React.CSSProperties = { border:'1px solid hsl(30 25% 80%)', background:'#f9f7f4', borderRadius:12, padding:'10px 12px', fontFamily:'var(--font-notes)', fontSize:'0.9rem', color:'hsl(25 30% 15%)', outline:'none', width:'100%' }

  const save = async () => {
    if (!nazev.trim() || !dateStart) return
    setSaving(true)
    const end = dateEnd >= dateStart ? dateEnd : dateStart
    const payload = { person, nazev: nazev.trim(), date_start: dateStart, date_end: end, barva, note: note.trim() || null, typ: typ || null }
    if (isEdit) await supabase.from('udalosti').update(payload).eq('id', init.udalost!.id)
    else        await supabase.from('udalosti').insert(payload)
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background:'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-sm"
        style={{ background:'#fff', border:'1px solid #e0dbd4' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom:'1px solid #f0ede8' }}>
          <h2 className="font-hand" style={{ fontSize:'1.8rem', color:'hsl(25 30% 15%)' }}>
            {isEdit ? 'Upravit událost' : 'Nová událost'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background:'#f0ede8', color:'hsl(25 30% 15%)' }}>✕</button>
        </div>

        <div className="px-6 py-4 flex flex-col gap-3">
          {/* Kdo */}
          <div className="flex gap-2">
            {ROWS.map(r => (
              <button key={r.key} type="button" onClick={() => setPerson(r.key)}
                className="flex-1 py-2 rounded-xl font-notes text-xs transition-all"
                style={{ background:person===r.key?r.defaultColor:'#f9f7f4', color:person===r.key?'#fff':'hsl(25 15% 55%)', border:`1.5px solid ${person===r.key?r.defaultColor:'#e0e0e0'}` }}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Typ */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setTyp(null)}
              className="flex-1 py-1.5 rounded-xl font-notes text-xs transition-all"
              style={{ background:typ===null?'hsl(25 30% 15%)':'#f9f7f4', color:typ===null?'hsl(40 35% 95%)':'hsl(25 15% 55%)', border:`1.5px solid ${typ===null?'hsl(25 30% 15%)':'#e0e0e0'}` }}>
              Obecné
            </button>
            {TYPY.map(t => (
              <button key={t.key} type="button" onClick={() => setTyp(prev => prev === t.key ? null : t.key)}
                className="flex-1 py-1.5 rounded-xl font-notes text-xs transition-all"
                style={{ background:typ===t.key?'hsl(25 30% 15%)':'#f9f7f4', color:typ===t.key?'hsl(40 35% 95%)':'hsl(25 15% 55%)', border:`1.5px solid ${typ===t.key?'hsl(25 30% 15%)':'#e0e0e0'}` }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Název */}
          <input value={nazev} onChange={e => setNazev(e.target.value)}
            placeholder="Název události…" autoFocus style={INPUT}
            onKeyDown={e => e.key === 'Enter' && save()} />

          {/* Datumy */}
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-notes text-xs uppercase tracking-widest" style={{ color:'hsl(25 15% 55%)' }}>Od</label>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} style={INPUT} />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-notes text-xs uppercase tracking-widest" style={{ color:'hsl(25 15% 55%)' }}>Do</label>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} style={INPUT} />
            </div>
          </div>

          {/* Barva */}
          <div className="flex gap-1.5 flex-wrap">
            {BARVY.map(b => (
              <button key={b} onClick={() => setBarva(b)}
                style={{ width:24, height:24, borderRadius:12, background:b, border:'none', cursor:'pointer', outline:barva===b?'2px solid hsl(25 30% 15%)':'2px solid transparent', outlineOffset:2 }} />
            ))}
          </div>

          {/* Poznámka */}
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Poznámka…" rows={2} style={{ ...INPUT, resize:'none' }} />

          {/* Tlačítka */}
          <div className="flex gap-2 pt-1">
            {isEdit && !confirmDel && (
              <button onClick={() => setConfirmDel(true)}
                className="py-2.5 px-4 rounded-xl font-notes text-sm"
                style={{ border:'1px solid #fca5a5', background:'#fff5f5', color:'hsl(0 60% 48%)' }}>
                Smazat
              </button>
            )}
            {isEdit && confirmDel && (
              <button onClick={async () => { await supabase.from('udalosti').delete().eq('id', init.udalost!.id); onDeleted?.(); onClose() }}
                className="py-2.5 px-4 rounded-xl font-notes text-sm"
                style={{ background:'hsl(0 60% 48%)', color:'white' }}>
                Opravdu?
              </button>
            )}
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-notes text-sm"
              style={{ border:'1px solid #e0dbd4', background:'#f9f7f4', color:'hsl(25 30% 15%)' }}>
              Zrušit
            </button>
            <button onClick={save} disabled={!nazev.trim() || saving}
              className="flex-1 py-2.5 rounded-xl font-notes text-sm"
              style={{ background:nazev.trim()?'hsl(25 30% 15%)':'#ccc', color:'hsl(40 35% 95%)' }}>
              {saving ? '...' : isEdit ? 'Uložit' : 'Přidat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Hlavní komponenta ──────────────────────────────────────
export default function PlanPage() {
  const supabase = createClient()

  const [udalosti,  setUdalosti]  = useState<Udalost[]>([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState<View>('weeks')
  const [sel,       setSel]       = useState(() => new Date())
  const [daysSpan,  setDaysSpan]  = useState<number | null>(null)
  const [modal,     setModal]     = useState<{ person: string; date_start?: string; udalost?: Udalost } | null>(null)

  const loadData = useCallback(async () => {
    const { data } = await supabase.from('udalosti').select('*').order('date_start')
    setUdalosti(data ?? [])
    setLoading(false)
  }, []) // eslint-disable-line

  useEffect(() => { loadData() }, [loadData])

  const unit: 'day'|'week'|'month' = view === 'days' ? 'day' : view === 'weeks' ? 'week' : 'month'

  const rangeStart = useMemo(() => addDays(sel, -2), [sel])

  const cols = useMemo(() => {
    if (daysSpan !== null) {
      const n = view === 'days' ? daysSpan : view === 'weeks' ? Math.ceil(daysSpan / 7) : Math.ceil(daysSpan / 30)
      return buildCols(rangeStart, view, n)
    }
    return buildCols(rangeStart, view)
  }, [rangeStart, view, daysSpan])

  const colW   = COL_W[view]
  const totalW = cols.length * colW

  const monthGroups = useMemo(() => {
    if (view === 'months') return [{ label: String(rangeStart.getFullYear()), count: cols.length }]
    const groups: { label: string; count: number }[] = []
    for (const col of cols) {
      const label = `${CS_ML[col.date.getMonth()]} ${col.date.getFullYear()}`
      if (groups.length === 0 || groups[groups.length-1].label !== label) groups.push({ label, count: 1 })
      else groups[groups.length-1].count++
    }
    return groups
  }, [cols, view, rangeStart])

  const todayX = useMemo(() => {
    const today = new Date()
    const diff  = diffUnits(rangeStart, today, unit)
    if (diff < 0 || diff >= cols.length) return null
    const frac  = unit === 'day' ? (today.getHours() + today.getMinutes() / 60) / 24 : 0
    return diff * colW + frac * colW
  }, [rangeStart, unit, colW, cols.length])

  const navigate = (dir: 1 | -1) => setSel(prev =>
    view === 'months' ? new Date(prev.getFullYear() + dir, 0, 1) : addMonths(prev, dir)
  )

  const navLabel = useMemo(() => {
    if (view === 'months') return String(sel.getFullYear())
    return `${CS_ML[sel.getMonth()]} ${sel.getFullYear()}`
  }, [view, sel])

  const eventGeom = (u: Udalost): { left: number; width: number } | null => {
    const start  = new Date(u.date_start + 'T00:00:00')
    const end    = new Date(u.date_end   + 'T00:00:00')
    const left   = diffUnits(rangeStart, start, unit) * colW
    const dur    = Math.max(1, diffUnits(start, end, unit) + (unit === 'day' ? 1 : 1))
    const width  = dur * colW
    if (left + width < 0 || left > totalW) return null
    return { left, width }
  }

  function ColBg() {
    return <>
      {cols.map((col, ci) => (col.isWeekend || col.isToday) ? (
        <div key={ci} style={{ position:'absolute', top:0, bottom:0, left:ci*colW, width:colW, background:col.isToday?'hsl(38 80% 95%)':'hsl(0 0% 97%)', zIndex:0 }} />
      ) : null)}
      {todayX !== null && (
        <div style={{ position:'absolute', top:0, bottom:0, left:todayX, width:2, background:'hsl(0 62% 52%)', opacity:0.7, zIndex:2, pointerEvents:'none' }} />
      )}
    </>
  }

  const ROW_COLORS: Record<string, { bg: string; leftBg: string; border: string }> = {
    honza: { bg: '#fffdf9', leftBg: '#f5f0e8', border: '#ede8e0' },
    lucka: { bg: '#fdf8fd', leftBg: '#f0e8f0', border: '#e8dfe8' },
    plan:  { bg: '#f8fdf8', leftBg: '#e8f0e8', border: '#dde8dd' },
  }

  function PersonRow({ rowKey, label }: { rowKey: string; label: string }) {
    const rowEvents = udalosti.filter(u => u.person === rowKey)
    const rc = ROW_COLORS[rowKey] ?? ROW_COLORS.plan

    const handleBgClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect   = e.currentTarget.getBoundingClientRect()
      const colIdx = Math.floor((e.clientX - rect.left) / colW)
      if (colIdx < 0 || colIdx >= cols.length) return
      setModal({ person: rowKey, date_start: ds(cols[colIdx].date) })
    }

    return (
      <div style={{ display:'flex', borderBottom:`1px solid ${rc.border}`, minHeight:ROW_H }}>
        {/* Levý panel */}
        <div style={{
          width:LEFT_W, flexShrink:0, position:'sticky', left:0, zIndex:3,
          background:rc.leftBg, borderRight:`1px solid ${rc.border}`,
          display:'flex', alignItems:'center', paddingLeft:16, gap:8,
        }}>
          <div style={{ width:4, height:32, borderRadius:2, background:ROWS.find(r=>r.key===rowKey)?.defaultColor??'#999', flexShrink:0 }} />
          <span className="font-hand" style={{ fontSize:'1.2rem', color:'hsl(25 30% 14%)' }}>{label}</span>
        </div>

        {/* Timeline */}
        <div style={{ width:totalW, flexShrink:0, position:'relative', minHeight:ROW_H, cursor:'crosshair', background:rc.bg }}
          onClick={handleBgClick}>
          <ColBg />
          {rowEvents.map(u => {
            const geom = eventGeom(u)
            if (!geom) return null
            const cl = Math.max(0, geom.left)
            const cw = Math.min(geom.width - Math.max(0, -geom.left), totalW - cl)
            if (cw <= 0) return null
            const narrow = cw < 52
            const typInfo = TYPY.find(t => t.key === u.typ)
            return (
              <div key={u.id} title={`${typInfo ? typInfo.icon + ' ' : ''}${u.nazev}${u.note ? ` · ${u.note}` : ''}`}
                style={{
                  position:'absolute', top:10, height:ROW_H-20,
                  left:cl, width:cw,
                  background:u.barva, borderRadius:8, zIndex:1,
                  display:'flex', alignItems: narrow ? 'center' : 'flex-start',
                  paddingLeft: narrow ? 0 : 8, paddingRight: narrow ? 0 : 6,
                  paddingTop: narrow ? 0 : 6,
                  justifyContent: narrow ? 'center' : 'flex-start',
                  overflow:'hidden', cursor:'pointer',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
                  border:'1.5px solid rgba(255,255,255,0.4)',
                }}
                onClick={e => { e.stopPropagation(); setModal({ person:u.person, udalost:u }) }}>
                {narrow ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                    <span style={{ fontSize:'0.58rem', color:'#fff', fontWeight:700, textShadow:'0 1px 3px rgba(0,0,0,0.4)', lineHeight:1.1 }}>●</span>
                    {typInfo && <span style={{ fontSize:'0.65rem', lineHeight:1 }}>{typInfo.icon}</span>}
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:2, overflow:'hidden' }}>
                    <span style={{
                      fontSize:'0.7rem', color:'#fff',
                      fontFamily:'var(--font-notes)', fontWeight:600,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      textShadow:'0 1px 3px rgba(0,0,0,0.45)',
                      lineHeight:1.2,
                    }}>
                      {u.nazev}
                    </span>
                    {typInfo && (
                      <span style={{ fontSize:'0.7rem', lineHeight:1 }}>{typInfo.icon} <span style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.85)', fontFamily:'var(--font-notes)' }}>{typInfo.label}</span></span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Header />

      {/* Controls */}
      <div style={{ padding:'10px 20px', borderBottom:'1px solid #e8e4df', background:'#fff', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', flexShrink:0 }}>
        <h1 className="font-hand" style={{ fontSize:'1.6rem', color:'hsl(25 30% 14%)', marginRight:4 }}>Plán</h1>

        <div style={{ flex:1 }} />

        {/* Days span */}
        <div className="flex items-center gap-1.5">
          <input type="number" min={15} max={365} value={daysSpan ?? ''} placeholder="dní"
            onChange={e => {
              const v = e.target.value === '' ? null : Math.max(15, Math.min(365, parseInt(e.target.value) || 15))
              setDaysSpan(v)
            }}
            className="font-notes text-xs text-center rounded-xl outline-none"
            style={{ width:58, padding:'6px 8px', border:'1px solid #e0dbd4', background:daysSpan?'hsl(25 30% 15%)':'#f9f7f4', color:daysSpan?'hsl(40 35% 95%)':'hsl(25 30% 14%)' }} />
          <span className="font-notes text-xs" style={{ color:'hsl(25 15% 52%)' }}>dní</span>
        </div>

        {/* View switcher */}
        <div className="flex rounded-xl overflow-hidden" style={{ border:'1px solid #e0dbd4' }}>
          {(['days','weeks','months'] as const).map((v, i) => (
            <button key={v} onClick={() => setView(v)}
              className="font-notes text-xs px-3 py-2 transition-colors"
              style={{ background:view===v?'hsl(25 30% 15%)':'#f9f7f4', color:view===v?'hsl(40 35% 95%)':'hsl(25 30% 15%)', borderRight:i<2?'1px solid #e0dbd4':undefined }}>
              {v==='days'?'Dny':v==='weeks'?'Týdny':'Měsíce'}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background:'#f0ede8', color:'hsl(25 30% 15%)', fontSize:'1.1rem' }}>‹</button>
          <span className="font-hand capitalize" style={{ fontSize:'0.95rem', color:'hsl(25 30% 14%)', minWidth:130, textAlign:'center' }}>{navLabel}</span>
          <button onClick={() => navigate(1)} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background:'#f0ede8', color:'hsl(25 30% 15%)', fontSize:'1.1rem' }}>›</button>
          <button onClick={() => setSel(new Date())} className="font-notes text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background:'#f0ede8', color:'hsl(25 30% 15%)', border:'1px solid #e0dbd4' }}>Dnes</button>
        </div>

        <button onClick={() => setModal({ person:'honza', date_start:TODAY })}
          className="font-notes text-sm px-3 py-2 rounded-xl"
          style={{ background:'hsl(25 30% 15%)', color:'hsl(40 35% 95%)' }}>
          + Nová událost
        </button>
      </div>

      {/* Gantt */}
      <div style={{ flex:1, overflow:'auto' }}>
        <div style={{ minWidth:LEFT_W + totalW }}>

          {/* Sticky header */}
          <div style={{ position:'sticky', top:0, zIndex:10, background:'#fff', borderBottom:'2px solid #e0dbd4' }}>
            {/* Měsíce */}
            <div style={{ display:'flex', borderBottom:'1px solid #e8e4df' }}>
              <div style={{ width:LEFT_W, flexShrink:0, position:'sticky', left:0, zIndex:11, background:'#fff', borderRight:'1px solid #e8e4df', minHeight:24 }} />
              <div style={{ display:'flex', width:totalW, flexShrink:0 }}>
                {monthGroups.map((g, i) => (
                  <div key={i} style={{ width:g.count*colW, flexShrink:0, borderLeft:i>0?'2px solid #c8c0b8':'1px solid #e8e4df', padding:'3px 8px' }}>
                    <span className="font-notes" style={{ fontSize:'0.72rem', color:'hsl(25 15% 42%)', fontWeight:600, letterSpacing:'0.03em' }}>
                      {g.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sloupce */}
            <div style={{ display:'flex' }}>
              <div style={{ width:LEFT_W, flexShrink:0, position:'sticky', left:0, zIndex:11, background:'#fff', borderRight:'1px solid #e8e4df', padding:'6px 12px 6px 16px', display:'flex', alignItems:'center' }}>
                <span className="font-notes text-xs uppercase tracking-wider" style={{ color:'hsl(25 15% 52%)' }}>Kdo</span>
              </div>
              <div style={{ display:'flex', position:'relative', width:totalW, flexShrink:0 }}>
                {cols.map((col, ci) => (
                  <div key={ci} style={{ width:colW, flexShrink:0, borderLeft:'1px solid #e8e4df', background:col.isToday?'hsl(38 80% 93%)':col.isWeekend?'#f7f5f2':'transparent', textAlign:'center', padding:'5px 2px' }}>
                    <span className="font-notes" style={{ fontSize:view==='days'?'0.68rem':'0.75rem', color:col.isToday?'hsl(25 30% 14%)':'hsl(25 15% 50%)', fontWeight:col.isToday?700:400 }}>
                      {col.label}
                    </span>
                  </div>
                ))}
                {todayX !== null && <div style={{ position:'absolute', top:0, bottom:0, left:todayX, width:2, background:'hsl(0 62% 52%)', zIndex:2, pointerEvents:'none' }} />}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="font-notes" style={{ color:'hsl(25 15% 52%)' }}>Načítám...</p>
            </div>
          ) : (
            ROWS.map(row => <PersonRow key={row.key} rowKey={row.key} label={row.label} />)
          )}
        </div>
      </div>

      {modal && (
        <UdalostModal
          init={modal}
          onClose={() => setModal(null)}
          onSaved={loadData}
          onDeleted={loadData}
        />
      )}
    </div>
  )
}
