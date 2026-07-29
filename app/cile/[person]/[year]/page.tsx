'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'
import GoalCard from '@/components/GoalCard'
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

const LABELS: Record<string, string> = { honza: 'Honza', lucka: 'Lucka' }

export default function GoalsPage() {
  const params = useParams()
  const router = useRouter()
  const person = params.person as string
  const year = parseInt(params.year as string)

  const [goals, setGoals] = useState<Goal[]>([])
  const [tasks, setTasks] = useState<GoalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const supabase = createClient()

  const loadData = async () => {
    const goalIds = goals.map(g => g.id)
    const [{ data: goalsData }, { data: tasksData }] = await Promise.all([
      supabase.from('goals').select('*').eq('person', person).eq('year', year).order('order_idx'),
      supabase.from('goal_tasks').select('*').order('order_idx'),
    ])
    setGoals(goalsData ?? [])
    setTasks(tasksData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const moveGoal = async (goalId: string, dir: 'up' | 'down') => {
    const idx = goals.findIndex(g => g.id === goalId)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= goals.length) return
    const a = goals[idx], b = goals[swapIdx]
    const updated = [...goals]
    updated[idx] = { ...a, order_idx: b.order_idx }
    updated[swapIdx] = { ...b, order_idx: a.order_idx }
    ;[updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]]
    setGoals(updated)
    await Promise.all([
      supabase.from('goals').update({ order_idx: b.order_idx }).eq('id', a.id),
      supabase.from('goals').update({ order_idx: a.order_idx }).eq('id', b.id),
    ])
  }

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

        <div className="space-y-3">
          {goals.map((goal, i) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              tasks={tasks.filter(t => t.goal_id === goal.id)}
              isFirst={i === 0}
              isLast={i === goals.length - 1}
              onMove={dir => moveGoal(goal.id, dir)}
              onEdit={() => { setEditGoal(goal); setShowAddGoal(true) }}
              onDeleted={loadData}
              onTasksChanged={loadData}
            />
          ))}
        </div>
      </main>

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
