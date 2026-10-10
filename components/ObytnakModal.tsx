'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase'
import { KAMPANE, OSOBA, type Kampan, type Person, type Vlastnik, type Dostupnost, type Sdileni, type ZdrojRow, type VkladRow } from '@/lib/obytnak'

const INK = 'hsl(25 30% 15%)'
const INPUT: React.CSSProperties = {
  border: '1px solid hsl(30 25% 80%)', background: '#f9f7f4', borderRadius: 12,
  padding: '10px 12px', fontFamily: 'var(--font-notes)', fontSize: '0.95rem',
  color: INK, outline: 'none', width: '100%',
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="font-notes text-xs uppercase tracking-widest" style={{ color: 'hsl(25 15% 55%)' }}>{children}</label>
}

function Prepinac<T extends string>({ value, onChange, volby }: { value: T; onChange: (v: T) => void; volby: { key: T; label: string }[] }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {volby.map(v => (
        <button key={v.key} type="button" onClick={() => onChange(v.key)}
          className="font-notes text-sm px-3 py-1.5 rounded-xl"
          style={{ background: value === v.key ? INK : '#f9f7f4', color: value === v.key ? 'hsl(40 35% 95%)' : 'hsl(25 15% 55%)', border: `1.5px solid ${value === v.key ? INK : '#e0e0e0'}` }}>
          {v.label}
        </button>
      ))}
    </div>
  )
}

// Portál do <body>: karty kampaní jsou natočené (transform), a uvnitř nich by fixed overlay
// pokrýval jen kartu. Klik mimo okno ho NEzavírá, aby se neztratil rozepsaný formulář.
function Obal({ titul, onClose, children }: { titul: string; onClose: () => void; children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="paper-card rounded-2xl shadow-2xl w-full max-w-sm my-auto" style={{ background: '#fff', border: '1px solid #e0dbd4' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #f0ede8' }}>
          <h2 className="font-hand" style={{ fontSize: '1.8rem', color: INK }}>{titul}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f0ede8', color: INK }}>✕</button>
        </div>
        <div className="px-6 py-4 flex flex-col gap-3">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

function Tlacitka({ isEdit, valid, saving, onDelete, onClose, onSave }: { isEdit: boolean; valid: boolean; saving: boolean; onDelete: () => Promise<void>; onClose: () => void; onSave: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false)
  return (
    <div className="flex gap-2 pt-1">
      {isEdit && !confirmDel && (
        <button onClick={() => setConfirmDel(true)} className="py-2.5 px-4 rounded-xl font-notes text-sm" style={{ border: '1px solid #fca5a5', background: '#fff5f5', color: 'hsl(0 60% 48%)' }}>Smazat</button>
      )}
      {isEdit && confirmDel && (
        <button onClick={onDelete} className="py-2.5 px-4 rounded-xl font-notes text-sm" style={{ background: 'hsl(0 60% 48%)', color: 'white' }}>Opravdu?</button>
      )}
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-notes text-sm" style={{ border: '1px solid #e0dbd4', background: '#f9f7f4', color: INK }}>Zrušit</button>
      <button onClick={onSave} disabled={!valid || saving} className="flex-1 py-2.5 rounded-xl font-notes text-sm" style={{ background: valid ? INK : '#ccc', color: 'hsl(40 35% 95%)' }}>
        {saving ? '...' : isEdit ? 'Uložit' : 'Přidat'}
      </button>
    </div>
  )
}

const OSOBY = [{ key: 'honza' as Person, label: OSOBA.honza.label }, { key: 'lucka' as Person, label: OSOBA.lucka.label }]
const VLASTNICI = [...OSOBY, { key: 'spolecny' as Person, label: OSOBA.spolecny.label }] as { key: Vlastnik; label: string }[]

// ── Zdroj financování ─────────────────────────────────────
export function ZdrojModal({ init, me, userId, onClose, onSaved }: {
  init: { zdroj?: ZdrojRow; kampan: Kampan }
  me: Person; userId: string
  onClose: () => void; onSaved: () => void
}) {
  const supabase = createClient()
  const z = init.zdroj
  const [nazev, setNazev] = useState(z?.nazev ?? '')
  const [kampan, setKampan] = useState<Kampan>(z?.kampan ?? init.kampan)
  const [cil, setCil] = useState(z ? String(z.cilova_castka) : '')
  const [person, setPerson] = useState<Vlastnik>(z?.person ?? me)
  const sdileni: Sdileni = 'spolecny' // vždy vidí oba (rozhodnuto 10. 10. 2026)
  const [note, setNote] = useState(z?.note ?? '')
  const [saving, setSaving] = useState(false)

  const cilNum = parseFloat(cil.replace(/\s/g, '').replace(',', '.'))
  const valid = nazev.trim().length > 0 && Number.isFinite(cilNum) && cilNum >= 0

  const save = async () => {
    if (!valid) return
    setSaving(true)
    const payload = { kampan, nazev: nazev.trim(), cilova_castka: cilNum, person, sdileni, note: note.trim() || null }
    if (z) await supabase.from('sporeni_zdroj').update(payload).eq('id', z.id)
    else await supabase.from('sporeni_zdroj').insert({ ...payload, created_by: userId })
    setSaving(false); onSaved(); onClose()
  }
  const remove = async () => {
    await supabase.from('sporeni_zdroj').delete().eq('id', z!.id)
    onSaved(); onClose()
  }

  return (
    <Obal titul={z ? 'Upravit zdroj' : 'Nový zdroj peněz'} onClose={onClose}>
      <div className="flex flex-col gap-1">
        <Label>Název</Label>
        <input value={nazev} onChange={e => setNazev(e.target.value)} placeholder="např. Garáž po babičce" style={INPUT} autoFocus />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Kampaň</Label>
        <Prepinac value={kampan} onChange={setKampan} volby={(['auto', 'rekonstrukce'] as Kampan[]).map(k => ({ key: k, label: KAMPANE[k].nazev }))} />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Kolik z něj má být (Kč)</Label>
        <input value={cil} onChange={e => setCil(e.target.value)} inputMode="numeric" placeholder="100000" style={INPUT} />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Čí zdroj to je</Label>
        <Prepinac value={person} onChange={setPerson} volby={VLASTNICI} />
        {person === 'spolecny' && <p className="font-notes text-xs" style={{ color: 'hsl(25 15% 55%)' }}>Podíly se počítají z jednotlivých vkladů (kdo kolik vložil).</p>}
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Poznámka (volitelné)…" rows={2} style={{ ...INPUT, resize: 'none' }} />
      <Tlacitka isEdit={!!z} valid={valid} saving={saving} onDelete={remove} onClose={onClose} onSave={save} />
    </Obal>
  )
}

// ── Vklad ─────────────────────────────────────────────────
export function VkladModal({ init, me, userId, onClose, onSaved }: {
  init: { vklad?: VkladRow; zdroj: ZdrojRow }
  me: Person; userId: string
  onClose: () => void; onSaved: () => void
}) {
  const supabase = createClient()
  const v = init.vklad
  const today = new Date(); const dnes = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [castka, setCastka] = useState(v ? String(v.castka) : '')
  const [person, setPerson] = useState<Vlastnik>(v?.person ?? me)
  const [dostupnost, setDostupnost] = useState<Dostupnost>(v?.dostupnost ?? 'k_dispozici')
  const [datum, setDatum] = useState(v?.datum ?? dnes)
  const [note, setNote] = useState(v?.note ?? '')
  const [saving, setSaving] = useState(false)

  const castkaNum = parseFloat(castka.replace(/\s/g, '').replace(',', '.'))
  const valid = Number.isFinite(castkaNum) && castkaNum > 0 && !!datum

  const save = async () => {
    if (!valid) return
    setSaving(true)
    const payload = { zdroj_id: init.zdroj.id, person, castka: castkaNum, dostupnost, datum, note: note.trim() || null }
    if (v) await supabase.from('sporeni_vklad').update(payload).eq('id', v.id)
    else await supabase.from('sporeni_vklad').insert({ ...payload, created_by: userId })
    setSaving(false); onSaved(); onClose()
  }
  const remove = async () => {
    await supabase.from('sporeni_vklad').delete().eq('id', v!.id)
    onSaved(); onClose()
  }

  return (
    <Obal titul={v ? 'Upravit vklad' : `Vklad do „${init.zdroj.nazev}“`} onClose={onClose}>
      <div className="flex flex-col gap-1">
        <Label>Částka (Kč)</Label>
        <input value={castka} onChange={e => setCastka(e.target.value)} inputMode="numeric" placeholder="5000" style={INPUT} autoFocus />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Kdo vložil</Label>
        <Prepinac value={person} onChange={setPerson} volby={[...OSOBY, { key: 'spolecny' as Vlastnik, label: 'Oba' }] as { key: Vlastnik; label: string }[]} />
        {person === 'spolecny' && <p className="font-notes text-xs" style={{ color: 'hsl(25 15% 55%)' }}>Počítá se každému napůl.</p>}
      </div>
      <div className="flex flex-col gap-1">
        <Label>Dostupnost</Label>
        <Prepinac value={dostupnost} onChange={setDostupnost} volby={[{ key: 'k_dispozici' as Dostupnost, label: 'K dispozici' }, { key: 'vazane' as Dostupnost, label: 'Na cestě' }]} />
        <p className="font-notes text-xs" style={{ color: 'hsl(25 15% 55%)' }}>
          {dostupnost === 'vazane' ? 'Peníze jsou vydělané, ale zatím na ně nesáhneme (např. zaplacená garáž do prodeje).' : 'Můžeme je kdykoliv použít.'}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Datum</Label>
        <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={INPUT} />
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Poznámka (volitelné)…" rows={2} style={{ ...INPUT, resize: 'none' }} />
      <Tlacitka isEdit={!!v} valid={valid} saving={saving} onDelete={remove} onClose={onClose} onSave={save} />
    </Obal>
  )
}
