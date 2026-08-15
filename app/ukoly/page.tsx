'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'
import AddTaskModal from '@/components/AddTaskModal'

interface Task {
  id: string; person: string; nazev: string; poznamka: string | null
  status: string; priorita: string; projekt_id: string | null
  due_date: string | null; planned_date: string | null; planned_start: string | null
  estimate_minutes: number | null; completed_at: string | null
  pinned: boolean; order_idx: number; archived: boolean; created_at: string
}
interface Projekt {
  id: string; person: string; nazev: string; emoji: string | null; barva: string | null; status: string; typ?: string | null; rok?: number | null
}

type View = 'days' | 'weeks' | 'months'

const LEFT_W = 460
const ROW_H  = 36

const COL_W: Record<View, number> = { days: 38, weeks: 90, months: 110 }
const COL_N: Record<View, number> = { days: 28, weeks: 13, months: 12 }

const BARVY = ['#6b8cba','#e8a87c','#7bc57e','#f5c642','#c47bb5','#e87c7c','#87c0bf','#b0ac9e']
const CIL_CLR: Record<string, string> = { 'todo':'#b0ac9e', 'in-progress':'#e8a87c', 'done':'#7bc57e' }

const STATUS_CYCLE: Record<string,string> = { todo:'in-progress','in-progress':'done',done:'todo' }
const STATUS_LABEL: Record<string,string> = { todo:'Todo','in-progress':'Probíhá',done:'Hotovo' }
const STATUS_BG:    Record<string,string> = { todo:'hsl(38 70% 88%)','in-progress':'hsl(210 55% 86%)',done:'hsl(145 38% 86%)' }
const STATUS_CLR:   Record<string,string> = { todo:'hsl(38 80% 28%)','in-progress':'hsl(210 55% 28%)',done:'hsl(145 45% 25%)' }
const PRI_CLR:      Record<string,string> = { none:'#c4bdb4',low:'hsl(210 55% 58%)',medium:'hsl(38 80% 52%)',high:'hsl(0 62% 52%)' }

// ── date utilities ─────────────────────────────────────────
function addDays(d: Date, n: number)    { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) }
function addMonths(d: Date, n: number)  { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function monday(d: Date) { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); r.setDate(r.getDate() - ((r.getDay()+6)%7)); return r }
function ds(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

const CS_D  = ['Ne','Po','Út','St','Čt','Pá','So']
const CS_MS = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro']
const CS_ML = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec']
const TODAY  = ds(new Date())

interface Col { date: Date; label: string; key: string; isToday: boolean; isWeekend: boolean }

function getRangeStart(sel: Date, view: View): Date {
  if (view === 'days')   return monday(addMonths(sel, 0))   // monday of 1st day of current month
  if (view === 'weeks')  return monday(new Date(sel.getFullYear(), sel.getMonth(), 1))
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
      date = new Date(start.getFullYear(), i, 1)
      label = CS_MS[i]
    }
    return { date, label, key: ds(date), isToday: ds(date) === TODAY, isWeekend }
  })
}

function diffUnits(from: Date, to: Date, unit: 'day'|'week'|'month'): number {
  if (unit === 'day')   return Math.round((to.getTime() - from.getTime()) / 86400000)
  if (unit === 'week')  return Math.round((to.getTime() - from.getTime()) / (86400000 * 7))
  return (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth()
}

// ── Add Project Modal ──────────────────────────────────────
function AddProjModal({ supabase, onClose, onSaved }: {
  supabase: ReturnType<typeof createClient>
  onClose: () => void
  onSaved: () => void
}) {
  const [nazev, setNazev] = useState('')
  const [emoji, setEmoji] = useState('')
  const [barva, setBarva] = useState(BARVY[0])
  const [saving, setSaving] = useState(false)

  const INPUT: React.CSSProperties = { border:'1px solid hsl(30 25% 80%)', background:'#f9f7f4', borderRadius:12, padding:'10px 12px', fontFamily:'var(--font-notes)', fontSize:'0.9rem', color:'hsl(25 30% 15%)', outline:'none' }

  const save = async () => {
    if (!nazev.trim()) return
    setSaving(true)
    const { data: maxData } = await supabase.from('ukoly_projekty').select('order_idx').order('order_idx', { ascending: false }).limit(1)
    const maxOrder = (maxData?.[0]?.order_idx as number | undefined) ?? -1
    await supabase.from('ukoly_projekty').insert({ nazev: nazev.trim(), emoji: emoji || null, barva, status: 'active', order_idx: maxOrder + 1 })
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background:'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-sm"
        style={{ background:'#fff', border:'1px solid #e0dbd4' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom:'1px solid #f0ede8' }}>
          <h2 className="font-hand" style={{ fontSize:'1.8rem', color:'hsl(25 30% 15%)' }}>Nový projekt</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:'#f0ede8', color:'hsl(25 30% 15%)' }}>✕</button>
        </div>
        <div className="px-6 py-4 flex flex-col gap-4">
          <div className="flex gap-2">
            <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🎯" maxLength={4}
              style={{ ...INPUT, width:64, padding:'10px 8px', textAlign:'center', fontSize:'1.2rem' }} />
            <input value={nazev} onChange={e => setNazev(e.target.value)} placeholder="Název projektu" autoFocus
              onKeyDown={e => e.key === 'Enter' && save()}
              style={{ ...INPUT, flex:1 }} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {BARVY.map(b => (
              <button key={b} onClick={() => setBarva(b)}
                style={{ width:24, height:24, borderRadius:12, background:b, border:'none', cursor:'pointer', outline:barva===b?'2px solid hsl(25 30% 15%)':'2px solid transparent', outlineOffset:2 }} />
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-notes text-sm"
              style={{ border:'1px solid #e0dbd4', background:'#f9f7f4', color:'hsl(25 30% 15%)' }}>Zrušit</button>
            <button onClick={save} disabled={!nazev.trim() || saving} className="flex-1 py-2.5 rounded-xl font-notes text-sm"
              style={{ background: nazev.trim() ? 'hsl(25 30% 15%)' : '#ccc', color:'hsl(40 35% 95%)' }}>
              {saving ? '...' : 'Vytvořit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────
export default function UkolyPage() {
  const supabase = createClient()

  const [allTasks,    setAllTasks]    = useState<Task[]>([])
  const [projekty,    setProjekty]    = useState<Projekt[]>([])
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState<View>('weeks')
  const [sel,         setSel]         = useState(() => new Date())
  const [showAdd,     setShowAdd]     = useState(false)
  const [showAddProj, setShowAddProj] = useState(false)
  const [editTask,    setEditTask]    = useState<Task | null>(null)
  const [showHonza,   setShowHonza]   = useState(true)
  const [showLucka,   setShowLucka]   = useState(true)
  const [showCile,    setShowCile]    = useState(true)
  const [daysSpan,    setDaysSpan]    = useState<number | null>(null) // null = dynamic 1 month
  const [userId,      setUserId]      = useState('')
  const [collapsed,   setCollapsed]   = useState<Set<string>>(new Set())
  const [noProjOpen,  setNoProjOpen]  = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id ?? 'default'; setUserId(uid)
      try {
        const f = JSON.parse(localStorage.getItem(`ukoly-g-${uid}`) ?? '{}')
        if (typeof f.honza === 'boolean') setShowHonza(f.honza)
        if (typeof f.lucka === 'boolean') setShowLucka(f.lucka)
        if (typeof f.cile === 'boolean') setShowCile(f.cile)
        if (f.view) setView(f.view as View)
        if (typeof f.daysSpan === 'number' || f.daysSpan === null) setDaysSpan(f.daysSpan)
      } catch {}
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const savePrefs = useCallback((h: boolean, l: boolean, v: View, c: boolean, ds: number | null = daysSpan) => {
    if (!userId) return
    localStorage.setItem(`ukoly-g-${userId}`, JSON.stringify({ honza: h, lucka: l, view: v, cile: c, daysSpan: ds }))
  }, [userId, daysSpan])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('ukoly').select('*').eq('archived', false).order('order_idx'),
      supabase.from('ukoly_projekty').select('*').order('order_idx'),
    ])
    setAllTasks(t ?? []); setProjekty(p ?? []); setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  const persons = useMemo(() => { const s = new Set<string>(); if (showHonza) s.add('honza'); if (showLucka) s.add('lucka'); return s }, [showHonza, showLucka])
  const fx = useMemo(() => allTasks.filter(t => persons.has(t.person)), [allTasks, persons])

  const unit: ('day'|'week'|'month') = view === 'days' ? 'day' : view === 'weeks' ? 'week' : 'month'
  const rangeStart = useMemo(() => {
    if (view === 'days' && daysSpan !== null) return addDays(sel, -2)
    return getRangeStart(sel, view)
  }, [sel, view, daysSpan])
  const cols = useMemo(() => {
    if (view === 'days') {
      const n = daysSpan !== null ? daysSpan : (() => {
        const lastDay = new Date(sel.getFullYear(), sel.getMonth() + 1, 0)
        return Math.ceil((lastDay.getTime() - rangeStart.getTime()) / 86400000) + 1
      })()
      return buildCols(rangeStart, view, n)
    }
    return buildCols(rangeStart, view)
  }, [rangeStart, view, sel, daysSpan])
  const colW = COL_W[view]
  const totalW = cols.length * colW

  // Month groupings for the header row
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
    const diff = diffUnits(rangeStart, today, unit)
    if (diff < 0 || diff >= cols.length) return null
    const frac = unit === 'day' ? (today.getHours() + today.getMinutes() / 60) / 24 : 0
    return diff * colW + frac * colW
  }, [rangeStart, unit, colW, cols.length])

  const navigate = (dir: 1 | -1) => setSel(prev => {
    if (view === 'months') return new Date(prev.getFullYear() + dir, 0, 1)
    return addMonths(prev, dir) // both days and weeks navigate by month
  })

  const navLabel = useMemo(() => {
    if (view === 'months') return String(sel.getFullYear())
    return `${CS_ML[sel.getMonth()]} ${sel.getFullYear()}`
  }, [view, sel])

  const toggleStatus = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    const ns = STATUS_CYCLE[task.status] ?? 'todo'
    const completed_at = ns === 'done' ? new Date().toISOString() : null
    setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: ns, completed_at } : t))
    await supabase.from('ukoly').update({ status: ns, completed_at }).eq('id', task.id)
  }

  const openEdit = (task: Task) => { setEditTask(task); setShowAdd(true) }
  const toggleCollapse = (id: string) => setCollapsed(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  const barGeom = (task: Task): { left: number; width: number } | null => {
    const startDate = task.planned_date ? new Date(task.planned_date + 'T00:00:00') :
                      task.due_date     ? new Date(task.due_date     + 'T00:00:00') : null
    if (!startDate) return null
    const left = diffUnits(rangeStart, startDate, unit) * colW
    let width = colW
    if (task.due_date && task.planned_date && task.due_date !== task.planned_date) {
      const dur = diffUnits(new Date(task.planned_date + 'T00:00:00'), new Date(task.due_date + 'T00:00:00'), unit)
      width = Math.max(colW, dur * colW)
    } else if (task.estimate_minutes && unit === 'day') {
      width = Math.max(colW, Math.ceil(task.estimate_minutes / 480) * colW)
    }
    return { left, width }
  }

  const projColor = (p: Projekt | undefined) => {
    if (p?.typ === 'rocni_cil') return CIL_CLR[p.status] ?? '#b0ac9e'
    return p?.barva ?? '#8299ba'
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

  function TaskRow({ task, projObj }: { task: Task; projObj: Projekt | undefined }) {
    const done     = task.status === 'done'
    const geom     = barGeom(task)
    const barColor = projColor(projObj)
    const inRange  = geom ? (geom.left + geom.width > 0 && geom.left < totalW) : false

    return (
      <div
        style={{ display:'flex', borderBottom:'1px solid #f5f2ef', minHeight:ROW_H, background:'#fff', cursor:'pointer' }}
        className="group hover:bg-stone-50 transition-colors"
        onClick={() => openEdit(task)}>

        <div style={{ width:LEFT_W, flexShrink:0, position:'sticky', left:0, zIndex:3, background:'inherit', borderRight:'1px solid #e8e4df', display:'flex', alignItems:'center', paddingLeft:28 }}>
          <div style={{ width:8, height:8, borderRadius:4, background:PRI_CLR[task.priorita]??'#c4bdb4', flexShrink:0, marginRight:10 }} />
          <div className="flex-1 min-w-0 font-notes truncate pr-2"
            style={{ fontSize:'0.85rem', color:done?'hsl(25 15% 55%)':'hsl(25 30% 14%)', textDecoration:done?'line-through':'none' }}>
            {task.pinned && <span style={{ marginRight:4, fontSize:'0.7rem' }}>📌</span>}
            {task.nazev}
          </div>
          <div style={{ width:28, flexShrink:0, textAlign:'center', fontSize:'0.85rem' }}>{task.person==='honza'?'🧔':'👩'}</div>
          <div style={{ width:90, flexShrink:0, paddingRight:8, display:'flex', justifyContent:'flex-end' }}>
            <button onClick={e => toggleStatus(task, e)}
              className="font-notes px-2 py-0.5 rounded-full whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ fontSize:'0.68rem', background:STATUS_BG[task.status]??'#f0ede8', color:STATUS_CLR[task.status]??'hsl(25 30% 15%)', border:'none', cursor:'pointer' }}>
              {STATUS_LABEL[task.status] ?? task.status}
            </button>
          </div>
        </div>

        <div style={{ width:totalW, flexShrink:0, position:'relative', minHeight:ROW_H }}>
          <ColBg />
          {geom && inRange && (
            <div style={{
              position:'absolute', top:7, height:ROW_H-14,
              left: Math.max(0, geom.left),
              width: Math.min(geom.width, totalW - Math.max(0, geom.left)),
              background: barColor, borderRadius:5,
              opacity: done ? 0.3 : 0.82, zIndex:1,
              display:'flex', alignItems:'center', paddingLeft:6, overflow:'hidden',
            }}>
              {geom.width > 60 && (
                <span style={{ fontSize:'0.68rem', color:'#fff', fontFamily:'var(--font-notes)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {task.nazev}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  function ProjRow({ proj, tasks }: { proj: Projekt; tasks: Task[] }) {
    const isCollapsed = collapsed.has(proj.id)
    const doneCount   = tasks.filter(t => t.status === 'done').length
    const barColor    = projColor(proj)
    const isCil       = proj.typ === 'rocni_cil'
    const rowBg       = isCil ? 'hsl(38 25% 95%)' : '#f7f5f2'

    const dates     = tasks.flatMap(t => [t.planned_date, t.due_date]).filter(Boolean) as string[]
    const spanStart = dates.length ? new Date(Math.min(...dates.map(d => new Date(d+'T00:00:00').getTime()))) : null
    const spanEnd   = dates.length ? new Date(Math.max(...dates.map(d => new Date(d+'T00:00:00').getTime()))) : null
    const spanLeft  = spanStart ? diffUnits(rangeStart, spanStart, unit) * colW : null
    const spanWidth = spanStart && spanEnd ? Math.max(colW, diffUnits(spanStart, spanEnd, unit) * colW) : colW

    return (
      <div>
        <div
          style={{ display:'flex', borderBottom:'1px solid #e8e4df', minHeight:40, background:rowBg, cursor:'pointer' }}
          className="hover:bg-stone-100/70 transition-colors"
          onClick={() => toggleCollapse(proj.id)}>

          <div style={{ width:LEFT_W, flexShrink:0, position:'sticky', left:0, zIndex:3, background:'inherit', borderRight:'1px solid #e8e4df', display:'flex', alignItems:'center', paddingLeft:12, gap:8 }}>
            <span style={{ fontSize:'0.7rem', color:'hsl(25 15% 50%)', userSelect:'none' }}>{isCollapsed ? '▶' : '▼'}</span>
            <div style={{ width:10, height:10, borderRadius:5, background:barColor, flexShrink:0 }} />
            <span className="font-hand" style={{ fontSize:'1.05rem', color:'hsl(25 30% 14%)', flex:1, minWidth:0 }}>
              {isCil ? '🎯 ' : (proj.emoji ? `${proj.emoji} ` : '')}{proj.nazev}
            </span>
            {isCil && proj.rok && (
              <span className="font-notes" style={{ fontSize:'0.65rem', color:'hsl(25 15% 52%)', background:'hsl(38 50% 88%)', borderRadius:4, padding:'1px 5px', flexShrink:0 }}>
                {proj.rok}
              </span>
            )}
            <span className="font-notes" style={{ fontSize:'0.7rem', color:'hsl(25 15% 52%)', flexShrink:0, paddingRight:8 }}>
              {doneCount}/{tasks.length}
            </span>
          </div>

          <div style={{ width:totalW, flexShrink:0, position:'relative', minHeight:40 }}>
            <ColBg />
            {spanLeft !== null && spanLeft < totalW && spanLeft + spanWidth > 0 && (
              <div style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', left:Math.max(0, spanLeft), width:Math.min(spanWidth, totalW - Math.max(0, spanLeft)), height:6, background:barColor, borderRadius:3, opacity:0.45, zIndex:1 }} />
            )}
          </div>
        </div>
        {!isCollapsed && tasks.map(t => <TaskRow key={t.id} task={t} projObj={proj} />)}
      </div>
    )
  }

  const sortTasks = (arr: Task[]) => [...arr].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.order_idx - b.order_idx)
  const aktivniProjekty = projekty.filter(p => p.typ !== 'rocni_cil' && p.status === 'active')
  const cileProjekty    = projekty.filter(p => p.typ === 'rocni_cil')
  const visibleProjekty = [...aktivniProjekty, ...(showCile ? cileProjekty : [])]
  const noProj = sortTasks(fx.filter(t => !t.projekt_id))

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Header />

      {/* Controls */}
      <div style={{ padding:'10px 20px', borderBottom:'1px solid #e8e4df', background:'#fff', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', flexShrink:0 }}>
        <h1 className="font-hand" style={{ fontSize:'1.6rem', color:'hsl(25 30% 14%)', marginRight:4 }}>Úkoly</h1>
        <div className="flex gap-4">
          {[
            { key:'honza', lbl:'🧔 Honza', val:showHonza, fn:(v:boolean) => { setShowHonza(v); savePrefs(v, showLucka, view, showCile) } },
            { key:'lucka', lbl:'👩 Lucka',  val:showLucka, fn:(v:boolean) => { setShowLucka(v); savePrefs(showHonza, v, view, showCile) } },
            { key:'cile',  lbl:'🎯 Cíle',   val:showCile,  fn:(v:boolean) => { setShowCile(v);  savePrefs(showHonza, showLucka, view, v) } },
          ].map(({ key, lbl, val, fn }) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none"
              style={{ fontFamily:'var(--font-notes)', fontSize:'0.82rem', color:'hsl(25 30% 14%)' }}>
              <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} style={{ width:14, height:14 }} />
              {lbl}
            </label>
          ))}
        </div>

        <div style={{ flex:1 }} />

        {/* View switcher */}
        <div className="flex rounded-xl overflow-hidden" style={{ border:'1px solid #e0dbd4' }}>
          {(['days','weeks','months'] as const).map((v, i) => (
            <button key={v} onClick={() => { setView(v); savePrefs(showHonza, showLucka, v, showCile) }}
              className="font-notes text-xs px-3 py-2 transition-colors"
              style={{ background:view===v?'hsl(25 30% 15%)':'#f9f7f4', color:view===v?'hsl(40 35% 95%)':'hsl(25 30% 15%)', borderRight:i<2?'1px solid #e0dbd4':undefined }}>
              {v==='days'?'Dny':v==='weeks'?'Týdny':'Měsíce'}
            </button>
          ))}
        </div>

        {/* Days span input — only in days view */}
        {view === 'days' && (
          <div className="flex items-center gap-1.5">
            <input
              type="number" min={15} max={365}
              value={daysSpan ?? ''}
              placeholder="dní"
              onChange={e => {
                const v = e.target.value === '' ? null : Math.max(15, Math.min(365, parseInt(e.target.value) || 15))
                setDaysSpan(v); setSel(new Date()); savePrefs(showHonza, showLucka, view, showCile, v)
              }}
              className="font-notes text-xs text-center rounded-xl outline-none"
              style={{ width: 58, padding: '6px 8px', border: '1px solid #e0dbd4', background: daysSpan ? 'hsl(25 30% 15%)' : '#f9f7f4', color: daysSpan ? 'hsl(40 35% 95%)' : 'hsl(25 30% 14%)' }}
            />
            <span className="font-notes text-xs" style={{ color: 'hsl(25 15% 52%)' }}>dní</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background:'#f0ede8', color:'hsl(25 30% 15%)', fontSize:'1.1rem', fontFamily:'var(--font-notes)' }}>‹</button>
          <span className="font-hand capitalize" style={{ fontSize:'0.95rem', color:'hsl(25 30% 14%)', minWidth:130, textAlign:'center' }}>{navLabel}</span>
          <button onClick={() => navigate(1)}  className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background:'#f0ede8', color:'hsl(25 30% 15%)', fontSize:'1.1rem', fontFamily:'var(--font-notes)' }}>›</button>
          <button onClick={() => setSel(new Date())} className="font-notes text-xs px-2.5 py-1.5 rounded-lg" style={{ background:'#f0ede8', color:'hsl(25 30% 15%)', border:'1px solid #e0dbd4' }}>Dnes</button>
        </div>

        {/* Action buttons */}
        <button onClick={() => setShowAddProj(true)}
          className="font-notes text-sm px-3 py-2 rounded-xl"
          style={{ background:'#f0ede8', color:'hsl(25 30% 14%)', border:'1px solid #e0dbd4' }}>
          + Nový projekt
        </button>
        <button onClick={() => { setEditTask(null); setShowAdd(true) }}
          className="font-notes text-sm px-3 py-2 rounded-xl"
          style={{ background:'hsl(25 30% 15%)', color:'hsl(40 35% 95%)' }}>
          + Nový úkol
        </button>
      </div>

      {/* Gantt */}
      <div style={{ flex:1, overflow:'auto' }}>
        <div style={{ minWidth:LEFT_W + totalW }}>

          {/* Sticky header */}
          <div style={{ position:'sticky', top:0, zIndex:10, background:'#fff', borderBottom:'2px solid #e0dbd4' }}>

            {/* Month grouping row */}
            <div style={{ display:'flex', borderBottom:'1px solid #e8e4df' }}>
              <div style={{ width:LEFT_W, flexShrink:0, position:'sticky', left:0, zIndex:11, background:'#fff', borderRight:'1px solid #e8e4df', minHeight:24 }} />
              <div style={{ display:'flex', width:totalW, flexShrink:0 }}>
                {monthGroups.map((g, i) => (
                  <div key={i} style={{ width:g.count * colW, flexShrink:0, borderLeft: i > 0 ? '2px solid #c8c0b8' : '1px solid #e8e4df', padding:'3px 8px' }}>
                    <span className="font-notes" style={{ fontSize:'0.72rem', color:'hsl(25 15% 42%)', fontWeight:600, letterSpacing:'0.03em' }}>
                      {g.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column labels row */}
            <div style={{ display:'flex' }}>
              <div style={{ width:LEFT_W, flexShrink:0, position:'sticky', left:0, zIndex:11, background:'#fff', borderRight:'1px solid #e8e4df', display:'flex', alignItems:'center', padding:'6px 12px 6px 28px' }}>
                <span className="font-notes text-xs uppercase tracking-wider flex-1" style={{ color:'hsl(25 15% 52%)' }}>Název</span>
                <span className="font-notes text-xs" style={{ color:'hsl(25 15% 52%)', width:28, textAlign:'center' }}>👤</span>
                <span className="font-notes text-xs uppercase tracking-wider" style={{ color:'hsl(25 15% 52%)', width:90, textAlign:'right', paddingRight:8 }}>Status</span>
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

          {loading && (
            <div className="flex items-center justify-center py-20">
              <p className="font-notes" style={{ color:'hsl(25 15% 52%)' }}>Načítám...</p>
            </div>
          )}

          {!loading && visibleProjekty.map(proj => {
            const tasks = sortTasks(fx.filter(t => t.projekt_id === proj.id))
            if (tasks.length === 0) return null
            return <ProjRow key={proj.id} proj={proj} tasks={tasks} />
          })}

          {!loading && noProj.length > 0 && (
            <div>
              <div
                style={{ display:'flex', borderBottom:'1px solid #e8e4df', minHeight:40, background:'#f7f5f2', cursor:'pointer' }}
                className="hover:bg-stone-100/70 transition-colors"
                onClick={() => setNoProjOpen(o => !o)}>
                <div style={{ width:LEFT_W, flexShrink:0, position:'sticky', left:0, zIndex:3, background:'inherit', borderRight:'1px solid #e8e4df', display:'flex', alignItems:'center', paddingLeft:12, gap:8 }}>
                  <span style={{ fontSize:'0.7rem', color:'hsl(25 15% 50%)' }}>{noProjOpen ? '▼' : '▶'}</span>
                  <span className="font-hand" style={{ fontSize:'1.05rem', color:'hsl(25 30% 14%)' }}>Bez projektu</span>
                  <span className="font-notes" style={{ fontSize:'0.7rem', color:'hsl(25 15% 52%)', paddingRight:8 }}>{noProj.length}</span>
                </div>
                <div style={{ width:totalW, flexShrink:0, position:'relative', minHeight:40 }}><ColBg /></div>
              </div>
              {noProjOpen && noProj.map(t => <TaskRow key={t.id} task={t} projObj={undefined} />)}
            </div>
          )}

          {!loading && fx.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24">
              <p className="font-hand" style={{ fontSize:'1.6rem', color:'hsl(25 15% 55%)' }}>Zatím žádné úkoly</p>
              <p className="font-notes text-sm mt-2" style={{ color:'hsl(25 15% 65%)' }}>Přidej první přes „+ Nový úkol"</p>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddTaskModal
          projekty={projekty.filter(p => p.status === 'active')}
          editTask={editTask}
          defaultDate={ds(sel)}
          onClose={() => { setShowAdd(false); setEditTask(null) }}
          onSaved={loadData}
        />
      )}

      {showAddProj && (
        <AddProjModal
          supabase={supabase}
          onClose={() => setShowAddProj(false)}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
