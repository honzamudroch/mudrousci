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
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
  onTasksChanged: () => void
}

const STATUS = {
  'todo':        { label: 'Plánováno', color: 'hsl(25 15% 50%)',  bg: 'hsl(25 10% 92%)'  },
  'in-progress': { label: 'Probíhá',  color: 'hsl(38 80% 38%)',  bg: 'hsl(38 80% 93%)'  },
  'done':        { label: 'Hotovo ✓', color: 'hsl(145 45% 32%)', bg: 'hsl(145 40% 91%)' },
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

export default function GoalDetailModal({ goal, tasks, onClose, onEdit, onDeleted, onTasksChanged }: Props) {
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}>
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden relative"
        style={{ border: '1px solid #e0e0e0', background: '#fff' }}
        onClick={e => e.stopPropagation()}>

        {/* Zavřít */}
        <button onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center font-notes text-lg"
          style={{ background: '#f0f0f0', color: 'hsl(25 15% 50%)' }}>✕</button>

        <div className="flex h-full" style={{ maxHeight: '88vh' }}>

          {/* Levý sloupec — info */}
          <div className="flex flex-col p-5 gap-3 overflow-y-auto" style={{ width: 240, minWidth: 200, borderRight: '1px solid #f0f0f0' }}>
            {goal.image_url ? (
              <div style={{ borderRadius: 10, overflow: 'hidden', background: 'hsl(38 35% 93%)', aspectRatio: '1/1' }}>
                <img src={goal.image_url} alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8, mixBlendMode: 'multiply' }} />
              </div>
            ) : (
              <div style={{ borderRadius: 10, background: 'hsl(38 35% 93%)', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                🎯
              </div>
            )}

            <span className="font-notes text-xs px-2.5 py-1 rounded-full self-start"
              style={{ background: s.bg, color: s.color }}>
              {s.label}
            </span>

            <h3 className="font-hand leading-tight" style={{ fontSize: '1.7rem', color: 'hsl(25 30% 15%)' }}>
              {goal.title}
            </h3>

            {goal.description && (
              <p className="font-notes text-sm leading-relaxed" style={{ color: 'hsl(25 20% 42%)' }}>
                {goal.description}
              </p>
            )}

            <div className="flex gap-2 mt-auto pt-2">
              <button onClick={() => { onClose(); onEdit() }}
                className="flex-1 py-2 rounded-xl font-notes text-sm"
                style={{ border: '1px solid #e0e0e0', background: '#f9f9f9', color: 'hsl(25 30% 15%)' }}>
                Upravit
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="flex-1 py-2 rounded-xl font-notes text-sm"
                style={{ border: '1px solid #fca5a5', background: '#fff5f5', color: 'hsl(0 60% 48%)' }}>
                Smazat
              </button>
            </div>
          </div>

          {/* Pravý sloupec — úkoly */}
          <div className="flex-1 flex flex-col p-5 min-w-0 overflow-y-auto">
            <h4 className="font-notes text-xs uppercase tracking-widest mb-3"
              style={{ color: 'hsl(25 15% 55%)' }}>
              Úkoly
            </h4>

            {/* Hlavička */}
            <div className="grid gap-3 pb-2 mb-1" style={{
              gridTemplateColumns: '1fr auto auto auto',
              borderBottom: '1px solid #f0f0f0',
            }}>
              {['Název', 'Deadline', 'Stav', ''].map((h, i) => (
                <span key={i} className="font-notes text-xs uppercase tracking-widest"
                  style={{ color: 'hsl(25 15% 60%)', textAlign: i > 0 ? 'right' : 'left' }}>
                  {h}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-1 flex-1">
              {tasks.length === 0 && !addingTask && (
                <p className="font-notes text-sm py-6 text-center" style={{ color: 'hsl(25 15% 65%)' }}>
                  Zatím žádné úkoly
                </p>
              )}
              {tasks.map(task => {
                const isDone = task.status === 'done'
                const isIP = task.status === 'in-progress'
                const dl = daysLeft(task.deadline)
                return (
                  <div key={task.id}
                    className="grid items-center px-2 py-1.5 rounded-lg gap-3"
                    style={{
                      gridTemplateColumns: '1fr auto auto auto',
                      background: isDone ? 'hsl(145 40% 91%)' : isIP ? 'hsl(38 80% 96%)' : 'transparent',
                      transition: 'background 0.2s',
                    }}>
                    <span className="font-notes text-sm truncate" style={{
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
                      className="font-notes text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap"
                      style={{
                        background: isDone ? 'hsl(145 40% 84%)' : isIP ? 'hsl(38 80% 88%)' : '#f0f0f0',
                        color: isDone ? 'hsl(145 45% 30%)' : isIP ? 'hsl(38 80% 35%)' : 'hsl(25 15% 55%)',
                        border: 'none', cursor: 'pointer',
                      }}>
                      {isDone ? 'Hotovo' : isIP ? 'Probíhá' : 'Todo'}
                    </button>
                    <button onClick={() => deleteTask(task.id)}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-30 hover:opacity-90 transition-opacity"
                      style={{ background: '#fca5a5', color: 'hsl(0 60% 45%)' }}>✕</button>
                  </div>
                )
              })}
            </div>

            {/* Přidat podcíl */}
            {addingTask ? (
              <div className="flex flex-col gap-2 pt-3 mt-2" style={{ borderTop: '1px solid #f0f0f0' }}>
                <input
                  type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="Název úkoly…"
                  className="w-full px-3 py-2 rounded-xl font-notes text-sm outline-none"
                  style={{ background: '#f9f9f9', border: '1px solid hsl(30 25% 80%)', color: 'hsl(25 30% 15%)' }}
                  autoFocus onKeyDown={e => e.key === 'Enter' && addTask()}
                />
                <div className="flex gap-2">
                  <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl font-notes text-sm outline-none"
                    style={{ background: '#f9f9f9', border: '1px solid hsl(30 25% 80%)', color: 'hsl(25 30% 15%)' }} />
                  <button onClick={addTask}
                    className="px-4 py-2 rounded-xl font-notes text-sm"
                    style={{ background: 'hsl(25 30% 15%)', color: 'hsl(40 35% 95%)' }}>Přidat</button>
                  <button onClick={() => setAddingTask(false)}
                    className="px-3 py-2 rounded-xl font-notes text-sm"
                    style={{ background: '#f0f0f0', color: 'hsl(25 15% 50%)' }}>Zrušit</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingTask(true)}
                className="mt-3 font-notes text-sm py-2 rounded-xl"
                style={{ border: '1px dashed hsl(30 25% 75%)', color: 'hsl(25 15% 55%)', background: 'transparent' }}>
                + přidat úkol
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Potvrzení smazání */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] px-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => e.stopPropagation()}>
          <div className="paper-card rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center"
            style={{ border: '1px solid #e0e0e0', background: '#fff' }}>
            <p className="font-hand mb-2" style={{ fontSize: '1.6rem', color: 'hsl(25 30% 15%)' }}>Smazat cíl?</p>
            <p className="font-notes text-sm mb-6" style={{ color: 'hsl(25 15% 50%)' }}>
              „{goal.title}" a všechny jeho úkoly budou smazány.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl font-notes text-sm"
                style={{ border: '1px solid #e0e0e0', background: '#f9f9f9', color: 'hsl(25 30% 15%)' }}>
                Zrušit
              </button>
              <button onClick={async () => {
                await supabase.from('goals').delete().eq('id', goal.id)
                onDeleted(); onClose()
              }}
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
