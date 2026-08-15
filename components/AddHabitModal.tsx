'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Category { id: string; name: string; color: string; icon: string }
interface Habit {
  id: string; person: 'honza' | 'lucka'; category_id: string | null
  title: string; times_per_day: number; emoji: string | null
  order_idx: number; archived: boolean; frequency_type: 'daily' | 'weekly'
}
interface Props {
  categories: Category[]
  editHabit: Habit | null
  onClose: () => void
  onSaved: () => void
}

const QUICK_EMOJIS = ['💪','🧘','📚','💧','🥗','🏃','😴','🧠','💰','🎯','✍️','🚴','🧹','🌞','🥤','🧴']

export default function AddHabitModal({ categories, editHabit, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(editHabit?.title ?? '')
  const [person, setPerson] = useState<'honza' | 'lucka'>(editHabit?.person ?? 'honza')
  const [categoryId, setCategoryId] = useState(editHabit?.category_id ?? '')
  const [freqType, setFreqType] = useState<'daily' | 'weekly'>(editHabit?.frequency_type ?? 'daily')
  const [target, setTarget] = useState(editHabit?.times_per_day ?? 1)
  const [emoji, setEmoji] = useState(editHabit?.emoji ?? '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const dailyOptions = [1, 2, 3]
  const weeklyOptions = [1, 2, 3, 4, 5, 6, 7]

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    const payload = {
      person, title: title.trim(),
      category_id: categoryId || null,
      times_per_day: target,
      frequency_type: freqType,
      emoji: emoji || null,
    }
    if (editHabit) {
      await supabase.from('habits').update(payload).eq('id', editHabit.id)
    } else {
      const { data: maxData } = await supabase.from('habits').select('order_idx').order('order_idx', { ascending: false }).limit(1)
      const maxOrder = (maxData?.[0]?.order_idx as number | undefined) ?? -1
      await supabase.from('habits').insert({ ...payload, order_idx: maxOrder + 1 })
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-sm p-6"
        style={{ border: '1px solid #e0e0e0', background: '#fff', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-hand" style={{ fontSize: '1.8rem', color: 'hsl(25 30% 15%)' }}>
            {editHabit ? 'Upravit zvyk' : 'Nový zvyk'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#f0f0f0', color: 'hsl(25 30% 15%)' }}>✕</button>
        </div>

        {/* Emoji */}
        <div className="mb-3">
          <label className="font-notes text-xs mb-1.5 block" style={{ color: 'hsl(25 15% 55%)' }}>Emoji</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e === emoji ? '' : e)}
                className="text-xl rounded-lg p-1.5 transition-all"
                style={{ background: emoji === e ? 'hsl(25 10% 86%)' : '#f5f5f5',
                  outline: emoji === e ? '2px solid hsl(25 30% 15%)' : 'none', outlineOffset: 1 }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Název */}
        <div className="mb-3">
          <label className="font-notes text-xs mb-1.5 block" style={{ color: 'hsl(25 15% 55%)' }}>Název</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl font-notes text-sm outline-none"
            style={{ border: '1px solid hsl(30 25% 80%)', background: '#f9f9f9', color: 'hsl(25 30% 15%)' }}
            placeholder="Název zvyku…" autoFocus
            onKeyDown={e => e.key === 'Enter' && save()} />
        </div>

        {/* Pro koho */}
        <div className="mb-3">
          <label className="font-notes text-xs mb-1.5 block" style={{ color: 'hsl(25 15% 55%)' }}>Pro koho</label>
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #e0e0e0' }}>
            {(['honza', 'lucka'] as const).map((p, i) => (
              <button key={p} onClick={() => setPerson(p)}
                className="flex-1 py-2.5 font-notes text-sm transition-colors"
                style={{
                  background: person === p ? 'hsl(25 30% 15%)' : '#f9f9f9',
                  color: person === p ? 'hsl(40 35% 95%)' : 'hsl(25 30% 15%)',
                  borderRight: i === 0 ? '1px solid #e0e0e0' : undefined,
                }}>
                {p === 'honza' ? '🧔 Honza' : '👩 Lucka'}
              </button>
            ))}
          </div>
        </div>

        {/* Kategorie */}
        <div className="mb-3">
          <label className="font-notes text-xs mb-1.5 block" style={{ color: 'hsl(25 15% 55%)' }}>Kategorie</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl font-notes text-sm outline-none appearance-none"
            style={{ border: '1px solid hsl(30 25% 80%)', background: '#f9f9f9', color: 'hsl(25 30% 15%)' }}>
            <option value="">Bez kategorie</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        {/* Frekvence — Denně / Týdně */}
        <div className="mb-3">
          <label className="font-notes text-xs mb-1.5 block" style={{ color: 'hsl(25 15% 55%)' }}>Frekvence</label>
          <div className="flex rounded-xl overflow-hidden mb-2.5" style={{ border: '1px solid #e0e0e0' }}>
            {(['daily', 'weekly'] as const).map((f, i) => (
              <button key={f} onClick={() => { setFreqType(f); setTarget(1) }}
                className="flex-1 py-2.5 font-notes text-sm transition-colors"
                style={{
                  background: freqType === f ? 'hsl(25 30% 15%)' : '#f9f9f9',
                  color: freqType === f ? 'hsl(40 35% 95%)' : 'hsl(25 30% 15%)',
                  borderRight: i === 0 ? '1px solid #e0e0e0' : undefined,
                }}>
                {f === 'daily' ? 'Denně' : 'Týdně'}
              </button>
            ))}
          </div>

          <label className="font-notes text-xs mb-1.5 block" style={{ color: 'hsl(25 15% 55%)' }}>
            {freqType === 'daily' ? 'Kolikrát denně' : 'Kolikrát za týden'}
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {(freqType === 'daily' ? dailyOptions : weeklyOptions).map(n => (
              <button key={n} onClick={() => setTarget(n)}
                className="flex-1 py-2 rounded-xl font-notes text-sm"
                style={{
                  minWidth: 36,
                  background: target === n ? 'hsl(25 30% 15%)' : '#f0f0f0',
                  color: target === n ? 'hsl(40 35% 95%)' : 'hsl(25 30% 15%)',
                }}>
                {n}×
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-notes text-sm"
            style={{ border: '1px solid #e0e0e0', background: '#f9f9f9', color: 'hsl(25 30% 15%)' }}>
            Zrušit
          </button>
          <button onClick={save} disabled={!title.trim() || saving}
            className="flex-1 py-2.5 rounded-xl font-notes text-sm"
            style={{ background: title.trim() ? 'hsl(25 30% 15%)' : '#ccc', color: 'hsl(40 35% 95%)' }}>
            {saving ? '…' : editHabit ? 'Uložit' : 'Přidat'}
          </button>
        </div>
      </div>
    </div>
  )
}
