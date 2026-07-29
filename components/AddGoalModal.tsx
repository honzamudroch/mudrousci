'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { compressImage } from '@/lib/imageUtils'

interface Goal {
  id: string; person: string; year: number; title: string
  description: string | null; image_url: string | null
  status: 'todo' | 'in-progress' | 'done'; order_idx: number
}

interface Props {
  person: string; year: number
  editGoal?: Goal | null
  onClose: () => void; onSaved: () => void
}

const inputCls = "w-full px-4 py-2.5 rounded-xl font-notes text-sm outline-none"
const inputStyle = { background: '#f9f9f9', border: '1px solid hsl(30 25% 80%)', color: 'hsl(25 30% 15%)' }

const STATUS_OPTIONS = [
  { value: 'todo' as const,        label: 'Plánováno', color: 'hsl(25 15% 50%)',  bg: 'hsl(25 10% 92%)' },
  { value: 'in-progress' as const, label: 'Probíhá',  color: 'hsl(38 80% 38%)',  bg: 'hsl(38 80% 93%)' },
  { value: 'done' as const,        label: 'Hotovo ✓', color: 'hsl(145 45% 32%)', bg: 'hsl(145 40% 91%)' },
]

export default function AddGoalModal({ person, year, editGoal, onClose, onSaved }: Props) {
  const isEdit = !!editGoal
  const [title, setTitle] = useState(editGoal?.title ?? '')
  const [description, setDescription] = useState(editGoal?.description ?? '')
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done'>(editGoal?.status ?? 'todo')
  const [imageUrl, setImageUrl] = useState<string | null>(editGoal?.image_url ?? null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      let finalImageUrl = imageUrl
      if (imageFile) {
        const compressed = await compressImage(imageFile)
        const filename = `goal_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
        const { error: storErr } = await supabase.storage.from('photos').upload(filename, compressed)
        if (storErr) throw storErr
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filename)
        finalImageUrl = urlData.publicUrl
      }

      if (isEdit) {
        const { error } = await supabase.from('goals')
          .update({ title, description: description || null, status, image_url: finalImageUrl })
          .eq('id', editGoal!.id)
        if (error) throw error
      } else {
        const { data: existing } = await supabase.from('goals')
          .select('order_idx').eq('person', person).eq('year', year)
          .order('order_idx', { ascending: false }).limit(1)
        const nextOrder = (existing?.[0]?.order_idx ?? -1) + 1
        const { error } = await supabase.from('goals')
          .insert({ person, year, title, description: description || null, status, image_url: finalImageUrl, order_idx: nextOrder })
        if (error) throw error
      }

      setLoading(false)
      onSaved(); onClose()
    } catch (err: any) {
      setLoading(false)
      setError(err?.message ?? 'Neznámá chyba')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-md relative max-h-[90vh] overflow-y-auto"
        style={{ border: '1px solid hsl(30 25% 80%)', background: '#ffffff' }}>

        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center font-notes text-lg"
          style={{ color: 'hsl(25 15% 50%)', background: '#f0f0f0' }}>
          ✕
        </button>

        <div className="p-6">
          <h2 className="font-hand mb-6" style={{ fontSize: '2rem', color: 'hsl(25 30% 15%)' }}>
            {isEdit ? 'Upravit cíl' : 'Nový cíl'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-notes text-xs uppercase tracking-widest mb-1.5"
                style={{ color: 'hsl(25 15% 50%)' }}>Název</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className={inputCls} style={inputStyle} required placeholder="Naučit se španělsky…" />
            </div>

            <div>
              <label className="block font-notes text-xs uppercase tracking-widest mb-1.5"
                style={{ color: 'hsl(25 15% 50%)' }}>Popis</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className={inputCls + ' resize-none'} style={inputStyle}
                placeholder="Proč a jak…" rows={3} />
            </div>

            <div>
              <label className="block font-notes text-xs uppercase tracking-widest mb-1.5"
                style={{ color: 'hsl(25 15% 50%)' }}>Stav</label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                    className="flex-1 py-2 rounded-xl font-notes text-xs transition-all"
                    style={{
                      background: status === opt.value ? opt.bg : '#f9f9f9',
                      color: status === opt.value ? opt.color : 'hsl(25 15% 55%)',
                      border: `1.5px solid ${status === opt.value ? opt.color : '#e0e0e0'}`,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-notes text-xs uppercase tracking-widest mb-1.5"
                style={{ color: 'hsl(25 15% 50%)' }}>Obrázek</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {(imagePreview || imageUrl) ? (
                <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '4/3', background: '#f0f0f0' }}>
                  <img src={imagePreview ?? imageUrl!} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); setImageUrl(null) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center font-notes text-sm"
                    style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>✕</button>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="absolute bottom-2 right-2 font-notes text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>Změnit</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full h-24 rounded-xl font-notes text-sm flex items-center justify-center"
                  style={{ border: '2px dashed hsl(30 25% 75%)', color: 'hsl(25 15% 55%)', background: 'transparent' }}>
                  + Přidat obrázek
                </button>
              )}
            </div>

            {error && (
              <p className="font-notes text-sm" style={{ color: 'hsl(0 60% 48%)' }}>Chyba: {error}</p>
            )}

            <button type="submit" disabled={loading}
              className="mt-1 w-full py-3.5 rounded-xl font-hand text-2xl disabled:opacity-50"
              style={{ background: 'hsl(25 30% 15%)', color: 'hsl(40 35% 95%)' }}>
              {loading ? 'Ukládám…' : isEdit ? 'Uložit změny' : 'Přidat cíl'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
