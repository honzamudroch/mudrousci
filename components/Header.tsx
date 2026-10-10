'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type Polozka = { label: string; path: string }
type Skupina = { key: string; label: string; polozky: Polozka[] }

const SPOLECNE: Polozka[] = [
  { label: 'Domů', path: '/home' },
  { label: 'Mapa', path: '/map' },
  { label: 'Osa',  path: '/timeline' },
  { label: 'Foto', path: '/foto' },
  { label: 'Cíle', path: '/cile' },
]

const SKUPINY: Skupina[] = [
  { key: 'honza', label: 'Honza', polozky: [
    { label: 'Návyky', path: '/navyky' },
    { label: 'Úkoly',  path: '/ukoly' },
    { label: 'Plán',   path: '/plan' },
  ]},
  { key: 'lucka', label: 'Lucka', polozky: [
    { label: 'Můj měsíc', path: '/cyklus' },
  ]},
]

const INK = 'hsl(25 30% 15%)'

export default function Header({ countLabel }: { countLabel?: string } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [otevrena, setOtevrena] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  const handleLogout = () => {
    window.location.href = '/api/logout'
  }

  const jeAktivni = (path: string) => pathname === path || pathname.startsWith(path + '/')
  const skupinaAktivni = (s: Skupina) => s.polozky.some(p => jeAktivni(p.path))

  const linkClass = (active: boolean) => active
    ? 'font-hand text-2xl transition-colors ink-underline'
    : 'font-hand text-2xl transition-colors hover:opacity-60'

  const jdi = (path: string) => {
    router.push(path)
    setOtevrena(null)
    setMenuOpen(false)
  }

  // Zavřít rozbalenou skupinu kliknutím mimo navigaci
  useEffect(() => {
    if (!otevrena) return
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOtevrena(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [otevrena])

  return (
    <header style={{borderBottom: '1px solid #000000', background: '#ffffff', overflow: 'visible', position: 'relative'}}>
      <div className="relative mx-auto max-w-7xl px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-6" style={{overflow: 'visible'}}>

        {/* Desktop logo — text */}
        <div className="hidden md:flex items-center gap-4 shrink-0 cursor-pointer" onClick={() => router.push('/home')}>
          <div>
            <span className="font-hand leading-none block" style={{fontSize: '2.4rem', color: INK}}>
              Naše cesta ...
            </span>
            <span className="font-notes block mt-0.5" style={{fontSize: '0.9rem', color: 'hsl(25 15% 40%)'}}>
              {countLabel ?? 'Honza & Lucka'}
            </span>
          </div>
        </div>

        {/* Mobilní logo — obrázek centrovaný */}
        <div className="md:hidden absolute left-1/2 -translate-x-1/2 cursor-pointer" onClick={() => router.push('/home')}>
          <img src="/header-illustration.png" alt="Naše cesta"
            className="object-contain"
            style={{height: '82px', width: 'auto'}} />
        </div>

        {/* Desktop navigace */}
        <nav ref={navRef} className="hidden md:flex items-center gap-6 whitespace-nowrap absolute left-[42%] top-1/2 -translate-x-1/2 -translate-y-1/2" style={{zIndex: 2}}>
          {SPOLECNE.map(p => (
            <button key={p.path} onClick={() => jdi(p.path)} className={linkClass(jeAktivni(p.path))} style={{color: INK}}>
              {p.label}
            </button>
          ))}

          {SKUPINY.map(s => {
            const open = otevrena === s.key
            return (
              <div key={s.key} className="relative">
                <button onClick={() => setOtevrena(open ? null : s.key)}
                  className={linkClass(skupinaAktivni(s))}
                  style={{color: INK, display: 'inline-flex', alignItems: 'center', gap: 4}}>
                  {s.label}
                  <span className="font-notes" style={{fontSize: '0.7rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', opacity: 0.6}}>▼</span>
                </button>
                {open && (
                  <div className="absolute left-1/2 mt-2 paper-card rounded-xl shadow-lg flex flex-col py-2"
                    style={{background: '#fff', border: '1px solid #e0dbd4', minWidth: 150, transform: 'translateX(-50%) rotate(-0.6deg)'}}>
                    {s.polozky.map(p => (
                      <button key={p.path} onClick={() => jdi(p.path)}
                        className="font-hand text-left px-5 py-1 transition-colors hover:opacity-60"
                        style={{color: INK, fontSize: '1.4rem', background: jeAktivni(p.path) ? '#f5f0ea' : 'transparent'}}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <button onClick={handleLogout}
            className="font-notes text-sm underline decoration-dotted"
            style={{color: 'hsl(25 15% 40%)'}}>
            odhlásit
          </button>
        </nav>

        {/* Desktop ilustrace vpravo */}
        <img src="/header-illustration.png" alt=""
          className="hidden md:block object-contain object-bottom"
          style={{
            height: '160px',
            width: '553px',
            position: 'absolute',
            right: '-32px',
            bottom: '-28px',
            zIndex: 1,
            pointerEvents: 'none',
          }} />

        {/* Hamburger tlačítko — pouze mobil */}
        <button
          className="md:hidden flex flex-col justify-center items-center gap-1.5 w-10 h-10 rounded-lg"
          style={{background: '#f5f0ea'}}
          onClick={() => setMenuOpen(o => !o)}>
          <span className="block w-5 h-0.5 rounded" style={{background: menuOpen ? 'transparent' : INK, transition: 'all 0.2s'}} />
          <span className="block w-5 h-0.5 rounded" style={{background: INK}} />
          <span className="block w-5 h-0.5 rounded" style={{background: menuOpen ? 'transparent' : INK, transition: 'all 0.2s'}} />
        </button>
      </div>

      {/* Mobilní rozbalovací menu */}
      {menuOpen && (
        <nav className="md:hidden flex flex-col px-6 pb-6 pt-2 gap-4"
          style={{borderTop: '1px solid #e0e0e0', background: '#ffffff'}}>
          {SPOLECNE.map(p => (
            <button key={p.path} onClick={() => jdi(p.path)}
              className={linkClass(jeAktivni(p.path))} style={{color: INK, textAlign: 'left'}}>
              {p.label}
            </button>
          ))}

          {SKUPINY.map(s => (
            <div key={s.key} className="flex flex-col gap-3 pt-3" style={{borderTop: '1px dashed #e0dbd4'}}>
              <span className="font-notes text-xs uppercase tracking-widest" style={{color: 'hsl(25 15% 55%)'}}>
                {s.label}
              </span>
              {s.polozky.map(p => (
                <button key={p.path} onClick={() => jdi(p.path)}
                  className={linkClass(jeAktivni(p.path))} style={{color: INK, textAlign: 'left', paddingLeft: 12}}>
                  {p.label}
                </button>
              ))}
            </div>
          ))}

          <button onClick={handleLogout}
            className="font-notes text-sm underline decoration-dotted text-left pt-3"
            style={{color: 'hsl(25 15% 40%)', borderTop: '1px dashed #e0dbd4'}}>
            odhlásit
          </button>
        </nav>
      )}
    </header>
  )
}
