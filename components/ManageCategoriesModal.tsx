'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Category { id: string; name: string; color: string; icon: string; order_idx: number }
interface Props {
  categories: Category[]
  onClose: () => void
  onChanged: () => void
}

const PRESET_COLORS = [
  'hsl(145 45% 42%)', 'hsl(200 70% 45%)', 'hsl(270 50% 52%)',
  'hsl(45 75% 45%)',  'hsl(0 65% 50%)',   'hsl(25 60% 48%)',
  'hsl(180 50% 42%)', 'hsl(320 60% 52%)',
]

export default function ManageCategoriesModal({ categories, onClose, onChanged }: Props) {
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('⭐')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const addCategory = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.order_idx), -1)
    await supabase.from('habit_categories').insert({
      name: newName.trim(), icon: newIcon, color: newColor, order_idx: maxOrder + 1,
    })
    setNewName('')
    setSaving(false)
    onChanged()
  }

  const deleteCategory = async (id: string) => {
    await supabase.from('habit_categories').delete().eq('id', id)
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-sm p-6"
        style={{ border: '1px solid #e0e0e0', background: '#fff' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-hand" style={{ fontSize: '1.8rem', color: 'hsl(25 30% 15%)' }}>Kategorie</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#f0f0f0', color: 'hsl(25 30% 15%)' }}>✕</button>
        </div>

        {/* Existující */}
        <div className="flex flex-col gap-1.5 mb-4">
          {categories.length === 0 && (
            <p className="font-notes text-sm text-center py-3" style={{ color: 'hsl(25 15% 60%)' }}>Žádné kategorie</p>
          )}
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#f9f9f9', border: '1px solid #ebebeb' }}>
              <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
              <span className="font-notes text-sm flex-1 font-medium" style={{ color: cat.color }}>{cat.name}</span>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
              <button onClick={() => deleteCategory(cat.id)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-40 hover:opacity-90 transition-opacity"
                style={{ background: '#fca5a5', color: 'hsl(0 60% 45%)' }}>✕</button>
            </div>
          ))}
        </div>

        {/* Přidat novou */}
        <div className="rounded-xl p-3 flex flex-col gap-2.5"
          style={{ background: '#f5f0ea', border: '1px solid #e8ddd0' }}>
          <p className="font-notes text-xs font-medium" style={{ color: 'hsl(25 20% 45%)' }}>Nová kategorie</p>
          <div className="flex gap-2">
            <input value={newIcon} onChange={e => setNewIcon(e.target.value)}
              className="w-12 text-center px-1 py-2 rounded-lg font-notes text-lg outline-none"
              style={{ border: '1px solid hsl(30 25% 80%)', background: '#fff' }}
              maxLength={2} />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg font-notes text-sm outline-none"
              style={{ border: '1px solid hsl(30 25% 80%)', background: '#fff', color: 'hsl(25 30% 15%)' }}
              placeholder="Název…"
              onKeyDown={e => e.key === 'Enter' && addCategory()} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className="w-7 h-7 rounded-full transition-all"
                style={{
                  background: c,
                  outline: newColor === c ? `3px solid ${c}` : 'none',
                  outlineOffset: 2,
                  transform: newColor === c ? 'scale(1.15)' : 'scale(1)',
                }} />
            ))}
          </div>
          <button onClick={addCategory} disabled={!newName.trim() || saving}
            className="py-2.5 rounded-xl font-notes text-sm"
            style={{ background: newName.trim() ? 'hsl(25 30% 15%)' : '#ccc', color: 'hsl(40 35% 95%)' }}>
            {saving ? '…' : 'Přidat kategorii'}
          </button>
        </div>
      </div>
    </div>
  )
}
