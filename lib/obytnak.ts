// Šetření na obytňák: čisté výpočty nad rozpočtem (Base) a financováním (Supabase).
// Nic tu nesahá na síť ani na React.

export type Kampan = 'auto' | 'rekonstrukce'
export type Person = 'honza' | 'lucka'
export type Vlastnik = Person | 'spolecny'
export type Dostupnost = 'k_dispozici' | 'vazane'
export type Sdileni = 'osobni' | 'spolecny'

// ── Base (rozpočet) ───────────────────────────────────────
export interface MilnikRow {
  id: string; nazev: string; kampan: Kampan; poradi: number; emoji: string; popis: string; cilova_castka: number | null
}
export interface PolozkaRow {
  id: string; nazev: string; milnik_id: string | null; kategorie: string | null; stav: string | null
  mnozstvi: number | null; cena_odhad: number; cena_low: number | null; cena_high: number | null; cena_realna: number | null
  dodavatel: string | null; odkaz: string | null; koupeno_dne: string | null; poznamka: string | null
}

type BaseRecord = { id: string; fields: Record<string, unknown> }

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'object') { const o = v as { id?: string; name?: string }; return o.id ?? o.name ?? null }
  return String(v)
}
function relId(v: unknown): string | null {
  if (!v) return null
  if (Array.isArray(v)) return relId(v[0])
  if (typeof v === 'object') return (v as { id?: string }).id ?? null
  return String(v)
}

export function mapMilnik(r: BaseRecord): MilnikRow {
  const f = r.fields
  return {
    id: r.id,
    nazev: str(f.nazev) ?? '',
    kampan: (str(f.kampan) ?? '').toLowerCase() === 'auto' ? 'auto' : 'rekonstrukce',
    poradi: num(f.poradi) ?? 99,
    emoji: str(f.emoji) ?? '🏁',
    popis: str(f.popis) ?? '',
    cilova_castka: num(f.cilova_castka),
  }
}

export function mapPolozka(r: BaseRecord): PolozkaRow {
  const f = r.fields
  return {
    id: r.id,
    nazev: str(f.nazev) ?? '',
    milnik_id: relId(f.milnik),
    kategorie: str(f.kategorie),
    stav: str(f.stav),
    mnozstvi: num(f.mnozstvi),
    cena_odhad: num(f.cena_odhad) ?? 0,
    cena_low: num(f.cena_low),
    cena_high: num(f.cena_high),
    cena_realna: num(f.cena_realna),
    dodavatel: str(f.dodavatel),
    odkaz: str(f.odkaz),
    koupeno_dne: str(f.koupeno_dne),
    poznamka: str(f.poznamka),
  }
}

// ── Supabase (financování) ────────────────────────────────
export interface ZdrojRow {
  id: string; kampan: Kampan; nazev: string; cilova_castka: number; person: Vlastnik; sdileni: Sdileni
  note: string | null; created_by: string | null
}
export interface VkladRow {
  id: string; zdroj_id: string; person: Vlastnik; castka: number; dostupnost: Dostupnost; datum: string
  note: string | null; created_by: string | null
}

// ── Výpočet ───────────────────────────────────────────────
export interface Milestone {
  id: string; nazev: string; emoji: string; popis: string; poradi: number
  castka: number        // cílová částka milníku (ruční přepis, jinak součet položek)
  kumulativne: number   // kolik musí být našetřeno, aby byl milník dosažen
  polozky: PolozkaRow[]
  utraceno: number      // součet cena_realna u koupených / hotových položek
  dosazen: boolean
}
export interface Osoba { planovano: number; kDispozici: number; vazane: number; nasetreno: number }
export type Osoby = Record<Person, Osoba>
const prazdneOsoby = (): Osoby => ({ honza: { planovano: 0, kDispozici: 0, vazane: 0, nasetreno: 0 }, lucka: { planovano: 0, kDispozici: 0, vazane: 0, nasetreno: 0 } })
function sectiOsoby(a: Osoby, b: Osoby): Osoby {
  const o = prazdneOsoby()
  for (const p of ['honza', 'lucka'] as Person[]) for (const k of ['planovano', 'kDispozici', 'vazane', 'nasetreno'] as (keyof Osoba)[]) o[p][k] = a[p][k] + b[p][k]
  return o
}

export interface ZdrojStav {
  zdroj: ZdrojRow; vklady: VkladRow[]
  nasetreno: number; kDispozici: number; vazane: number; chybi: number
  honza: number; lucka: number
  osoby: Osoby
}
export interface KampanStav {
  key: Kampan; nazev: string; emoji: string
  cil: number; nasetreno: number; kDispozici: number; vazane: number; chybi: number; procento: number
  planovano: number      // součet cílových částek zdrojů (kolik máme naplánováno, bez ohledu na stav)
  honza: number; lucka: number
  osoby: Osoby
  milniky: Milestone[]; dosazeno: number; aktualni: Milestone | null
  zdroje: ZdrojStav[]
  utraceno: number
}

export const KAMPANE: Record<Kampan, { nazev: string; emoji: string; barva: string; popis: string }> = {
  auto:         { nazev: 'Auto',         emoji: '🚐', barva: '#7bc57e', popis: 'Koupě samotné dodávky.' },
  rekonstrukce: { nazev: 'Rekonstrukce', emoji: '🔧', barva: '#e8a87c', popis: 'Přestavba na obytňák, milník po milníku.' },
}

const JE_KOUPENO = (s: string | null) => s === 'Koupeno' || s === 'Hotovo'
// do cíle milníku se počítá jen to, s čím se opravdu počítá; "Napad" je varianta / volitelné
const POCITA_SE = (s: string | null) => s !== 'Napad'

export function spocitejZdroj(zdroj: ZdrojRow, vklady: VkladRow[]): ZdrojStav {
  const v = vklady.filter(x => x.zdroj_id === zdroj.id)
  const sum = (f: (x: VkladRow) => boolean) => v.filter(f).reduce((a, x) => a + Number(x.castka), 0)
  const nasetreno = sum(() => true)
  // podíl osoby: vlastní vklady + polovina společných vkladů.
  // Plán zdroje jde vlastníkovi; u společného zdroje se dělí podle skutečných podílů na vkladech,
  // a napůl jen dokud v něm nic není (rozhodnuto 10. 10. 2026, ať to pro Lucku není matoucí).
  const osoby = prazdneOsoby()
  for (const p of ['honza', 'lucka'] as Person[]) {
    const moje = (x: VkladRow) => x.person === p
    const spol = (x: VkladRow) => x.person === 'spolecny'
    osoby[p].kDispozici = sum(x => moje(x) && x.dostupnost === 'k_dispozici') + sum(x => spol(x) && x.dostupnost === 'k_dispozici') / 2
    osoby[p].vazane = sum(x => moje(x) && x.dostupnost === 'vazane') + sum(x => spol(x) && x.dostupnost === 'vazane') / 2
    osoby[p].nasetreno = osoby[p].kDispozici + osoby[p].vazane
  }
  const plan = Number(zdroj.cilova_castka)
  if (zdroj.person === 'spolecny') {
    const podilH = nasetreno > 0 ? osoby.honza.nasetreno / nasetreno : 0.5
    osoby.honza.planovano = plan * podilH
    osoby.lucka.planovano = plan * (1 - podilH)
  } else {
    osoby[zdroj.person].planovano = plan
  }
  return {
    zdroj, vklady: v, nasetreno, osoby,
    kDispozici: sum(x => x.dostupnost === 'k_dispozici'),
    vazane: sum(x => x.dostupnost === 'vazane'),
    chybi: Math.max(0, Number(zdroj.cilova_castka) - nasetreno),
    // společný vklad se počítá každému napůl
    honza: sum(x => x.person === 'honza') + sum(x => x.person === 'spolecny') / 2,
    lucka: sum(x => x.person === 'lucka') + sum(x => x.person === 'spolecny') / 2,
  }
}

export function spocitejKampan(key: Kampan, milniky: MilnikRow[], polozky: PolozkaRow[], zdroje: ZdrojRow[], vklady: VkladRow[]): KampanStav {
  const zs = zdroje.filter(z => z.kampan === key).map(z => spocitejZdroj(z, vklady)).sort((a, b) => b.nasetreno - a.nasetreno)
  const nasetreno = zs.reduce((a, z) => a + z.nasetreno, 0)

  let kum = 0
  const ms: Milestone[] = milniky
    .filter(m => m.kampan === key)
    .sort((a, b) => a.poradi - b.poradi)
    .map(m => {
      const pol = polozky.filter(p => p.milnik_id === m.id)
      const castka = m.cilova_castka ?? pol.filter(p => POCITA_SE(p.stav)).reduce((a, p) => a + p.cena_odhad, 0)
      kum += castka
      return {
        id: m.id, nazev: m.nazev, emoji: m.emoji, popis: m.popis, poradi: m.poradi,
        castka, kumulativne: kum, polozky: pol,
        utraceno: pol.filter(p => JE_KOUPENO(p.stav)).reduce((a, p) => a + (p.cena_realna ?? p.cena_odhad), 0),
        dosazen: kum <= nasetreno && castka > 0,
      }
    })
  const cil = kum
  const dosazeno = ms.filter(m => m.dosazen).length
  return {
    key, nazev: KAMPANE[key].nazev, emoji: KAMPANE[key].emoji,
    cil, nasetreno,
    kDispozici: zs.reduce((a, z) => a + z.kDispozici, 0),
    vazane: zs.reduce((a, z) => a + z.vazane, 0),
    chybi: Math.max(0, cil - nasetreno),
    procento: cil > 0 ? Math.min(100, Math.round(nasetreno / cil * 100)) : 0,
    planovano: zs.reduce((a, z) => a + Number(z.zdroj.cilova_castka), 0),
    osoby: zs.reduce((a, z) => sectiOsoby(a, z.osoby), prazdneOsoby()),
    honza: zs.reduce((a, z) => a + z.honza, 0),
    lucka: zs.reduce((a, z) => a + z.lucka, 0),
    milniky: ms, dosazeno, aktualni: ms.find(m => !m.dosazen) ?? null,
    zdroje: zs,
    utraceno: ms.reduce((a, m) => a + m.utraceno, 0),
  }
}

export interface Celkem { cil: number; nasetreno: number; kDispozici: number; vazane: number; chybi: number; procento: number; planovano: number; honza: number; lucka: number; osoby: Osoby }

export function spocitejVse(milniky: MilnikRow[], polozky: PolozkaRow[], zdroje: ZdrojRow[], vklady: VkladRow[]) {
  const auto = spocitejKampan('auto', milniky, polozky, zdroje, vklady)
  const rekonstrukce = spocitejKampan('rekonstrukce', milniky, polozky, zdroje, vklady)
  const cil = auto.cil + rekonstrukce.cil, nasetreno = auto.nasetreno + rekonstrukce.nasetreno
  const celkem: Celkem = {
    cil, nasetreno,
    kDispozici: auto.kDispozici + rekonstrukce.kDispozici,
    vazane: auto.vazane + rekonstrukce.vazane,
    chybi: Math.max(0, cil - nasetreno),
    procento: cil > 0 ? Math.min(100, Math.round(nasetreno / cil * 100)) : 0,
    planovano: auto.planovano + rekonstrukce.planovano,
    osoby: sectiOsoby(auto.osoby, rekonstrukce.osoby),
    honza: auto.honza + rekonstrukce.honza,
    lucka: auto.lucka + rekonstrukce.lucka,
  }
  return { auto, rekonstrukce, celkem }
}

// ── Formátování ───────────────────────────────────────────
// tisíce vždy oddělené mezerou (nezávisle na locale prohlížeče): 500 000 Kč
export function tisice(n: number): string {
  const z = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return (n < 0 ? '-' : '') + z
}
export function kc(n: number): string {
  return tisice(n) + ' Kč'
}
export function kcKratce(n: number): string {
  const a = Math.abs(n)
  if (a >= 1_000_000) return (n / 1_000_000).toLocaleString('cs-CZ', { maximumFractionDigits: 2 }) + ' mil.'
  if (a >= 1000) return tisice(n / 1000) + ' tis.'
  return tisice(n)
}
export const OSOBA: Record<Vlastnik, { label: string; emoji: string }> = {
  honza: { label: 'Honza', emoji: '🧔' },
  lucka: { label: 'Lucka', emoji: '👩' },
  spolecny: { label: 'Společný', emoji: '🤝' },
}
