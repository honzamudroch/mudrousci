'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Header({ countLabel }: { countLabel?: string } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const linkClass = (path: string) => {
    const active = pathname === path
    return active
      ? 'font-hand text-2xl transition-colors ink-underline'
      : 'font-hand text-2xl transition-colors hover:opacity-60'
  }

  return (
    <header style={{borderBottom: '1px solid #000000', background: '#ffffff', overflow: 'visible', position: 'relative'}}>
      <div className="relative mx-auto max-w-7xl px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-6" style={{overflow: 'visible'}}>

        {/* Vlevo — logo + název */}
        <div className="flex items-center gap-4 shrink-0 cursor-pointer" onClick={() => router.push('/home')}>
          <div>
            <span className="font-hand leading-none block" style={{fontSize: '2.4rem', color: 'hsl(25 30% 15%)'}}>
              Naše cesta ...
            </span>
            <span className="font-notes block mt-0.5" style={{fontSize: '0.9rem', color: 'hsl(25 15% 40%)'}}>
              {countLabel ?? 'Honza & Lucka'}
            </span>
          </div>
        </div>

        {/* Střed — navigace (absolutně centrovaná) */}
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
            Časová osa
          </button>
          <button onClick={handleLogout}
            className="font-notes text-sm underline decoration-dotted"
            style={{color: 'hsl(25 15% 40%)'}}>
            odhlásit
          </button>
        </nav>

        {/* Vpravo — ilustrace, přetéká dolů pod header */}
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
      </div>

      {/* Mobilní navigace */}
      <nav className="md:hidden flex items-center gap-4 px-4 pb-3 overflow-x-auto">
        <button onClick={() => router.push('/home')} className="font-hand text-xl" style={{color: 'hsl(25 30% 15%)'}}>Domů</button>
        <button onClick={() => router.push('/map')} className="font-hand text-xl" style={{color: 'hsl(25 30% 15%)'}}>Mapa</button>
        <button onClick={() => router.push('/timeline')} className="font-hand text-xl" style={{color: 'hsl(25 30% 15%)'}}>Časová osa</button>
        <button onClick={handleLogout} className="font-notes text-sm ml-auto underline" style={{color: 'hsl(25 15% 40%)'}}>odhlásit</button>
      </nav>
    </header>
  )
}
