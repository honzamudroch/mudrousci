'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'
import { ZdrojModal, VkladModal } from '@/components/ObytnakModal'
import {
  spocitejVse, kc, kcKratce, KAMPANE, OSOBA,
  type MilnikRow, type PolozkaRow, type ZdrojRow, type VkladRow, type KampanStav, type ZdrojStav, type Person, type Kampan,
} from '@/lib/obytnak'

const INK = 'hsl(25 30% 15%)'
const MUTED = 'hsl(25 15% 45%)'
const PAPER = 'hsl(38 40% 92%)'
// stejná paleta jako stavy v Cílech
const HOTOVO = 'hsl(145 40% 48%)'
const PROBIHA = 'hsl(38 80% 55%)'
const PROBIHA_SV = 'hsl(38 80% 85%)'
const CEKA = 'hsl(25 20% 87%)'
const SRAFY = `repeating-linear-gradient(45deg, ${PROBIHA} 0 4px, ${PROBIHA_SV} 4px 8px)`

function cz(s: string) { const [, m, d] = s.split('-'); return `${+d}. ${+m}.` }

// ── Ikony milníků: jednoduché čárové kresby, vybírají se podle názvu ──
const IKONY: { klic: RegExp; path: React.ReactNode }[] = [
  { klic: /izolac|okn/i,        path: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="3" y1="12" x2="21" y2="12" /></> },
  { klic: /topen|tepl/i,        path: <path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.5.6-2.6 1.4-3.6.3 1.3 1 2 1.9 2.3C11 8 10.5 5.5 12 3z" /> },
  { klic: /elektr|solár|solar|bater/i, path: <><rect x="3" y="7" width="16" height="10" rx="2" /><line x1="21" y1="10.5" x2="21" y2="13.5" /><path d="M11 9l-2.5 3.5h3L10 15.5" /></> },
  { klic: /vod|koupel|wc|sprch/i, path: <><path d="M6 12V8a4 4 0 0 1 8 0v1" /><path d="M14 8h4" /><path d="M16 8v3" /><path d="M12 12h8" /><path d="M13.5 15v4M16 15v4M18.5 15v4" /></> },
  { klic: /kuchyn|span|postel/i, path: <><path d="M4 11h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3z" /><path d="M2 11h20" /><path d="M9 7c0-1.5 1-1.5 1-3M13 7c0-1.5 1-1.5 1-3" /></> },
  { klic: /exteri|markýz|venk/i, path: <><circle cx="12" cy="12" r="3.5" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></> },
  { klic: /prác|homolog|dokument|stk/i, path: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></> },
  { klic: /dodáv|auto|van/i,    path: <><path d="M3 15V8h11l4 4h2.5v3H3z" /><circle cx="7.5" cy="16.5" r="1.8" /><circle cx="16.5" cy="16.5" r="1.8" /><path d="M14 8v4h4" /></> },
  { klic: /pes|dítě|dite|psa/i, path: <><circle cx="8" cy="8" r="1.8" /><circle cx="16" cy="8" r="1.8" /><circle cx="4.8" cy="12.5" r="1.6" /><circle cx="19.2" cy="12.5" r="1.6" /><path d="M12 11.5c-2.6 0-5 2.4-5 4.6 0 1.6 1.1 2.4 2.4 2.4 1 0 1.7-.5 2.6-.5s1.6.5 2.6.5c1.3 0 2.4-.8 2.4-2.4 0-2.2-2.4-4.6-5-4.6z" /></> },
  { klic: /rezerv/i,            path: <><path d="M5 11a7 5.5 0 0 1 14 0v2a4 4 0 0 1-2 3.5V19h-2.5v-1.5h-5V19H7v-2.5A4 4 0 0 1 5 13z" /><path d="M19 11.5l2 .5v3l-2 .5" /><circle cx="9" cy="10.5" r=".6" /><path d="M11 6.5V4.5h2v2" /></> },
]
function Ikona({ nazev, size = 20 }: { nazev: string; size?: number }) {
  const i = IKONY.find(x => x.klic.test(nazev))
  if (!i) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {i.path}
    </svg>
  )
}

// ── Pruh: k dispozici (zelená) / na cestě (šrafy) / chybí ──
function Pruh({ kDispozici, vazane, cil, vyska = 16, znacky, plan, popisek }: { kDispozici: number; vazane: number; cil: number; vyska?: number; znacky?: number[]; plan?: number; popisek?: string }) {
  const p = (n: number) => cil > 0 ? Math.min(100, n / cil * 100) : 0
  const konec = p(kDispozici + vazane)
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ height: vyska, borderRadius: vyska / 2, background: PAPER, border: `1.5px solid ${INK}`, overflow: 'hidden', position: 'relative' }}>
        {/* plán = kolik pokrývají zdroje (světlý podklad pod skutečností) */}
        {plan !== undefined && <div style={{ position: 'absolute', inset: 0, width: `${p(plan)}%`, background: CEKA, transition: 'width 0.4s' }} />}
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{ width: `${p(kDispozici)}%`, background: HOTOVO, transition: 'width 0.4s' }} />
          <div style={{ width: `${p(vazane)}%`, background: SRAFY, transition: 'width 0.4s' }} />
        </div>
        {/* popisek (procenta) uvnitř pruhu, hned za koncem výplně */}
        {popisek && (
          <div className="font-hand" style={{ position: 'absolute', top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: vyska * 0.62, lineHeight: 1, color: INK, fontWeight: 600, whiteSpace: 'nowrap',
            ...(konec < 82 ? { left: `calc(${konec}% + 10px)` } : { right: 10 }) }}>
            {popisek}
          </div>
        )}
      </div>
      {znacky?.map((z, i) => (
        <div key={i} style={{ position: 'absolute', left: `${p(z)}%`, top: -3, width: 1.5, height: vyska + 6, background: INK, opacity: 0.6, transform: 'translateX(-50%)' }} />
      ))}
    </div>
  )
}

// ── Pruh kampaně: ilustrace na konci výplně, milníky střídavě nad a pod pruhem ──
// Rekonstrukce zatím bez ilustrace, Honza dodá vlastní perokresbu.
const ILUSTRACE: Partial<Record<Kampan, { src: string; width: number }>> = {
  auto: { src: '/11_van_scene_crop.png', width: 84 },
}

type Slot = { nahore: boolean; cx: number } // cx = střed popisku v px (může být posunutý od značky)
const RADA_V = 62 // výška řady popisků

// šířka popisku: na široké obrazovce 100 px, jinak tak, aby se polovina milníků vešla do jedné řady
function sirkaPopisku(sirka: number, pocet: number) {
  const naRadu = Math.max(1, Math.ceil(pocet / 2))
  return Math.max(48, Math.min(100, Math.floor((sirka - (naRadu - 1) * 6) / naRadu)))
}

function PopisekMilniku({ m, x, slot, sirka, LW, onHover }: { m: KampanStav['milniky'][number]; x: number; slot: Slot; sirka: number; LW: number; onHover: (id: string | null) => void }) {
  const uzke = LW < 80
  const barva = m.dosazen ? HOTOVO : INK
  const strana = slot.nahore ? 'bottom' : 'top'
  const xpx = x / 100 * sirka
  // kam čára míří: pokud je značka uvnitř boxu popisku, jde rovně nahoru/dolů (a text se zarovná k ní),
  // jinak šikmo k nejbližšímu okraji boxu
  const levy = slot.cx - LW / 2, pravy = slot.cx + LW / 2
  const cil = Math.min(Math.max(xpx, levy + 6), pravy - 6)
  const poloha = (cil - levy) / LW
  const zarovnani: 'flex-start' | 'center' | 'flex-end' = poloha < 0.3 ? 'flex-start' : poloha > 0.7 ? 'flex-end' : 'center'
  // spojka od pruhu k popisku: jedna šikmá, lehce "ručně" zvlněná tenká čára
  const V = 15, L = Math.min(xpx, cil) - 6, W = Math.abs(cil - xpx) + 12
  const x0 = xpx - L, x1 = cil - L
  const y0 = slot.nahore ? V : 0, y1 = slot.nahore ? 0 : V      // y0 u pruhu, y1 u popisku
  const dx = x1 - x0, dy = y1 - y0, w = dx === 0 ? 1.5 : 2.5
  const d = `M ${x0} ${y0} C ${x0 + dx * 0.25 + w} ${y0 + dy * 0.35}, ${x0 + dx * 0.75 - w} ${y0 + dy * 0.65}, ${x1} ${y1}`
  return (
    <>
      <svg aria-hidden width={W} height={V} viewBox={`0 0 ${W} ${V}`} style={{ position: 'absolute', left: L, [strana]: 0, overflow: 'visible' }}>
        <path d={d} fill="none" stroke={barva} strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
      </svg>
      <button type="button"
        onMouseEnter={() => onHover(m.id)} onMouseLeave={() => onHover(null)} onClick={() => onHover(m.id)}
        className="font-notes flex flex-col"
        style={{ position: 'absolute', left: slot.cx, [strana]: V, transform: 'translateX(-50%)', width: LW, fontSize: uzke ? '0.6rem' : '0.75rem', lineHeight: 1.15,
          color: barva, cursor: 'default', alignItems: zarovnani, textAlign: zarovnani === 'flex-start' ? 'left' : zarovnani === 'flex-end' ? 'right' : 'center',
          flexDirection: slot.nahore ? 'column-reverse' : 'column', background: '#fff', padding: '2px 0', zIndex: 1, overflow: 'visible' }}>
        <Ikona nazev={m.nazev} size={uzke ? 14 : 18} />
        <span style={{ marginTop: slot.nahore ? 0 : 2, marginBottom: slot.nahore ? 2 : 0, borderBottom: `1px dotted ${MUTED}`, whiteSpace: 'nowrap' }}>{m.nazev}</span>
        <span style={{ fontWeight: 700 }}>{kcKratce(m.kumulativne)}</span>
      </button>
    </>
  )
}

// Střídá popisky nad a pod pruh (jedna řada na každé straně) a v řadě je rozestrká do stran,
// aby se nepřekrývaly a nevyjely z pruhu. Šířka popisku se přizpůsobí, aby se řada vždy vešla.
function rozmisti(milniky: KampanStav['milniky'], pct: (n: number) => number, sirka: number, LW: number): Map<string, Slot> {
  const serazene = [...milniky].sort((a, b) => a.kumulativne - b.kumulativne)
  const out = new Map<string, Slot>()
  const MEZERA = LW + 6, MIN = LW / 2, MAX = Math.max(MIN, sirka - LW / 2)
  for (const nahore of [true, false]) {
    const rada = serazene.filter((_, i) => (i % 2 === 0) === nahore)
    const cx = rada.map(m => Math.min(MAX, Math.max(MIN, pct(m.kumulativne) / 100 * sirka)))
    for (let i = 1; i < cx.length; i++) cx[i] = Math.max(cx[i], cx[i - 1] + MEZERA)                       // odstrkat doprava
    for (let i = cx.length - 1; i >= 0; i--) cx[i] = Math.min(cx[i], i === cx.length - 1 ? MAX : cx[i + 1] - MEZERA) // a zpět zleva
    for (let i = 0; i < cx.length; i++) cx[i] = Math.max(cx[i], i === 0 ? MIN : cx[i - 1] + MEZERA)      // nikdy pod levý okraj
    rada.forEach((m, i) => out.set(m.id, { nahore, cx: cx[i] }))
  }
  return out
}

function CestaKampane({ k }: { k: KampanStav }) {
  const [hover, setHover] = useState<string | null>(null)
  const pct = (n: number) => k.cil > 0 ? Math.min(100, n / k.cil * 100) : 0
  const poloha = pct(k.nasetreno)
  const h = k.milniky.find(m => m.id === hover) ?? null
  // jediný milník (třeba Auto) na pruh nepíšeme, stačí procento
  const popisky = k.milniky.length > 1 ? k.milniky : []
  const ref = useRef<HTMLDivElement>(null)
  const [sirka, setSirka] = useState(600)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSirka(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const LW = sirkaPopisku(sirka, popisky.length)
  const sloty = rozmisti(popisky, pct, sirka, LW)
  const radNahore = popisky.some(m => sloty.get(m.id)!.nahore) ? 1 : 0
  const radDole = popisky.some(m => !sloty.get(m.id)!.nahore) ? 1 : 0
  const il = ILUSTRACE[k.key]
  return (
    <div>
      <div className="min-w-0" ref={ref}>
        {/* nad pruhem: ilustrace na konci výplně + popisky v řadách */}
        <div style={{ position: 'relative', height: radNahore ? 15 + radNahore * RADA_V : il ? 56 : 8 }}>
          {popisky.filter(m => sloty.get(m.id)!.nahore).map(m => <PopisekMilniku key={m.id} m={m} x={pct(m.kumulativne)} slot={sloty.get(m.id)!} sirka={sirka} LW={LW} onHover={setHover} />)}
          {il && <img src={il.src} alt="" aria-hidden
            style={{ position: 'absolute', bottom: -1, left: `${poloha}%`, width: il.width, transform: 'translateX(-50%)', transition: 'left 0.4s', pointerEvents: 'none', zIndex: 2 }} />}
        </div>
        <div style={{ position: 'relative' }}>
          <Pruh kDispozici={k.kDispozici} vazane={k.vazane} cil={k.cil} vyska={36} plan={k.planovano} popisek={`${k.procento} %`} />
          {/* pod pruhem: popisky v řadách */}
          <div style={{ position: 'relative', height: radDole ? 15 + radDole * RADA_V : 8 }}>
            {popisky.filter(m => !sloty.get(m.id)!.nahore).map(m => <PopisekMilniku key={m.id} m={m} x={pct(m.kumulativne)} slot={sloty.get(m.id)!} sirka={sirka} LW={LW} onHover={setHover} />)}
          </div>
          {/* popup s informacemi o milníku */}
          {h && (
            <div className="paper-card rounded-xl px-4 py-3 font-notes text-sm"
              style={{ position: 'absolute', top: 30, left: `${pct(h.kumulativne)}%`, transform: `translateX(${pct(h.kumulativne) > 75 ? '-100%' : pct(h.kumulativne) < 25 ? '0' : '-50%'})`,
                width: 320, maxWidth: '90vw', border: '1px solid #e0e0e0', color: INK, zIndex: 5, pointerEvents: 'none' }}>
              <div className="font-hand flex items-center gap-2" style={{ fontSize: '1.4rem', lineHeight: 1.1 }}><Ikona nazev={h.nazev} size={18} />{h.nazev}</div>
              <div style={{ color: MUTED }}>
                {kc(h.castka)} za milník · celkem {kc(h.kumulativne)}
              </div>
              <div style={{ color: h.dosazen ? HOTOVO : INK }}>
                {h.dosazen ? 'Máme našetřeno.' : k.aktualni?.id === h.id ? `Teď šetříme, chybí ${kc(h.kumulativne - k.nasetreno)}.` : `Na řadě později, chybí ${kc(h.kumulativne - k.nasetreno)}.`}
              </div>
              {h.popis && <div className="text-xs mt-1" style={{ color: MUTED }}>{h.popis}</div>}
              {h.polozky.length > 0 && (
                <div className="mt-2 flex flex-col gap-0.5" style={{ borderTop: '1px dashed #e0dbd4', paddingTop: 6 }}>
                  {[...h.polozky].sort((a, b) => b.cena_odhad - a.cena_odhad).map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <span style={{ width: 7, height: 7, borderRadius: 4, flexShrink: 0,
                        background: p.stav === 'Koupeno' || p.stav === 'Hotovo' ? HOTOVO : p.stav === 'Objednano' ? PROBIHA : CEKA }} />
                      <span className="flex-1 truncate">{p.nazev}{p.mnozstvi && p.mnozstvi > 1 ? ` ×${p.mnozstvi}` : ''}</span>
                      <span style={{ color: p.cena_realna != null ? INK : MUTED, whiteSpace: 'nowrap' }}>{kc(p.cena_realna ?? p.cena_odhad)}</span>
                    </div>
                  ))}
                  {h.utraceno > 0 && <div className="text-xs mt-1" style={{ color: MUTED }}>Už utraceno {kc(h.utraceno)}.</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Zdroj financování ─────────────────────────────────────
function ZdrojKarta({ z, onEdit, onVklad, onEditVklad }: { z: ZdrojStav; onEdit: () => void; onVklad: () => void; onEditVklad: (v: VkladRow) => void }) {
  const cil = Number(z.zdroj.cilova_castka)
  const [hoverVklad, setHoverVklad] = useState<string | null>(null)
  return (
    <div className="rounded-xl px-4 py-3 flex flex-col gap-2" style={{ background: '#f9f7f4', border: '1px solid #e8e4df' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span className="font-hand" style={{ fontSize: '1.4rem', color: INK }}>{z.zdroj.nazev}</span>
          <span className="font-notes text-xs" style={{ color: MUTED }}>
            {OSOBA[z.zdroj.person].label}
          </span>
        </div>
        <span className="font-notes text-sm" style={{ color: INK }}><b>{kc(z.nasetreno)}</b> <span style={{ color: MUTED }}>z {kc(cil)}</span></span>
      </div>
      <Pruh kDispozici={z.kDispozici} vazane={z.vazane} cil={cil} vyska={10} />
      <div className="flex items-center gap-2 flex-wrap font-notes text-xs" style={{ color: MUTED }}>
        {z.kDispozici > 0 && <span>k dispozici {kc(z.kDispozici)}</span>}
        {z.vazane > 0 && <span>· na cestě {kc(z.vazane)}</span>}
        {z.chybi > 0 ? <span>· chybí {kc(z.chybi)}</span> : <span>· splněno</span>}
      </div>
      {z.vklady.length > 0 && <div className="flex items-center gap-1.5 flex-wrap">
        {[...z.vklady].sort((a, b) => a.datum < b.datum ? 1 : -1).map(v => (
          <div key={v.id} style={{ position: 'relative' }}
            onMouseEnter={() => setHoverVklad(v.id)} onMouseLeave={() => setHoverVklad(null)}>
            <button onClick={() => onEditVklad(v)}
              className="font-notes text-xs px-2.5 py-1 rounded-lg"
              style={{ background: v.dostupnost === 'vazane' ? PROBIHA_SV : '#fff', border: `1px solid ${v.dostupnost === 'vazane' ? PROBIHA : HOTOVO}`, color: INK }}>
              {v.person === 'spolecny' ? 'Oba' : OSOBA[v.person].label} · {kc(Number(v.castka))} <span style={{ color: MUTED }}>{cz(v.datum)}{v.dostupnost === 'vazane' ? ' · na cestě' : ''}</span>
            </button>
            {hoverVklad === v.id && (
              <div className="paper-card rounded-xl px-4 py-3 font-notes text-sm"
                style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 260, border: '1px solid #e0e0e0', color: INK, zIndex: 5, pointerEvents: 'none' }}>
                <div className="font-hand" style={{ fontSize: '1.3rem', lineHeight: 1.1 }}>{kc(Number(v.castka))}</div>
                <div style={{ color: MUTED }}>
                  {v.person === 'spolecny' ? 'Oba napůl' : OSOBA[v.person].label} · {cz(v.datum)} · {v.dostupnost === 'vazane' ? 'na cestě, zatím nedostupné' : 'k dispozici'}
                </div>
                {v.note && <div className="text-xs mt-1">{v.note}</div>}
                <div className="text-xs mt-1" style={{ color: MUTED }}>Klikni pro úpravu.</div>
              </div>
            )}
          </div>
        ))}
      </div>}
      {z.zdroj.note && <p className="font-notes text-xs" style={{ color: MUTED }}>{z.zdroj.note}</p>}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button onClick={onEdit} title="Upravit zdroj" aria-label="Upravit zdroj"
          className="flex items-center gap-1.5 font-notes text-xs" style={{ color: MUTED }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
          upravit zdroj
        </button>
        <button onClick={onVklad} className="font-notes text-xs px-2.5 py-1 rounded-lg" style={{ background: INK, color: 'hsl(40 35% 95%)' }}>+ vklad</button>
      </div>
    </div>
  )
}

// ── Karta kampaně ─────────────────────────────────────────
function KampanKarta({ k, me, userId, onReload }: { k: KampanStav; me: Person; userId: string; onReload: () => void }) {
  const [modal, setModal] = useState<{ typ: 'zdroj'; zdroj?: ZdrojRow } | { typ: 'vklad'; zdroj: ZdrojRow; vklad?: VkladRow } | null>(null)
  const info = KAMPANE[k.key]
  return (
    <section className="paper-card rounded-2xl p-6 flex flex-col gap-5" style={{ border: '1px solid #e0e0e0' }}>
      <div>
        <h2 className="font-hand" style={{ fontSize: '2.4rem', color: INK, lineHeight: 1 }}>{info.nazev}</h2>
        <p className="font-notes text-sm mt-1" style={{ color: MUTED }}>
          {info.popis} Máme <b style={{ color: INK, fontSize: '1.05rem' }}>{kc(k.nasetreno)}</b> z <b style={{ color: INK }}>{kc(k.cil)}</b>.
          {k.zdroje.length > 0 && <> Zdroje pokrývají <b style={{ color: INK }}>{kc(k.planovano)}</b>{k.planovano < k.cil ? `, nenaplánováno ${kc(k.cil - k.planovano)}` : ', plán pokrývá celý cíl'}.</>}
        </p>
      </div>

      {k.cil > 0 ? <CestaKampane k={k} /> : <p className="font-notes text-sm" style={{ color: MUTED }}>Zatím žádné milníky. Přidej je v Base (entita Milnik).</p>}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="font-notes text-xs uppercase tracking-widest" style={{ color: MUTED }}>Odkud peníze</div>
          <button onClick={() => setModal({ typ: 'zdroj' })} className="font-notes text-xs px-3 py-1.5 rounded-lg" style={{ border: `1.5px solid ${INK}`, color: INK }}>+ nový zdroj</button>
        </div>
        {k.zdroje.length === 0 && <p className="font-notes text-sm" style={{ color: MUTED }}>Zatím žádný zdroj. Přidej třeba spořicí účet, prodej garáže nebo bonus.</p>}
        {k.zdroje.map(z => (
          <ZdrojKarta key={z.zdroj.id} z={z}
            onEdit={() => setModal({ typ: 'zdroj', zdroj: z.zdroj })}
            onVklad={() => setModal({ typ: 'vklad', zdroj: z.zdroj })}
            onEditVklad={v => setModal({ typ: 'vklad', zdroj: z.zdroj, vklad: v })} />
        ))}
      </div>

      {modal?.typ === 'zdroj' && <ZdrojModal init={{ zdroj: modal.zdroj, kampan: k.key }} me={me} userId={userId} onClose={() => setModal(null)} onSaved={onReload} />}
      {modal?.typ === 'vklad' && <VkladModal init={{ vklad: modal.vklad, zdroj: modal.zdroj }} me={me} userId={userId} onClose={() => setModal(null)} onSaved={onReload} />}
    </section>
  )
}

// ── Stránka ───────────────────────────────────────────────
export default function ObytnakPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState('')
  const [me, setMe] = useState<Person>('honza')
  const [milniky, setMilniky] = useState<MilnikRow[]>([])
  const [polozky, setPolozky] = useState<PolozkaRow[]>([])
  const [zdroje, setZdroje] = useState<ZdrojRow[]>([])
  const [vklady, setVklady] = useState<VkladRow[]>([])
  const [baseChyba, setBaseChyba] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [{ data: { user } }, z, v, base] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('sporeni_zdroj').select('*').order('created_at'),
      supabase.from('sporeni_vklad').select('*').order('datum'),
      fetch('/api/obytnak').then(async r => ({ ok: r.ok, json: await r.json().catch(() => ({})) })),
    ])
    if (user) { setUserId(user.id); setMe(user.email?.toLowerCase().includes('honza') ? 'honza' : 'lucka') }
    setZdroje((z.data ?? []) as ZdrojRow[])
    setVklady((v.data ?? []) as VkladRow[])
    if (base.ok) { setMilniky(base.json.milniky ?? []); setPolozky(base.json.polozky ?? []); setBaseChyba(null) }
    else setBaseChyba(base.json.error ?? 'Rozpočet z Base se nepodařilo načíst.')
    setLoading(false)
  }, []) // eslint-disable-line

  // standardní vzor tohoto repa: načtení dat v efektu
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [loadData])

  const s = useMemo(() => spocitejVse(milniky, polozky, zdroje, vklady), [milniky, polozky, zdroje, vklady])
  const c = s.celkem
  const kampane: Kampan[] = ['auto', 'rekonstrukce']

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 md:px-8 py-10 flex flex-col gap-10">
        <div>
          <h1 className="font-hand text-center mb-2" style={{ fontSize: '3.5rem', color: INK }}>Obytňák</h1>
        </div>

        {loading ? (
          <p className="font-notes text-center" style={{ color: MUTED }}>Načítám...</p>
        ) : (
          <>
            {baseChyba && (
              <div className="rounded-xl px-4 py-3 font-notes text-sm" style={{ background: PROBIHA_SV, border: `1px solid ${PROBIHA}`, color: INK }}>
                {baseChyba} Cíle se bez Base nespočítají, financování funguje.
              </div>
            )}

            {/* Souhrn */}
            <section className="paper-card rounded-2xl px-6 py-5 flex flex-col gap-3" style={{ border: '1px solid #e0e0e0' }}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="font-notes text-sm" style={{ color: MUTED }}>Celkem máme</div>
                  <div className="font-hand" style={{ fontSize: '2.4rem', color: INK, lineHeight: 1.1 }}>{kc(c.nasetreno)} <span style={{ fontSize: '1.4rem', color: MUTED }}>z {kc(c.cil)}</span></div>
                </div>
                <div className="font-hand" style={{ fontSize: '3rem', color: INK, lineHeight: 1 }}>{c.procento} %</div>
              </div>
              <Pruh kDispozici={c.kDispozici} vazane={c.vazane} cil={c.cil} vyska={18} plan={c.planovano} />
              <table className="font-notes text-sm mt-1" style={{ color: INK, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: MUTED }}>
                    <th className="text-left font-normal pb-1" />
                    <th className="text-right font-normal pb-1 pl-4">Celkem</th>
                    <th className="text-right font-normal pb-1 pl-4">Honza</th>
                    <th className="text-right font-normal pb-1 pl-4">Lucka</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ['Naplánováno', c.planovano, c.osoby.honza.planovano, c.osoby.lucka.planovano],
                    ['K dispozici', c.kDispozici, c.osoby.honza.kDispozici, c.osoby.lucka.kDispozici],
                    ['Na cestě', c.vazane, c.osoby.honza.vazane, c.osoby.lucka.vazane],
                    ['Celkem vyděláno', c.nasetreno, c.osoby.honza.nasetreno, c.osoby.lucka.nasetreno],
                  ] as [string, number, number, number][]).map(([label, a, h, l], i) => (
                    <tr key={label} style={{ borderTop: i === 3 ? `1px dashed #e0dbd4` : undefined, fontWeight: i === 3 ? 700 : 400 }}>
                      <td className="py-0.5" style={{ color: MUTED }}>{label}</td>
                      <td className="text-right py-0.5 pl-4" style={{ whiteSpace: 'nowrap' }}>{kc(a)}</td>
                      <td className="text-right py-0.5 pl-4" style={{ whiteSpace: 'nowrap' }}>{kc(h)}</td>
                      <td className="text-right py-0.5 pl-4" style={{ whiteSpace: 'nowrap' }}>{kc(l)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="font-notes text-xs" style={{ color: MUTED }}>
                {c.cil > c.planovano
                  ? <>Musíme ještě naplánovat, jak našetříme <b style={{ color: INK }}>{kc(c.cil - c.planovano)}</b>.</>
                  : 'Plán pokrývá celý cíl.'} Společné zdroje a vklady se dělí podle vkladů.
              </div>
            </section>

            {kampane.map(key => (
              <KampanKarta key={key} k={s[key]} me={me} userId={userId} onReload={loadData} />
            ))}

            <p className="font-notes text-xs text-center" style={{ color: MUTED }}>
              Cíle milníků se počítají z položek rozpočtu v Base (střední odhad). Zelená = k dispozici, šrafovaná = na cestě (vyděláno, ale zatím nedostupné), světle šedá = naplánováno, prázdné = nenaplánováno.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
