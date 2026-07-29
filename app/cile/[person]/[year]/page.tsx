'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'
import GoalDetailModal from '@/components/GoalDetailModal'
import AddGoalModal from '@/components/AddGoalModal'

interface Goal {
  id: string; person: string; year: number; title: string
  description: string | null; image_url: string | null
  status: 'todo' | 'in-progress' | 'done'; order_idx: number
}
interface GoalTask {
  id: string; goal_id: string; title: string
  deadline: string | null; status: 'todo' | 'in-progress' | 'done'; order_idx: number
}

const STATUS_BORDER = {
  'todo':        '#c8b9a8',
  'in-progress': 'hsl(38 80% 55%)',
  'done':        'hsl(145 40% 48%)',
}

const LABELS: Record<string, string> = { honza: 'Honza', lucka: 'Lucka' }

export default function GoalsPage() {
  const params = useParams()
  const router = useRouter()
  const person = params.person as string
  const year = parseInt(params.year as string)

  const [goals, setGoals] = useState<Goal[]>([])
  const [tasks, setTasks] = useState<GoalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const supabase = createClient()

  const loadData = async () => {
    const [{ data: goalsData }, { data: tasksData }] = await Promise.all([
      supabase.from('goals').select('*').eq('person', person).eq('year', year).order('order_idx'),
      supabase.from('goal_tasks').select('*').order('order_idx'),
    ])
    setGoals(goalsData ?? [])
    setTasks(tasksData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const personLabel = LABELS[person] ?? person

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 md:px-8 py-6 md:py-8">

        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <button onClick={() => router.push('/cile')}
            className="font-notes text-sm px-3 py-1.5 rounded-lg shrink-0"
            style={{ background: '#f5f0ea', color: 'hsl(25 30% 15%)' }}>
            ← Zpět
          </button>
          <h1 className="font-hand flex-1 min-w-0" style={{ fontSize: '2.8rem', color: 'hsl(25 30% 15%)' }}>
            {personLabel} — cíle {year}
          </h1>
          <button
            onClick={() => { setEditGoal(null); setShowAddGoal(true) }}
            className="font-hand text-xl px-5 py-2.5 rounded-xl shrink-0"
            style={{ background: 'hsl(25 30% 15%)', color: 'hsl(40 35% 95%)' }}>
            + nový cíl
          </button>
        </div>

        {loading && (
          <p className="text-center font-notes mt-12" style={{ color: 'hsl(25 15% 45%)' }}>
            Načítám cíle…
          </p>
        )}

        {!loading && goals.length === 0 && (
          <div className="mt-24 text-center">
            <p className="font-hand text-3xl" style={{ color: 'hsl(25 30% 15%)' }}>Zatím žádné cíle</p>
            <p className="font-notes mt-2 text-sm" style={{ color: 'hsl(25 15% 45%)' }}>
              Přidej první kliknutím na „+ nový cíl"
            </p>
          </div>
        )}

        {/* Grid dlaždic */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {goals.map(goal => {
            const borderColor = STATUS_BORDER[goal.status]
            return (
              <div
                key={goal.id}
                className="cursor-pointer transition-transform hover:scale-[1.04] hover:-translate-y-0.5"
                style={{
                  border: `3px solid ${borderColor}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
                onClick={() => setSelectedGoal(goal)}
              >
                {/* Obrázek */}
                <div style={{
                  aspectRatio: '1 / 1',
                  background: 'hsl(38 35% 93%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {goal.image_url ? (
                    <img src={goal.image_url} alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }} />
                  ) : (
                    <span style={{ fontSize: '2.5rem' }}>🎯</span>
                  )}
                </div>

                {/* Název */}
                <div className="px-3 py-2.5" style={{ borderTop: `2px solid ${borderColor}20` }}>
                  <p className="font-hand leading-tight" style={{ fontSize: '1.05rem', color: 'hsl(25 30% 15%)' }}>
                    {goal.title}
                  </p>
                  <p className="font-notes text-xs mt-0.5" style={{ color: 'hsl(25 15% 55%)' }}>
                    {tasks.filter(t => t.goal_id === goal.id).length} podcílů
                    {tasks.filter(t => t.goal_id === goal.id && t.status === 'done').length > 0 &&
                      ` · ${tasks.filter(t => t.goal_id === goal.id && t.status === 'done').length} hotovo`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Detail modal */}
      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          tasks={tasks.filter(t => t.goal_id === selectedGoal.id)}
          onClose={() => setSelectedGoal(null)}
          onEdit={() => { setEditGoal(selectedGoal); setShowAddGoal(true); setSelectedGoal(null) }}
          onDeleted={() => { setSelectedGoal(null); loadData() }}
          onTasksChanged={loadData}
        />
      )}

      {showAddGoal && (
        <AddGoalModal
          person={person}
          year={year}
          editGoal={editGoal}
          onClose={() => { setShowAddGoal(false); setEditGoal(null) }}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
