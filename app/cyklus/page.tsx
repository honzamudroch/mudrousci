'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'
import CyklusModal, { type CyklusRow } from '@/components/CyklusModal'
import { spocitej, ds, parse, addDays, diffDays, OBDOBI, type Faze, type Den } from '@/lib/cyklus'
import { OBSAH, VRSTVY, DNY, VETA_ANTIKONCEPCE, POZNAMKA_EVIDENCE, type Vrstva } from '@/lib/cyklus-obsah'

const FAZE_PORADI: Faze[] = ['menstruace', 'folikularni', 'ovulace', 'lutealni']
const CS_MS = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro']
const INK = 'hsl(25 30% 15%)'
const MUTED = 'hsl(25 15% 45%)'

function cz(s: string) { const [, m, d] = s.split('-'); return `${+d}. ${+m}.` }
function czPlus(s: string, nej: number) { return nej ? `${cz(s)} (± ${nej} d)` : cz(s) }

// ── Kolo ──────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg - 90) * Math.PI / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1)
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

function Kolo({ dny, denDnes, faze }: { dny: Den[]; denDnes: number; faze: Faze }) {
  const S = 320, C = 160, R = 118, W = 26
  const n = Math.max(dny.length, 1)
  const seg = 360 / n, gap = Math.min(1.6, seg * 0.18)
  const angle = (i: number) => i * seg
  const [px, py] = polar(C, C, R, angle(denDnes - 1) + seg / 2)

  return (
    <svg viewBox={`0 0 ${S} ${S}`} style={{ width: '100%', maxWidth: 340, display: 'block', margin: '0 auto' }}>
      <defs>
        <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <pattern id="srafy" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="1.4" opacity="0.35" />
        </pattern>
      </defs>
      <g filter="url(#ink)">
        {dny.map((d, i) => (
          <g key={d.date}>
            <path d={arc(C, C, R, angle(i) + gap / 2, angle(i + 1) - gap / 2)}
              stroke={OBDOBI[d.faze].barva} strokeWidth={W} fill="none" strokeLinecap="butt"
              opacity={d.date <= dny[denDnes - 1]?.date ? 1 : 0.55} />
            {d.pravdepodobnost === 'vyssi' && (
              <path d={arc(C, C, R, angle(i) + gap / 2, angle(i + 1) - gap / 2)}
                stroke="url(#srafy)" strokeWidth={W} fill="none" />
            )}
          </g>
        ))}
        <circle cx={C} cy={C} r={R - W / 2 - 4} fill="none" stroke={INK} strokeWidth="1.2" opacity="0.5" />
        <circle cx={C} cy={C} r={R + W / 2 + 4} fill="none" stroke={INK} strokeWidth="1.2" opacity="0.5" />
      </g>
      {/* pin dnes */}
      <line x1={C} y1={C} x2={px} y2={py} stroke={INK} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.5" />
      <circle cx={px} cy={py} r="7" fill="#fff" stroke={INK} strokeWidth="2.5" />
      {/* střed */}
      <text x={C} y={C - 10} textAnchor="middle" fontFamily="var(--font-hand)" fontSize="44" fontWeight="600" fill={INK}>
        Den {denDnes}
      </text>
      <text x={C} y={C + 22} textAnchor="middle" fontFamily="var(--font-notes)" fontSize="15" fill={MUTED}>
        {OBDOBI[faze].label}
      </text>
    </svg>
  )
}

// ── Horizont ──────────────────────────────────────────────
const CS_DNY = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so']

function Horizont({ dny }: { dny: Den[] }) {
  const W = 24, H = 36, TOP = 16 + 18 + 14 // řádek měsíce, číslo dne, den v týdnu
  const mesice: { label: string; x: number }[] = []
  dny.forEach((d, i) => { if (i === 0 || d.date.slice(8) === '01') mesice.push({ label: `${CS_MS[+d.date.slice(5, 7) - 1]} ${d.date.slice(0, 4)}`, x: i * W }) })
  const opac = (k: number) => k === 0 ? 1 : k === 1 ? 0.7 : 0.45

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ position: 'relative', width: dny.length * W, height: TOP + H + 4 }}>
        {mesice.map(m => (
          <div key={m.x}>
            {/* svislá dělicí čára přes celý pás na přelomu měsíce */}
            {m.x > 0 && <div style={{ position: 'absolute', left: m.x - 1.5, top: 14, width: 2, height: TOP + H - 10, background: INK, opacity: 0.55, borderRadius: 1 }} />}
            <span className="font-notes" style={{ position: 'absolute', left: m.x, top: 0, fontSize: '0.75rem', fontWeight: 700, color: INK, whiteSpace: 'nowrap', paddingLeft: 3, lineHeight: '14px' }}>
              {m.label}
            </span>
          </div>
        ))}
        {dny.map((d, i) => {
          const dow = parse(d.date).getDay(), vikend = dow === 0 || dow === 6, jeDnes = i === 0
          return (
            <div key={d.date}
              title={`${cz(d.date)} · ${OBDOBI[d.faze].label} · ${d.pravdepodobnost === 'vyssi' ? 'vyšší' : 'nižší'} pravděpodobnost${d.k ? ` · predikce ± ${d.nejistota} d` : ''}`}
              style={{ position: 'absolute', left: i * W, top: 16, width: W, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="font-notes" style={{
                fontSize: '0.75rem', lineHeight: '18px', width: 18, height: 18, borderRadius: 9, textAlign: 'center',
                background: jeDnes ? INK : 'transparent', color: jeDnes ? 'hsl(40 35% 95%)' : vikend ? MUTED : INK, fontWeight: jeDnes ? 700 : 400,
              }}>{+d.date.slice(8)}</span>
              <span className="font-notes" style={{ fontSize: '0.6rem', lineHeight: '14px', color: MUTED }}>{CS_DNY[dow]}</span>
              <div style={{
                width: W - 3, height: H, marginTop: 2, borderRadius: 3,
                background: OBDOBI[d.faze].barva, opacity: opac(d.k),
                backgroundImage: d.pravdepodobnost === 'vyssi'
                  ? `repeating-linear-gradient(45deg, transparent 0 3px, ${INK}55 3px 4px)` : undefined,
                outline: jeDnes ? `2px solid ${INK}` : undefined, outlineOffset: 1,
              }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Průvodce ──────────────────────────────────────────────
function Pruvodce({ aktualni }: { aktualni: Faze | null }) {
  // undefined = uživatel zatím nic nepřepnul, otevřená je aktuální fáze
  const [override, setOverride] = useState<Faze | null | undefined>(undefined)
  const open = override === undefined ? aktualni : override
  const setOpen = (f: Faze | null) => setOverride(f)
  const [tab, setTab] = useState<Vrstva>('tipy_on')
  const prozivani = VRSTVY.find(v => v.key === 'prozivani')!
  const telo = VRSTVY.find(v => v.key === 'telo')!
  const tipy = VRSTVY.filter(v => v.skupina === 'tipy')

  return (
    <div className="flex flex-col gap-3">
      {FAZE_PORADI.map((f, idx) => {
        const o = OBDOBI[f], je = open === f
        return (
          <div key={f} className="paper-card rounded-2xl" style={{ border: '1px solid #e0dbd4', transform: `rotate(${idx % 2 ? 0.5 : -0.5}deg)` }}>
            <button onClick={() => setOpen(je ? null : f)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
              <span style={{ width: 12, height: 12, borderRadius: 6, background: o.barva, flexShrink: 0 }} />
              <span className="font-hand" style={{ fontSize: '1.5rem', color: INK }}>{o.label}</span>
              <span className="font-notes text-xs" style={{ color: MUTED, marginLeft: 'auto' }}>{DNY[f]} {je ? '▾' : '▸'}</span>
            </button>
            {je && (
              <div className="px-5 pb-5 flex flex-col gap-4">
                <div>
                  <div className="font-notes text-xs uppercase tracking-widest mb-1" style={{ color: MUTED }}>{prozivani.label}</div>
                  <p className="font-body text-sm leading-relaxed" style={{ color: INK }}>{OBSAH[f].prozivani}</p>
                </div>
                <div>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {tipy.map(v => (
                      <button key={v.key} onClick={() => setTab(v.key)}
                        className="font-notes text-xs px-3 py-1.5 rounded-xl"
                        style={{ background: tab === v.key ? INK : '#f9f7f4', color: tab === v.key ? 'hsl(40 35% 95%)' : 'hsl(25 15% 55%)', border: `1.5px solid ${tab === v.key ? INK : '#e0e0e0'}` }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <p className="font-body text-sm leading-relaxed" style={{ color: INK }}>{OBSAH[f][tab]}</p>
                </div>
                <div style={{ borderTop: '1px dashed #e0dbd4', paddingTop: 12 }}>
                  <div className="font-notes text-xs uppercase tracking-widest mb-1" style={{ color: MUTED }}>{telo.label}</div>
                  <p className="font-body text-sm leading-relaxed" style={{ color: INK }}>{OBSAH[f].telo}</p>
                </div>
              </div>
            )}
          </div>
        )
      })}
      <p className="font-notes text-xs px-2" style={{ color: MUTED }}>{POZNAMKA_EVIDENCE}</p>
    </div>
  )
}

// ── Štítek (údaj kolem kola) ──────────────────────────────
function Stitek({ nadpis, hodnota, pozn, barva, rot }: { nadpis: string; hodnota: React.ReactNode; pozn: string; barva: string; rot: number }) {
  return (
    <div className="paper-card rounded-2xl px-5 py-4 flex flex-col gap-1"
      style={{ border: '1px solid #e0dbd4', borderLeft: `6px solid ${barva}`, transform: `rotate(${rot}deg)` }}>
      <span className="font-notes text-xs uppercase tracking-widest" style={{ color: MUTED }}>{nadpis}</span>
      <span className="font-hand leading-none" style={{ fontSize: '2rem', color: INK }}>{hodnota}</span>
      <span className="font-notes text-sm" style={{ color: MUTED }}>{pozn}</span>
    </div>
  )
}

// ── Stránka ───────────────────────────────────────────────
export default function CyklusPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<CyklusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ cyklus?: CyklusRow; date_start?: string } | null>(null)
  const dnes = ds(new Date())

  const loadData = useCallback(async () => {
    const { data } = await supabase.from('cyklus').select('*').order('date_start')
    setRows(data ?? []); setLoading(false)
  }, []) // eslint-disable-line

  // standardní vzor tohoto repa (viz /plan, /navyky): načtení dat v efektu
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [loadData])

  const m = useMemo(() => spocitej(rows, dnes), [rows, dnes])
  const posledni = rows[rows.length - 1]

  const koloDny = useMemo(() => {
    if (!m.aktualni || !m.dalsiZacatek) return []
    const n = Math.max(1, diffDays(m.aktualni.date_start, m.dalsiZacatek))
    const out: Den[] = []
    for (let i = 0; i < n; i++) { const d = m.proDen(addDays(m.aktualni.date_start, i)); if (d) out.push(d) }
    return out
  }, [m])

  const rychlyZapis = async () => {
    if (m.stavTlacitka === 'skoncila' && posledni) await supabase.from('cyklus').update({ date_end: dnes }).eq('id', posledni.id)
    else await supabase.from('cyklus').insert({ person: 'lucka', date_start: dnes, date_end: null })
    loadData()
  }

  const jinyDen = () => setModal(m.stavTlacitka === 'skoncila' && posledni ? { cyklus: posledni } : { date_start: dnes })

  return (
    <div className="min-h-screen" style={{ background: '#fff' }}>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-8">
        <h1 className="font-hand" style={{ fontSize: '2.4rem', color: INK, lineHeight: 1 }}>Můj měsíc</h1>

        {loading ? (
          <p className="font-notes" style={{ color: MUTED }}>Načítám...</p>
        ) : !m.aktualni || !m.faze || !m.denCyklu ? (
          <div className="paper-card rounded-2xl p-6" style={{ border: '1px solid #e0dbd4' }}>
            <p className="font-notes mb-4" style={{ color: INK }}>Zatím žádný záznam. Začni prvním dnem menstruace.</p>
            <button onClick={rychlyZapis} className="font-hand px-6 py-3 rounded-xl" style={{ background: INK, color: 'hsl(40 35% 95%)', fontSize: '1.3rem' }}>Začala dnes</button>
            <button onClick={jinyDen} className="font-notes text-sm ml-4 underline decoration-dotted" style={{ color: MUTED }}>jiný den</button>
          </div>
        ) : (
          <>
            {/* Teď: kolo uprostřed, štítky kolem */}
            {m.pripominka && (
              <div className="rounded-xl px-4 py-3 font-notes text-sm flex items-center justify-between gap-3" style={{ background: 'hsl(48 90% 90%)', border: '1px solid hsl(45 70% 70%)', color: INK }}>
                <span>Predikce říkala {cz(addDays(m.aktualni.date_start, m.prumernaDelka))}. Začala už?</span>
                <button onClick={rychlyZapis} className="font-notes text-xs px-3 py-1.5 rounded-lg" style={{ background: INK, color: 'hsl(40 35% 95%)' }}>Začala dnes</button>
              </div>
            )}
            <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] md:items-center gap-5">
              <div className="order-first md:order-none justify-self-center">
                <Kolo dny={koloDny} denDnes={m.denCyklu} faze={m.faze} />
              </div>

              <div className="flex flex-col gap-4 md:-order-1">
                <Stitek rot={-1.2} barva={OBDOBI[m.faze].barva} nadpis="Fáze"
                  hodnota={OBDOBI[m.faze].label}
                  pozn={`${m.denCyklu}. den z přibližně ${m.prumernaDelka}`} />
                {m.dniDoMenstruace !== null && m.dalsiZacatek && (
                  <Stitek rot={0.8} barva={OBDOBI.menstruace.barva} nadpis="Další menstruace"
                    hodnota={m.dniDoMenstruace === 0 ? 'dnes' : `za ${m.dniDoMenstruace} ${m.dniDoMenstruace === 1 ? 'den' : m.dniDoMenstruace < 5 ? 'dny' : 'dní'}`}
                    pozn={`očekávaný začátek ${czPlus(m.dalsiZacatek, m.dalsiNejistota)}`} />
                )}
              </div>

              <div className="flex flex-col gap-4">
                {m.plodneOkno && m.ovulace && (
                  <Stitek rot={1.1} barva={m.pravdepodobnost === 'vyssi' ? OBDOBI.ovulace.barva : OBDOBI.folikularni.barva} nadpis="Šance na otěhotnění"
                    hodnota={m.pravdepodobnost === 'vyssi' ? 'vyšší' : 'nižší'}
                    pozn={`plodné dny ${cz(m.plodneOkno[0])} až ${cz(m.plodneOkno[1])}, ovulace kolem ${cz(m.ovulace)}`} />
                )}
              </div>
            </div>

            {/* Jak to teď bývá */}
            <div className="paper-card rounded-2xl p-5 flex flex-col gap-2" style={{ border: '1px solid #e0dbd4', transform: 'rotate(-0.4deg)' }}>
              <span className="font-notes text-xs uppercase tracking-widest" style={{ color: MUTED }}>Jak fáze probíhá</span>
              <p className="font-body text-sm leading-relaxed" style={{ color: INK }}>{OBSAH[m.faze].prozivani}</p>
              <p className="font-notes text-xs" style={{ color: MUTED }}>{VETA_ANTIKONCEPCE}</p>
            </div>

            {/* Zápis */}
            <div className="flex items-center gap-4 flex-wrap">
              <button onClick={rychlyZapis} className="font-hand px-6 py-3 rounded-xl" style={{ background: INK, color: 'hsl(40 35% 95%)', fontSize: '1.4rem' }}>
                {m.stavTlacitka === 'skoncila' ? 'Skončila dnes' : 'Začala dnes'}
              </button>
              <button onClick={jinyDen} className="font-notes text-sm underline decoration-dotted" style={{ color: MUTED }}>jiný den</button>
              {m.stavTlacitka === 'skoncila' && <span className="font-notes text-sm" style={{ color: MUTED }}>menstruace probíhá od {cz(posledni.date_start)}</span>}
            </div>

            {/* Horizont */}
            <section className="flex flex-col gap-2">
              <h2 className="font-hand" style={{ fontSize: '1.7rem', color: INK }}>Další 3 měsíce</h2>
              <Horizont dny={m.horizont(92)} />
              <div className="flex gap-3 flex-wrap font-notes text-xs" style={{ color: MUTED }}>
                {FAZE_PORADI.map(f => <span key={f} className="flex items-center gap-1"><span style={{ width: 10, height: 10, background: OBDOBI[f].barva, borderRadius: 2 }} />{OBDOBI[f].label}</span>)}
                <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, background: `repeating-linear-gradient(45deg, #ddd 0 2px, ${INK} 2px 3px)`, borderRadius: 2 }} />plodné okno</span>
              </div>
            </section>

            {/* Průvodce */}
            <section className="flex flex-col gap-3">
              <h2 className="font-hand" style={{ fontSize: '1.7rem', color: INK }}>Průvodce</h2>
              <Pruvodce aktualni={m.faze} />
            </section>

            {/* Zapsané cykly */}
            <section className="flex flex-col gap-2">
              <h2 className="font-hand" style={{ fontSize: '1.7rem', color: INK }}>Zapsané</h2>
              <div className="flex flex-col gap-1.5">
                {[...rows].reverse().map(r => (
                  <button key={r.id} onClick={() => setModal({ cyklus: r })}
                    className="text-left font-notes text-sm px-4 py-2.5 rounded-xl flex items-center justify-between"
                    style={{ background: '#f9f7f4', border: '1px solid #e8e4df', color: INK }}>
                    <span>{cz(r.date_start)} {r.date_end ? `až ${cz(r.date_end)}` : '(probíhá)'}</span>
                    <span style={{ color: MUTED }}>{r.date_end ? `${diffDays(r.date_start, r.date_end) + 1} dní` : ''}{r.note ? ' · ' + r.note : ''}</span>
                  </button>
                ))}
              </div>
              <p className="font-notes text-xs" style={{ color: MUTED }}>
                Průměrná délka cyklu {m.prumernaDelka} dní{rows.length >= 3 ? `, rozptyl ± ${m.rozptyl}` : ' (výchozí, zpřesní se po pár cyklech)'}, menstruace {m.delkaMenstruace} dní.
              </p>
            </section>
          </>
        )}
      </main>

      {modal && <CyklusModal init={modal} onClose={() => setModal(null)} onSaved={loadData} />}
    </div>
  )
}
