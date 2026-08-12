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

const DAY_CS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const TODAY = toDateStr(new Date())

export default function NavykyPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [showAdd, setShowAdd] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const supabase = createClient()

  // 7 dni aktuálního týdne
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return toDateStr(d)
  })

  const weekLabel = (() => {
    const from = new Date(weekDays[0] + 'T12:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
    const to   = new Date(weekDays[6] + 'T12:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
    return `${from} – ${to}`
  })()

  const loadData = useCallback(async () => {
    const from90 = new Date()
    from90.setDate(from90.getDate() - 90)
    // Načti logy od 90 dní zpět až po konec zobrazeného týdne
    const weekEnd = weekDays[6]

    const [{ data: catsData }, { data: habitsData }, { data: logsData }] = await Promise.all([
      supabase.from('habit_categories').select('*').order('order_idx'),
      supabase.from('habits').select('*').eq('archived', false).order('order_idx'),
      supabase.from('habit_logs').select('*')
        .gte('date', toDateStr(from90))
        .lte('date', weekEnd),
    ])
    setCategories(catsData ?? [])
    setHabits(habitsData ?? [])
    setLogs(logsData ?? [])
    setLoading(false)
  }, [weekStart])

  useEffect(() => { loadData() }, [loadData])

  const getLog = (habitId: string, date: string) =>
    logs.find(l => l.habit_id === habitId && l.date === date)

  const toggleHabit = async (habit: Habit, date: string) => {
    if (date > TODAY) return
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
    const todayDone = (() => { const l = getLog(habit.id, TODAY); return l && l.completed_count >= habit.times_per_day })()
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

  const honzaHabits = habits.filter(h => h.person === 'honza')
  const luckaHabits = habits.filter(h => h.person === 'lucka')

  const renderMatrix = (personHabits: Habit[]) => {
    if (personHabits.length === 0) {
      return (
        <p className="font-notes text-sm py-4 text-center" style={{ color: 'hsl(25 15% 60%)' }}>
          Žádné zvyky — přidej první kliknutím na „+ nový zvyk"
        </p>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
          <colgroup>
            <col style={{ width: 120, maxWidth: 120 }} />
            {weekDays.map((_, i) => <col key={i} style={{ width: 44 }} />)}
            <col style={{ width: 50 }} />
          </colgroup>
          <thead>
            <tr>
              <th />
              {weekDays.map((date, i) => {
                const isToday = date === TODAY
                return (
                  <th key={date} style={{ textAlign: 'center', paddingBottom: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <span className="font-notes" style={{
                        fontSize: '0.7rem', color: isToday ? 'hsl(25 30% 15%)' : 'hsl(25 15% 58%)',
                        fontWeight: isToday ? 700 : 400,
                      }}>{DAY_CS[i]}</span>
                      <span className="font-notes" style={{
                        fontSize: '0.7rem', color: isToday ? 'hsl(25 30% 15%)' : 'hsl(25 15% 68%)',
                        fontWeight: isToday ? 700 : 400,
                      }}>{new Date(date + 'T12:00:00').getDate()}</span>
                    </div>
                  </th>
                )
              })}
              <th style={{ textAlign: 'right', paddingBottom: 8, paddingRight: 4 }}>
                <span className="font-notes" style={{ fontSize: '0.65rem', color: 'hsl(25 15% 60%)' }}>série</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {personHabits.map((habit, idx) => {
              const streak = getStreak(habit)
              return (
                <tr key={habit.id} style={{
                  background: idx % 2 === 0 ? 'transparent' : 'hsl(25 10% 97%)',
                }}>
                  <td style={{ padding: '7px 12px 7px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {habit.emoji && <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{habit.emoji}</span>}
                      <span className="font-notes" style={{
                        fontSize: '0.82rem', color: 'hsl(25 30% 15%)', lineHeight: 1.2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90,
                      }} title={habit.title}>{habit.title}</span>
                    </div>
                  </td>
                  {weekDays.map(date => {
                    const log = getLog(habit.id, date)
                    const count = log?.completed_count ?? 0
                    const done = count >= habit.times_per_day
                    const partial = count > 0 && !done
                    const isToday = date === TODAY
                    const isFuture = date > TODAY

                    return (
                      <td key={date} style={{ textAlign: 'center', padding: '4px 2px' }}>
                        <button
                          onClick={() => toggleHabit(habit, date)}
                          disabled={isFuture}
                          style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: done
                              ? 'hsl(145 40% 48%)'
                              : partial
                                ? 'hsl(38 75% 55%)'
                                : isToday
                                  ? 'hsl(25 15% 88%)'
                                  : '#e8e8e8',
                            border: isToday && !done && !partial ? '2px solid hsl(25 30% 30%)' : '2px solid transparent',
                            cursor: isFuture ? 'default' : 'pointer',
                            opacity: isFuture ? 0.2 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                            flexShrink: 0,
                            margin: '0 auto',
                          }}>
                          {done && <span style={{ color: '#fff', fontSize: '0.75rem', lineHeight: 1 }}>✓</span>}
                          {partial && (
                            <span style={{ color: '#fff', fontSize: '0.6rem', lineHeight: 1, fontFamily: 'var(--font-notes)' }}>
                              {count}/{habit.times_per_day}
                            </span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                  <td style={{ textAlign: 'right', padding: '4px 4px 4px 8px' }}>
                    {streak >= 2
                      ? <span className="font-notes" style={{ fontSize: '0.75rem', color: 'hsl(38 80% 42%)', whiteSpace: 'nowrap' }}>🔥{streak}</span>
                      : <span style={{ color: 'hsl(25 15% 72%)', fontSize: '0.75rem' }}>—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 md:px-8 py-6">

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

        {/* Navigace týdnem */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d })}
            className="w-9 h-9 rounded-full flex items-center justify-center font-notes text-lg shrink-0"
            style={{ background: '#f0f0f0', color: 'hsl(25 30% 15%)' }}>‹</button>
          <span className="font-hand flex-1 text-center" style={{ fontSize: '1.3rem', color: 'hsl(25 30% 15%)' }}>
            {weekLabel}
          </span>
          <button onClick={() => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d })}
            className="w-9 h-9 rounded-full flex items-center justify-center font-notes text-lg shrink-0"
            style={{ background: '#f0f0f0', color: 'hsl(25 30% 15%)' }}>›</button>
          {weekDays[0] !== toDateStr(getWeekStart(new Date())) && (
            <button onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="font-notes text-xs px-2.5 py-1.5 rounded-lg shrink-0"
              style={{ background: '#f0f0f0', color: 'hsl(25 30% 15%)' }}>
              Tento týden
            </button>
          )}
        </div>

        {loading && (
          <p className="text-center font-notes mt-12" style={{ color: 'hsl(25 15% 45%)' }}>Načítám…</p>
        )}

        {!loading && (
          <div className="flex flex-col gap-5">
            {/* Honza */}
            <div className="paper-card border rounded-2xl overflow-hidden" style={{ borderColor: '#e0e0e0' }}>
              <div className="flex items-center gap-2 px-4 pt-4 pb-3"
                style={{ borderBottom: '1px solid #f0f0f0' }}>
                <span className="font-hand" style={{ fontSize: '1.3rem', color: 'hsl(25 30% 15%)' }}>🧔 Honza</span>
                {honzaHabits.length > 0 && (
                  <span className="font-notes text-xs ml-auto"
                    style={{ color: 'hsl(25 15% 55%)' }}>
                    {honzaHabits.filter(h => { const l = getLog(h.id, TODAY); return l && l.completed_count >= h.times_per_day }).length}/{honzaHabits.length} dnes
                  </span>
                )}
              </div>
              <div className="px-4 py-3">
                {renderMatrix(honzaHabits)}
              </div>
            </div>

            {/* Lucka */}
            <div className="paper-card border rounded-2xl overflow-hidden" style={{ borderColor: '#e0e0e0' }}>
              <div className="flex items-center gap-2 px-4 pt-4 pb-3"
                style={{ borderBottom: '1px solid #f0f0f0' }}>
                <span className="font-hand" style={{ fontSize: '1.3rem', color: 'hsl(25 30% 15%)' }}>👩 Lucka</span>
                {luckaHabits.length > 0 && (
                  <span className="font-notes text-xs ml-auto"
                    style={{ color: 'hsl(25 15% 55%)' }}>
                    {luckaHabits.filter(h => { const l = getLog(h.id, TODAY); return l && l.completed_count >= h.times_per_day }).length}/{luckaHabits.length} dnes
                  </span>
                )}
              </div>
              <div className="px-4 py-3">
                {renderMatrix(luckaHabits)}
              </div>
            </div>
          </div>
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
