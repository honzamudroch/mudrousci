'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Goal {
  id: string; person: string; year: number; title: string
  description: string | null; image_url: string | null
  status: 'todo' | 'in-progress' | 'done'; order_idx: number
}
interface GoalTask {
  id: string; goal_id: string; title: string
  deadline: string | null; status: 'todo' | 'in-progress' | 'done'; order_idx: number
}
interface Props {
  goal: Goal; tasks: GoalTask[]
  isFirst: boolean; isLast: boolean
  onMove: (dir: 'up' | 'down') => void
  onEdit: () => void; onDeleted: () => void; onTasksChanged: () => void
}

const STATUS = {
  'todo':        { label: 'Plánováno', color: 'hsl(25 15% 50%)',  bg: 'hsl(25 10% 92%)',  border: '#d1c5b8',          imgBg: 'hsl(25 20% 87%)' },
  'in-progress': { label: 'Probíhá',  color: 'hsl(38 80% 38%)',  bg: 'hsl(38 80% 93%)',  border: 'hsl(38 80% 58%)',  imgBg: 'hsl(38 80% 85%)' },
  'done':        { label: 'Hotovo ✓', color: 'hsl(145 45% 32%)', bg: 'hsl(145 40% 91%)', border: 'hsl(145 40% 48%)', imgBg: 'hsl(145 40% 83%)' },
}

const TASK_CYCLE: Record<string, 'todo' | 'in-progress' | 'done'> = {
  'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo',
}

function daysLeft(deadline: string | null): { text: string; overdue: boolean } | null {
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (days < 0) return { text: `po termínu (${Math.abs(days)} d)`, overdue: true }
  if (days === 0) return { text: 'dnes', overdue: false }
  if (days === 1) return { text: 'zítra', overdue: false }
  return { text: `za ${days} dní`, overdue: false }
}

export default function GoalCard({ goal, tasks, isFirst, isLast, onMove, onEdit, onDeleted, onTasksChanged }: Props) {
  const [newTitle, setNewTitle] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const supabase = createClient()
  const s = STATUS[goal.status]

  const addTask = async () => {
    if (!newTitle.trim()) return
    const maxOrder = tasks.reduce((m, t) => Math.max(m, t.order_idx), -1)
    await supabase.from('goal_tasks').insert({
      goal_id: goal.id, title: newTitle.trim(),
      deadline: newDeadline || null, status: 'todo', order_idx: maxOrder + 1,
    })
    setNewTitle(''); setNewDeadline(''); setAddingTask(false)
    onTasksChanged()
  }

  const toggleTask = async (task: GoalTask) => {
    await supabase.from('goal_tasks').update({ status: TASK_CYCLE[task.status] }).eq('id', task.id)
    onTasksChanged()
  }

  const deleteTask = async (id: string) => {
    await supabase.from('goal_tasks').delete().eq('id', id)
    onTasksChanged()
  }

  return (
    <div className="paper-card border" style={{
      borderColor: '#e0e0e0', borderLeft: `5px solid ${s.border}`,
      borderRadius: '12px', overflow: 'hidden', background: '#fff',
    }}>
      <div className="flex items-stretch">

        {/* Obrázek — pevná šířka, celý viditelný */}
        <div style={{
          width: 110, minWidth: 110,
          background: s.imgBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s',
        }}>
          {goal.image_url ? (
            <img src={goal.image_url} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }} />
          ) : (
            <span style={{ fontSize: '2.2rem' }}>🎯</span>
          )}
        </div>

        {/* Info o cíli */}
        <div className="flex flex-col justify-between p-3 gap-1"
          style={{ width: 220, minWidth: 180, borderRight: '1px solid #f0f0f0' }}>
          <div>
            <span className="font-notes text-xs px-2 py-0.5 rounded-full"
              style={{ background: s.bg, color: s.color }}>
              {s.label}
            </span>
            <h3 className="font-hand leading-tight mt-1" style={{ fontSize: '1.35rem', color: 'hsl(25 30% 15%)' }}>
              {goal.title}
            </h3>
            {goal.description && (
              <p className="font-notes text-xs leading-snug mt-0.5 line-clamp-2"
                style={{ color: 'hsl(25 20% 45%)' }}>
                {goal.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <button onClick={onEdit}
              className="font-notes text-xs px-2.5 py-1 rounded-lg"
              style={{ border: '1px solid #e0e0e0', background: '#f9f9f9', color: 'hsl(25 30% 15%)' }}>
              Upravit
            </button>
            <button onClick={() => setConfirmDelete(true)}
              className="font-notes text-xs px-2.5 py-1 rounded-lg"
              style={{ border: '1px solid #fca5a5', background: '#fff5f5', color: 'hsl(0 60% 48%)' }}>
              Smazat
            </button>
            <div className="flex gap-1 ml-auto">
              {!isFirst && (
                <button onClick={() => onMove('up')}
                  className="w-6 h-6 rounded flex items-center justify-center text-xs"
                  style={{ background: '#f0f0f0', color: 'hsl(25 30% 15%)' }}>↑</button>
              )}
              {!isLast && (
                <button onClick={() => onMove('down')}
                  className="w-6 h-6 rounded flex items-center justify-center text-xs"
                  style={{ background: '#f0f0f0', color: 'hsl(25 30% 15%)' }}>↓</button>
              )}
            </div>
          </div>
        </div>

        {/* Podcíle */}
        <div className="flex-1 flex flex-col p-3 gap-0.5 min-w-0" style={{ background: '#fff' }}>
          {/* Hlavička */}
          <div className="grid gap-2 pb-1 mb-0.5" style={{
            gridTemplateColumns: '1fr auto auto auto',
            borderBottom: '1px solid #f0f0f0',
          }}>
            {['Podcíl', 'Deadline', 'Stav', ''].map((h, i) => (
              <span key={i} className="font-notes text-xs uppercase tracking-widest"
                style={{ color: 'hsl(25 15% 60%)', textAlign: i > 0 ? 'right' : 'left' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Řádky */}
          <div className="flex flex-col gap-0.5 flex-1">
            {tasks.length === 0 && !addingTask && (
              <p className="font-notes text-xs py-2 text-center" style={{ color: 'hsl(25 15% 65%)' }}>
                Zatím žádné podcíle
              </p>
            )}
            {tasks.map(task => {
              const isDone = task.status === 'done'
              const isIP = task.status === 'in-progress'
              const dl = daysLeft(task.deadline)
              return (
                <div key={task.id}
                  className="grid items-center px-1.5 py-1 rounded gap-2"
                  style={{
                    gridTemplateColumns: '1fr auto auto auto',
                    background: isDone ? 'hsl(145 40% 91%)' : isIP ? 'hsl(38 80% 96%)' : 'transparent',
                    transition: 'background 0.2s',
                  }}>
                  <span className="font-notes text-xs truncate" style={{
                    color: isDone ? 'hsl(145 45% 30%)' : 'hsl(25 30% 15%)',
                  }}>
                    {task.title}
                  </span>
                  <span className="font-notes text-xs whitespace-nowrap text-right" style={{
                    color: dl?.overdue ? 'hsl(0 65% 50%)' : isDone ? 'hsl(145 35% 45%)' : 'hsl(25 15% 55%)',
                  }}>
                    {dl?.text ?? '—'}
                  </span>
                  <button onClick={() => toggleTask(task)}
                    className="font-notes text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      background: isDone ? 'hsl(145 40% 84%)' : isIP ? 'hsl(38 80% 88%)' : '#f0f0f0',
                      color: isDone ? 'hsl(145 45% 30%)' : isIP ? 'hsl(38 80% 35%)' : 'hsl(25 15% 55%)',
                      border: 'none', cursor: 'pointer',
                    }}>
                    {isDone ? 'Hotovo' : isIP ? 'Probíhá' : 'Todo'}
                  </button>
                  <button onClick={() => deleteTask(task.id)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-xs opacity-30 hover:opacity-90 transition-opacity"
                    style={{ background: '#fca5a5', color: 'hsl(0 60% 45%)' }}>✕</button>
                </div>
              )
            })}
          </div>

          {/* Přidat podcíl */}
          {addingTask ? (
            <div className="flex flex-col gap-1.5 pt-2" style={{ borderTop: '1px solid #f0f0f0' }}>
              <input
                type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Název podcíle…"
                className="w-full px-2.5 py-1.5 rounded-lg font-notes text-xs outline-none"
                style={{ background: '#f9f9f9', border: '1px solid hsl(30 25% 80%)', color: 'hsl(25 30% 15%)' }}
                autoFocus onKeyDown={e => e.key === 'Enter' && addTask()}
              />
              <div className="flex gap-1.5">
                <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg font-notes text-xs outline-none"
                  style={{ background: '#f9f9f9', border: '1px solid hsl(30 25% 80%)', color: 'hsl(25 30% 15%)' }} />
                <button onClick={addTask}
                  className="px-3 py-1.5 rounded-lg font-notes text-xs"
                  style={{ background: 'hsl(25 30% 15%)', color: 'hsl(40 35% 95%)' }}>Přidat</button>
                <button onClick={() => setAddingTask(false)}
                  className="px-2.5 py-1.5 rounded-lg font-notes text-xs"
                  style={{ background: '#f0f0f0', color: 'hsl(25 15% 50%)' }}>Zrušit</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingTask(true)}
              className="mt-1 font-notes text-xs py-1 rounded-lg"
              style={{ border: '1px dashed hsl(30 25% 78%)', color: 'hsl(25 15% 60%)', background: 'transparent' }}>
              + přidat podcíl
            </button>
          )}
        </div>
      </div>

      {/* Potvrzení smazání */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="paper-card rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center"
            style={{ border: '1px solid #e0e0e0', background: '#fff' }}>
            <p className="font-hand mb-2" style={{ fontSize: '1.6rem', color: 'hsl(25 30% 15%)' }}>
              Smazat cíl?
            </p>
            <p className="font-notes text-sm mb-6" style={{ color: 'hsl(25 15% 50%)' }}>
              „{goal.title}" a všechny jeho podcíle budou smazány.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl font-notes text-sm"
                style={{ border: '1px solid #e0e0e0', background: '#f9f9f9', color: 'hsl(25 30% 15%)' }}>
                Zrušit
              </button>
              <button onClick={async () => { await supabase.from('goals').delete().eq('id', goal.id); onDeleted() }}
                className="flex-1 py-2.5 rounded-xl font-notes text-sm"
                style={{ background: 'hsl(0 60% 48%)', color: 'white' }}>
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
