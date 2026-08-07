'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'
import AddHabitModal from '@/components/AddHabitModal'
import ManageCategoriesModal from '@/components/ManageCategoriesModal'

interface Category { id: string; name: string; color: string; icon: string; order_idx: number }
interface Habit {
  id: string; person: 'honza' | 'lucka'; category_id: string | null
  title: string; times_per_day: number; emoji: string | null
  order_idx: number; archived: boolean
}
interface HabitLog { id: string; habit_id: string; date: string; completed_count: number }

const MONTH_CS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec']
const DAY_CS = ['Po','Út','St','Čt','Pá','So','Ne']

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

const TODAY = toDateStr(new Date())

export default function NavykyPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [showAdd, setShowAdd] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const from90 = new Date()
    from90.setDate(from90.getDate() - 90)
    const lastDay = new Date(calMonth.year, calMonth.month + 1, 0)

    const [{ data: catsData }, { data: habitsData }, { data: logsData }] = await Promise.all([
      supabase.from('habit_categories').select('*').order('order_idx'),
      supabase.from('habits').select('*').eq('archived', false).order('order_idx'),
      supabase.from('habit_logs').select('*')
        .gte('date', toDateStr(from90))
        .lte('date', toDateStr(lastDay)),
    ])
    setCategories(catsData ?? [])
    setHabits(habitsData ?? [])
    setLogs(logsData ?? [])
    setLoading(false)
  }, [calMonth])

  useEffect(() => { loadData() }, [loadData])

  const getLog = (habitId: string, date: string) =>
    logs.find(l => l.habit_id === habitId && l.date === date)

  const toggleHabit = async (habit: Habit, date: string) => {
    const existing = getLog(habit.id, date)
    const currentCount = existing?.completed_count ?? 0
    const newCount = currentCount >= habit.times_per_day ? 0 : currentCount + 1

    if (newCount === 0 && existing) {
      await supabase.from('habit_logs').delete().eq('id', existing.id)
      setLogs(prev => prev.filter(l => l.id !== existing.id))
    } else if (existing) {
      await supabase.from('habit_logs').update({ completed_count: newCount }).eq('id', existing.id)
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, completed_count: newCount } : l))
    } else {
      const { data } = await supabase.from('habit_logs')
        .insert({ habit_id: habit.id, date, completed_count: newCount })
        .select().single()
      if (data) setLogs(prev => [...prev, data])
    }
  }

  const getStreak = (habit: Habit): number => {
    let streak = 0
    const d = new Date()
    const todayDone = (() => {
      const l = getLog(habit.id, TODAY)
      return l && l.completed_count >= habit.times_per_day
    })()
    if (!todayDone) d.setDate(d.getDate() - 1)

    for (let i = 0; i < 90; i++) {
      const dateStr = toDateStr(d)
      const log = getLog(habit.id, dateStr)
      if (!log || log.completed_count < habit.times_per_day) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }

  const buildCalendar = () => {
    const { year, month } = calMonth
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    const days: (string | null)[] = []
    for (let i = 0; i < startDow; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(toDateStr(new Date(year, month, d)))
    }
    return days
  }

  const getDayCompletion = (date: string, person: 'honza' | 'lucka') => {
    const personHabits = habits.filter(h => h.person === person)
    if (!personHabits.length) return 0
    const done = personHabits.filter(h => {
      const l = getLog(h.id, date)
      return l && l.completed_count >= h.times_per_day
    }).length
    return done / personHabits.length
  }

  const getMonthSuccess = (person: 'honza' | 'lucka') => {
    const personHabits = habits.filter(h => h.person === person)
    if (!personHabits.length) return null
    const days = calDays.filter(Boolean) as string[]
    if (!days.length) return null
    const total = days.reduce((sum, date) => sum + getDayCompletion(date, person), 0)
    return Math.round(total / days.length * 100)
  }

  const calDays = buildCalendar()
  const honzaHabits = habits.filter(h => h.person === 'honza')
  const luckaHabits = habits.filter(h => h.person === 'lucka')

  const renderColumn = (personHabits: Habit[]) => {
    const grouped: Record<string, Habit[]> = {}
    categories.forEach(c => { grouped[c.id] = [] })
    grouped['__none'] = []
    personHabits.forEach(h => {
      const key = h.category_id && grouped[h.category_id] !== undefined ? h.category_id : '__none'
      grouped[key].push(h)
    })

    return (
      <div className="flex flex-col gap-4">
        {[...categories.map(c => ({ key: c.id, label: c.name, color: c.color, icon: c.icon })),
          { key: '__none', label: '', color: '', icon: '' }]
          .map(({ key, label, color, icon }) => {
            const catHabits = grouped[key] ?? []
            if (!catHabits.length) return null
            return (
              <div key={key}>
                {label && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span style={{ fontSize: '0.85rem' }}>{icon}</span>
                    <span className="font-notes text-xs uppercase tracking-wider" style={{ color }}>
                      {label}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  {catHabits.map(habit => {
                    const log = getLog(habit.id, selectedDate)
                    const count = log?.completed_count ?? 0
                    const done = count >= habit.times_per_day
                    const streak = getStreak(habit)
                    return (
                      <div key={habit.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer select-none"
                        style={{
                          background: done ? 'hsl(145 40% 93%)' : '#f7f7f7',
                          border: `1px solid ${done ? 'hsl(145 40% 76%)' : '#ebebeb'}`,
                          transition: 'all 0.15s',
                        }}
                        onClick={() => toggleHabit(habit, selectedDate)}>
                        {habit.emoji && <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>{habit.emoji}</span>}
                        <span className="font-notes text-sm flex-1 leading-tight" style={{
                          color: done ? 'hsl(145 45% 30%)' : 'hsl(25 30% 15%)',
                        }}>
                          {habit.title}
                        </span>
                        {streak >= 2 && (
                          <span className="font-notes text-xs shrink-0" style={{ color: 'hsl(38 80% 42%)' }}>
                            🔥{streak}
                          </span>
                        )}
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
                          style={{
                            background: done ? 'hsl(145 40% 48%)' : '#e2e2e2',
                            color: done ? '#fff' : 'hsl(25 15% 55%)',
                            fontSize: habit.times_per_day > 1 ? '0.65rem' : '0.9rem',
                            fontFamily: 'var(--font-notes)',
                          }}>
                          {habit.times_per_day > 1 ? `${count}/${habit.times_per_day}` : done ? '✓' : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>
    )
  }

  const selectedDateObj = new Date(selectedDate + 'T12:00:00')
  const isToday = selectedDate === TODAY

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 md:px-8 py-6">

        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <h1 className="font-hand flex-1" style={{ fontSize: '2.8rem', color: 'hsl(25 30% 15%)' }}>
            Návyky
          </h1>
          <button onClick={() => setShowCategories(true)}
            className="font-notes text-sm px-3 py-2 rounded-xl shrink-0"
            style={{ border: '1px solid #e0e0e0', background: '#f9f9f9', color: 'hsl(25 30% 15%)' }}>
            ⚙️ Kategorie
          </button>
          <button onClick={() => { setEditHabit(null); setShowAdd(true) }}
            className="font-hand text-xl px-5 py-2.5 rounded-xl shrink-0"
            style={{ background: 'hsl(25 30% 15%)', color: 'hsl(40 35% 95%)' }}>
            + nový zvyk
          </button>
        </div>

        {/* Vybraný den */}
        <div className="flex items-center gap-2 mb-5">
          <span className="font-hand" style={{ fontSize: '1.5rem', color: 'hsl(25 30% 15%)' }}>
            {isToday ? 'Dnes' : selectedDateObj.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          {!isToday && (
            <button onClick={() => setSelectedDate(TODAY)}
              className="font-notes text-xs px-2.5 py-1 rounded-lg"
              style={{ background: '#f0f0f0', color: 'hsl(25 30% 15%)' }}>
              ← Dnes
            </button>
          )}
        </div>

        {loading && (
          <p className="text-center font-notes mt-12" style={{ color: 'hsl(25 15% 45%)' }}>Načítám…</p>
        )}

        {!loading && (
          <>
            {/* Dva sloupce */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {([
                { person: 'honza' as const, label: '🧔 Honza', personHabits: honzaHabits, dotColor: 'hsl(200 70% 48%)' },
                { person: 'lucka' as const, label: '👩 Lucka', personHabits: luckaHabits, dotColor: 'hsl(330 60% 58%)' },
              ]).map(({ person, label, personHabits, dotColor }) => {
                const doneCnt = personHabits.filter(h => {
                  const l = getLog(h.id, selectedDate)
                  return l && l.completed_count >= h.times_per_day
                }).length
                return (
                  <div key={person} className="paper-card border rounded-2xl p-4" style={{ borderColor: '#e0e0e0' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-hand" style={{ fontSize: '1.35rem', color: 'hsl(25 30% 15%)' }}>{label}</span>
                      {personHabits.length > 0 && (
                        <span className="font-notes text-xs ml-auto px-2 py-0.5 rounded-full"
                          style={{ background: doneCnt === personHabits.length ? 'hsl(145 40% 91%)' : '#f0f0f0',
                            color: doneCnt === personHabits.length ? 'hsl(145 45% 32%)' : 'hsl(25 15% 50%)' }}>
                          {doneCnt}/{personHabits.length}
                        </span>
                      )}
                    </div>
                    {personHabits.length === 0
                      ? <p className="font-notes text-sm text-center py-6" style={{ color: 'hsl(25 15% 60%)' }}>Žádné zvyky</p>
                      : renderColumn(personHabits)}
                  </div>
                )
              })}
            </div>

            {/* Měsíční kalendář */}
            <div className="paper-card border rounded-2xl p-4 mb-5" style={{ borderColor: '#e0e0e0' }}>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() } })}
                  className="w-8 h-8 rounded-full flex items-center justify-center font-notes text-lg"
                  style={{ background: '#f0f0f0', color: 'hsl(25 30% 15%)' }}>‹</button>
                <span className="font-hand flex-1 text-center" style={{ fontSize: '1.4rem', color: 'hsl(25 30% 15%)' }}>
                  {MONTH_CS[calMonth.month]} {calMonth.year}
                </span>
                <button
                  onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() } })}
                  className="w-8 h-8 rounded-full flex items-center justify-center font-notes text-lg"
                  style={{ background: '#f0f0f0', color: 'hsl(25 30% 15%)' }}>›</button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_CS.map(d => (
                  <div key={d} className="text-center font-notes text-xs py-1" style={{ color: 'hsl(25 15% 55%)' }}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calDays.map((date, i) => {
                  if (!date) return <div key={i} />
                  const isSelected = date === selectedDate
                  const isTodayCell = date === TODAY
                  const honzaPct = getDayCompletion(date, 'honza')
                  const luckaPct = getDayCompletion(date, 'lucka')

                  return (
                    <button key={date} onClick={() => setSelectedDate(date)}
                      className="flex flex-col items-center justify-center rounded-xl transition-all py-1.5 gap-0.5"
                      style={{
                        background: isSelected ? 'hsl(25 30% 15%)' : isTodayCell ? 'hsl(25 10% 91%)' : 'transparent',
                        color: isSelected ? '#fff' : 'hsl(25 30% 15%)',
                        minHeight: '2.8rem',
                      }}>
                      <span className="font-notes text-sm leading-none">
                        {new Date(date + 'T12:00:00').getDate()}
                      </span>
                      <div className="flex gap-0.5">
                        {honzaHabits.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full" style={{
                            background: honzaPct >= 1 ? 'hsl(200 70% 52%)' : honzaPct > 0 ? 'hsl(200 55% 76%)' : isSelected ? 'rgba(255,255,255,0.18)' : '#ddd',
                          }} />
                        )}
                        {luckaHabits.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full" style={{
                            background: luckaPct >= 1 ? 'hsl(330 60% 58%)' : luckaPct > 0 ? 'hsl(330 45% 80%)' : isSelected ? 'rgba(255,255,255,0.18)' : '#ddd',
                          }} />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-5 mt-3 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(200 70% 52%)' }} />
                  <span className="font-notes text-xs" style={{ color: 'hsl(25 15% 55%)' }}>Honza</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(330 60% 58%)' }} />
                  <span className="font-notes text-xs" style={{ color: 'hsl(25 15% 55%)' }}>Lucka</span>
                </div>
              </div>
            </div>

            {/* Statistiky */}
            {habits.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: '🧔 Honza dnes', value: `${honzaHabits.filter(h => { const l = getLog(h.id, TODAY); return l && l.completed_count >= h.times_per_day }).length}/${honzaHabits.length}`, sub: 'splněno', color: 'hsl(200 70% 45%)' },
                  { label: '👩 Lucka dnes', value: `${luckaHabits.filter(h => { const l = getLog(h.id, TODAY); return l && l.completed_count >= h.times_per_day }).length}/${luckaHabits.length}`, sub: 'splněno', color: 'hsl(330 60% 55%)' },
                  { label: '🧔 Honza měsíc', value: getMonthSuccess('honza') !== null ? `${getMonthSuccess('honza')}%` : '—', sub: 'úspěšnost', color: 'hsl(200 70% 45%)' },
                  { label: '👩 Lucka měsíc', value: getMonthSuccess('lucka') !== null ? `${getMonthSuccess('lucka')}%` : '—', sub: 'úspěšnost', color: 'hsl(330 60% 55%)' },
                ].map((stat, i) => (
                  <div key={i} className="paper-card border rounded-2xl p-4 text-center" style={{ borderColor: '#e0e0e0' }}>
                    <p className="font-notes text-xs mb-1" style={{ color: 'hsl(25 15% 55%)' }}>{stat.label}</p>
                    <p className="font-hand" style={{ fontSize: '1.9rem', color: stat.color }}>{stat.value}</p>
                    <p className="font-notes text-xs" style={{ color: 'hsl(25 15% 65%)' }}>{stat.sub}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showAdd && (
        <AddHabitModal
          categories={categories}
          editHabit={editHabit}
          onClose={() => { setShowAdd(false); setEditHabit(null) }}
          onSaved={loadData}
        />
      )}
      {showCategories && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setShowCategories(false)}
          onChanged={loadData}
        />
      )}
    </div>
  )
}
