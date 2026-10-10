// Výpočty menstruačního cyklu. Čisté funkce, bez Reactu, bez Supabase.
// Vstup: zapsané cykly (jeden řádek = jedna menstruace). Výstup: model s fázemi,
// predikcemi a plodným oknem. Nic z toho se neukládá, počítá se při čtení.
// Specifikace: docs/cyklus-plan.md

export type Faze = 'menstruace' | 'folikularni' | 'ovulace' | 'lutealni'
export type Pravdepodobnost = 'nizsi' | 'vyssi'
export type StavTlacitka = 'zacala' | 'skoncila'

export interface Cyklus {
  date_start: string           // YYYY-MM-DD
  date_end: string | null      // null = ještě neskončila
}

export interface Den {
  date: string
  faze: Faze
  pravdepodobnost: Pravdepodobnost
  k: number                    // 0 = aktuální cyklus, 1 = další predikovaný, ...
  nejistota: number            // ± dní u predikce začátku tohoto cyklu (0 u zapsaného)
  denCyklu: number             // 1 = první den menstruace
}

export interface Model {
  cykly: Cyklus[]
  dnes: string
  prumernaDelka: number
  rozptyl: number
  delkaMenstruace: number
  aktualni: Cyklus | null
  denCyklu: number | null
  faze: Faze | null
  pravdepodobnost: Pravdepodobnost | null
  ovulace: string | null       // ovulace aktuálního cyklu
  plodneOkno: [string, string] | null
  dalsiZacatek: string | null  // predikce k=1
  dalsiNejistota: number
  dniDoMenstruace: number | null
  stavTlacitka: StavTlacitka
  pripominka: boolean          // predikce prošla a nic není zapsané
  proDen: (date: string) => Den | null
  horizont: (dny?: number) => Den[]
}

export const LUTEALNI = 14
export const VYCHOZI_DELKA = 28
export const VYCHOZI_ROZPTYL = 2
export const VYCHOZI_MENSTRUACE = 5
const MAX_HISTORIE = 6

// ── datumy (lokální, bez UTC posunu) ──────────────────────
export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function ds(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function addDays(s: string, n: number): string {
  const d = parse(s); d.setDate(d.getDate() + n); return ds(d)
}
export function diffDays(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)
}

// ── statistika ────────────────────────────────────────────
function mean(xs: number[]) { return xs.reduce((a, b) => a + b, 0) / xs.length }
function stddev(xs: number[]) {
  const m = mean(xs)
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)))
}

export function delkyCyklu(cykly: Cyklus[]): number[] {
  const out: number[] = []
  for (let i = 1; i < cykly.length; i++) out.push(diffDays(cykly[i - 1].date_start, cykly[i].date_start))
  return out
}

// ── hlavní model ──────────────────────────────────────────
export function spocitej(vstup: Cyklus[], dnes: string = ds(new Date())): Model {
  const cykly = [...vstup].sort((a, b) => a.date_start.localeCompare(b.date_start))

  const delky = delkyCyklu(cykly).slice(-MAX_HISTORIE)
  const prumernaDelka = delky.length ? Math.round(mean(delky)) : VYCHOZI_DELKA
  const rozptyl = delky.length >= 2 ? Math.round(stddev(delky) * 10) / 10 : VYCHOZI_ROZPTYL

  const trvani = cykly.filter(c => c.date_end).map(c => diffDays(c.date_start, c.date_end!) + 1).slice(-MAX_HISTORIE)
  const delkaMenstruace = trvani.length ? Math.round(mean(trvani)) : VYCHOZI_MENSTRUACE

  const aktualni = [...cykly].reverse().find(c => c.date_start <= dnes) ?? null
  const posledni = cykly[cykly.length - 1] ?? null

  const stavTlacitka: StavTlacitka = posledni && !posledni.date_end ? 'skoncila' : 'zacala'

  // predikce k-tého dalšího začátku od posledního zapsaného
  const nejistota = (k: number) => k <= 0 ? 0 : Math.round(Math.max(VYCHOZI_ROZPTYL, rozptyl) * Math.sqrt(k))
  const startK = (k: number): string | null => posledni ? addDays(posledni.date_start, k * prumernaDelka) : null

  // Po termínu: predikce prošla a nic není zapsané. Do dneška včetně platí poslední
  // zapsaný cyklus (ať je jakkoli dlouhý, nic nepředstíráme), predikce do budoucna
  // se přikotví na zítřek ("může začít každým dnem"), ať je horizont spojitý.
  const s1raw = startK(1)
  const poTerminu = !!(s1raw && dnes >= s1raw)
  const kotva = posledni ? (poTerminu ? addDays(dnes, 1) : posledni.date_start) : null
  const startKotva = (k: number): string | null => kotva ? addDays(kotva, (poTerminu ? k - 1 : k) * prumernaDelka) : null

  // začátek cyklu, do kterého datum spadá, a jeho index k (0 = poslední zapsaný)
  // záporné k = starší zapsané cykly
  function cyklusProDatum(date: string): { start: string; dalsiStart: string; k: number } | null {
    if (!posledni) return null
    if (date >= posledni.date_start) {
      if (date <= dnes || !poTerminu) {
        // ovulace a okno aktuálního cyklu vždy z původní predikce (nesmí ujíždět s dneškem)
        const k = date <= dnes ? 0 : Math.floor(diffDays(posledni.date_start, date) / prumernaDelka)
        return { start: startK(k)!, dalsiStart: startK(k + 1)!, k }
      }
      // budoucnost po termínu: cykly od kotvy (zítřek)
      const k = Math.floor(diffDays(kotva!, date) / prumernaDelka) + 1
      return { start: startKotva(k)!, dalsiStart: startKotva(k + 1)!, k }
    }
    const idx = cykly.findIndex((c, i) => c.date_start <= date && (i === cykly.length - 1 || cykly[i + 1].date_start > date))
    if (idx < 0) return null
    return { start: cykly[idx].date_start, dalsiStart: cykly[idx + 1]?.date_start ?? startK(1)!, k: idx - (cykly.length - 1) }
  }

  function proDen(date: string): Den | null {
    const c = cyklusProDatum(date)
    if (!c) return null
    const denCyklu = diffDays(c.start, date) + 1
    const ovul = addDays(c.dalsiStart, -LUTEALNI)
    const nej = nejistota(c.k + 1)
    const oknoOd = addDays(ovul, -5 - nej), oknoDo = addDays(ovul, 1 + nej)
    const dOvul = diffDays(ovul, date)

    let faze: Faze
    if (denCyklu <= delkaMenstruace) faze = 'menstruace'
    else if (Math.abs(dOvul) <= 1) faze = 'ovulace'
    else if (dOvul < -1) faze = 'folikularni'
    else faze = 'lutealni'

    const pravdepodobnost: Pravdepodobnost = date >= oknoOd && date <= oknoDo ? 'vyssi' : 'nizsi'
    return { date, faze, pravdepodobnost, k: Math.max(0, c.k), nejistota: nejistota(c.k), denCyklu }
  }

  const dnesDen = aktualni ? proDen(dnes) : null
  const cDnes = cyklusProDatum(dnes)
  const ovulace = cDnes ? addDays(cDnes.dalsiStart, -LUTEALNI) : null
  const nejDnes = cDnes ? nejistota(cDnes.k + 1) : 0
  const plodneOkno: [string, string] | null = ovulace ? [addDays(ovulace, -5 - nejDnes), addDays(ovulace, 1 + nejDnes)] : null
  // po termínu je očekávaný další začátek "každým dnem" = zítřek; jinak původní predikce
  const dalsiZacatek = cDnes ? (poTerminu ? kotva : cDnes.dalsiStart) : null
  const dalsiNejistota = cDnes ? nejistota(cDnes.k + 1) : 0
  const dniDoMenstruace = dalsiZacatek ? diffDays(dnes, dalsiZacatek) : null

  // připomínka: predikovaný začátek (k=1 od posledního zapsaného) je víc než den za námi a nic nového není
  const s1 = startK(1)
  const pripominka = !!(s1 && posledni && dnes > addDays(s1, 1) && posledni.date_start < addDays(s1, -nejistota(1)))

  function horizont(dny = 90): Den[] {
    const out: Den[] = []
    for (let i = 0; i < dny; i++) { const d = proDen(addDays(dnes, i)); if (d) out.push(d) }
    return out
  }

  return {
    cykly, dnes, prumernaDelka, rozptyl, delkaMenstruace, aktualni,
    denCyklu: dnesDen?.denCyklu ?? null, faze: dnesDen?.faze ?? null,
    pravdepodobnost: dnesDen?.pravdepodobnost ?? null,
    ovulace, plodneOkno, dalsiZacatek, dalsiNejistota, dniDoMenstruace,
    stavTlacitka, pripominka, proDen, horizont,
  }
}

// ── roční období (vizuální metafora, ne fyziologie) ───────
export const OBDOBI: Record<Faze, { label: string; obdobi: string; emoji: string; barva: string }> = {
  menstruace:  { label: 'Menstruace',  obdobi: 'Zima',   emoji: '❄️', barva: '#e87c7c' },
  folikularni: { label: 'Folikulární', obdobi: 'Jaro',   emoji: '🌱', barva: '#7bc57e' },
  ovulace:     { label: 'Ovulace',     obdobi: 'Léto',   emoji: '☀️', barva: '#f5c642' },
  lutealni:    { label: 'Luteální',    obdobi: 'Podzim', emoji: '🍂', barva: '#e8a87c' },
}
