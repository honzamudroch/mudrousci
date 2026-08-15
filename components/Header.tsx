'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Header({ countLabel }: { countLabel?: string } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    window.location.href = '/api/logout'
  }

  const linkClass = (path: string) => {
    const active = pathname === path || (path === '/cile' && pathname.startsWith('/cile/')) || (path === '/plan' && pathname.startsWith('/plan'))
    return active
      ? 'font-hand text-2xl transition-colors ink-underline'
      : 'font-hand text-2xl transition-colors hover:opacity-60'
  }

  return (
    <header style={{borderBottom: '1px solid #000000', background: '#ffffff', overflow: 'visible', position: 'relative'}}>
      <div className="relative mx-auto max-w-7xl px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-6" style={{overflow: 'visible'}}>

        {/* Desktop logo — text */}
        <div className="hidden md:flex items-center gap-4 shrink-0 cursor-pointer" onClick={() => router.push('/home')}>
          <div>
            <span className="font-hand leading-none block" style={{fontSize: '2.4rem', color: 'hsl(25 30% 15%)'}}>
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
        <nav className="hidden md:flex items-center gap-6 whitespace-nowrap absolute left-[42%] top-1/2 -translate-x-1/2 -translate-y-1/2" style={{zIndex: 2}}>
          <button onClick={() => router.push('/home')} className={linkClass('/home')}
            style={{color: 'hsl(25 30% 15%)'}}>
            Domů
          </button>
          <button onClick={() => router.push('/map')} className={linkClass('/map')}
            style={{color: 'hsl(25 30% 15%)'}}>
            Mapa
          </button>
          <button onClick={() => router.push('/timeline')} className={linkClass('/timeline')}
            style={{color: 'hsl(25 30% 15%)'}}>
            Osa
          </button>
          <button onClick={() => router.push('/foto')} className={linkClass('/foto')}
            style={{color: 'hsl(25 30% 15%)'}}>
            Foto
          </button>
          <button onClick={() => router.push('/cile')} className={linkClass('/cile')}
            style={{color: 'hsl(25 30% 15%)'}}>
            Cíle
          </button>
          <button onClick={() => router.push('/navyky')} className={linkClass('/navyky')}
            style={{color: 'hsl(25 30% 15%)'}}>
            Návyky
          </button>
          <button onClick={() => router.push('/ukoly')} className={linkClass('/ukoly')}
            style={{color: 'hsl(25 30% 15%)'}}>
            Úkoly
          </button>
          <button onClick={() => router.push('/plan')} className={linkClass('/plan')}
            style={{color: 'hsl(25 30% 15%)'}}>
            Plán
          </button>
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
          <span className="block w-5 h-0.5 rounded" style={{background: menuOpen ? 'transparent' : 'hsl(25 30% 15%)', transition: 'all 0.2s'}} />
          <span className="block w-5 h-0.5 rounded" style={{background: 'hsl(25 30% 15)'}} />
          <span className="block w-5 h-0.5 rounded" style={{background: menuOpen ? 'transparent' : 'hsl(25 30% 15%)', transition: 'all 0.2s'}} />
        </button>
      </div>

      {/* Mobilní rozbalovací menu */}
      {menuOpen && (
        <nav className="md:hidden flex flex-col px-6 pb-6 pt-2 gap-4"
          style={{borderTop: '1px solid #e0e0e0', background: '#ffffff'}}>
          <button onClick={() => { router.push('/home'); setMenuOpen(false) }}
            className={linkClass('/home')} style={{color: 'hsl(25 30% 15%)', textAlign: 'left'}}>
            Domů
          </button>
          <button onClick={() => { router.push('/map'); setMenuOpen(false) }}
            className={linkClass('/map')} style={{color: 'hsl(25 30% 15%)', textAlign: 'left'}}>
            Mapa
          </button>
          <button onClick={() => { router.push('/timeline'); setMenuOpen(false) }}
            className={linkClass('/timeline')} style={{color: 'hsl(25 30% 15%)', textAlign: 'left'}}>
            Osa
          </button>
          <button onClick={() => { router.push('/foto'); setMenuOpen(false) }}
            className={linkClass('/foto')} style={{color: 'hsl(25 30% 15%)', textAlign: 'left'}}>
            Foto
          </button>
          <button onClick={() => { router.push('/cile'); setMenuOpen(false) }}
            className={linkClass('/cile')} style={{color: 'hsl(25 30% 15%)', textAlign: 'left'}}>
            Cíle
          </button>
          <button onClick={() => { router.push('/navyky'); setMenuOpen(false) }}
            className={linkClass('/navyky')} style={{color: 'hsl(25 30% 15%)', textAlign: 'left'}}>
            Návyky
          </button>
          <button onClick={() => { router.push('/ukoly'); setMenuOpen(false) }}
            className={linkClass('/ukoly')} style={{color: 'hsl(25 30% 15%)', textAlign: 'left'}}>
            Úkoly
          </button>
          <button onClick={() => { router.push('/plan'); setMenuOpen(false) }}
            className={linkClass('/plan')} style={{color: 'hsl(25 30% 15%)', textAlign: 'left'}}>
            Plán
          </button>
          <button onClick={handleLogout}
            className="font-notes text-sm underline decoration-dotted text-left"
            style={{color: 'hsl(25 15% 40%)'}}>
            odhlásit
          </button>
        </nav>
      )}
    </header>
  )
}
